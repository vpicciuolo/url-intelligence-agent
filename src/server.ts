import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { actionNames, runAction } from "./agent.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";

const buckets = new Map<string, { count: number; reset: number }>();

function json(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("x-powered-by", `${PROJECT.name}/${PROJECT.version}`);
  res.end(JSON.stringify(value, null, 2));
}

function clientIp(req: IncomingMessage): string { return String(req.socket.remoteAddress || "unknown"); }
function allowed(req: IncomingMessage): boolean {
  const limit = Math.max(1, Number(process.env.URL_AGENT_API_RATE_LIMIT || 60));
  const windowMs = 60000;
  const ip = clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.reset < now) { buckets.set(ip, { count: 1, reset: now + windowMs }); return true; }
  bucket.count += 1;
  return bucket.count <= limit;
}

async function body(req: IncomingMessage, maxBytes = 1_000_000): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += b.length; if (size > maxBytes) throw new Error("Request body too large"); chunks.push(b); }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function authorized(req: IncomingMessage): boolean {
  const required = process.env.URL_AGENT_API_TOKEN;
  if (!required) return true;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${required}`;
}

export async function startApiServer(port = Number(process.env.PORT || 8787), host = process.env.HOST || "127.0.0.1"): Promise<void> {
  const server = createServer(async (req, res) => {
    if (process.env.URL_AGENT_CORS_ORIGIN) { res.setHeader("access-control-allow-origin", process.env.URL_AGENT_CORS_ORIGIN); res.setHeader("access-control-allow-headers", "content-type,authorization"); res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS"); }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    if (!allowed(req)) { json(res, 429, { error: "Rate limit exceeded", attribution: attributionObject() }); return; }
    if (!authorized(req)) { json(res, 401, { error: "Unauthorized", attribution: attributionObject() }); return; }
    try {
      const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (u.pathname === "/health") { json(res, 200, { ok: true, uptimeSeconds: Math.round(process.uptime()), actions: actionNames().length, attribution: attributionObject() }); return; }
      if (u.pathname === "/actions") { json(res, 200, { actions: actionNames(), attribution: attributionObject() }); return; }
      const actionMatch = u.pathname.match(/^\/action\/([a-z0-9_:-]+)$/i);
      if (actionMatch) {
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const result = await runAction(actionMatch[1], args as any);
        json(res, 200, { attribution: attributionObject(), result }); return;
      }
      if (u.pathname === "/investigate") {
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const result = await runAction("investigate_url", args as any);
        json(res, 200, { attribution: attributionObject(), result }); return;
      }
      json(res, 404, { error: "Not found", available: ["/health", "/actions", "/investigate", "/action/:name"], attribution: attributionObject() });
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : String(error), attribution: attributionObject() });
    }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, host, () => resolve()); });
  console.log(`${creditsLine()}\nAPI listening on http://${host}:${port}`);
}
