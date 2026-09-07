import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname } from "node:path";
import { actionNames, runAction } from "./agent.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";

const buckets = new Map<string, { count: number; reset: number }>();
let uiHtml: string | undefined;

const SESSION_COOKIE = "url_agent_hf_session";
const STATE_COOKIE = "url_agent_hf_state";
const DEMO_WINDOW_MS = Math.max(60_000, Number(process.env.URL_AGENT_DEMO_WINDOW_MS || 86_400_000));
const PUBLIC_DEMO_ACTIONS = new Set([
  "investigate_url",
  "audit_seo",
  "audit_security",
  "audit_trust",
  "find_social_profiles",
  "detect_technologies",
  "brand_intelligence",
  "domain_intelligence",
  "structured_data"
]);

type SessionUser = { sub: string; username: string; avatar?: string };
type UsageEntry = { at: number; kind: "anonymous" | "account" };
type DemoStatus = {
  allowed: boolean;
  remaining: 0 | 1;
  resetAt?: string;
  identity: "account" | "ip";
  authenticated: boolean;
};

const demoUsage = new Map<string, UsageEntry>();
let demoRateFile = "";
let oidcConfigCache: { authorization_endpoint: string; token_endpoint: string; userinfo_endpoint: string } | undefined;

function json(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-powered-by", `${PROJECT.name}/${PROJECT.version}`);
  res.end(JSON.stringify(value, null, 2));
}

function redirect(res: ServerResponse, location: string): void {
  res.statusCode = 302;
  res.setHeader("location", location);
  res.setHeader("cache-control", "no-store");
  res.end();
}

async function serveUi(res: ServerResponse): Promise<boolean> {
  const path = process.env.URL_AGENT_UI_FILE;
  if (!path) return false;
  try {
    uiHtml ??= await readFile(path, "utf8");
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.setHeader("x-powered-by", `${PROJECT.name}/${PROJECT.version}`);
    res.end(uiHtml);
    return true;
  } catch {
    return false;
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(req: IncomingMessage): string {
  const real = header(req, "x-real-ip")?.trim();
  if (real) return real;
  const forwarded = header(req, "x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return String(req.socket.remoteAddress || "unknown");
}

function ipUsageKey(req: IncomingMessage): string {
  return `ip:${createHash("sha256").update(clientIp(req)).digest("hex")}`;
}

function allowed(req: IncomingMessage): boolean {
  const limit = Math.max(1, Number(process.env.URL_AGENT_API_RATE_LIMIT || 60));
  const windowMs = 60_000;
  const ip = clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.reset < now) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const source = header(req, "cookie") || "";
  const out: Record<string, string> = {};
  for (const part of source.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function secureCookie(): string {
  return process.env.SPACE_HOST ? "; Secure" : "";
}

function cookie(name: string, value: string, maxAgeSeconds: number, httpOnly = true): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secureCookie()}`;
}

function oauthEnabled(): boolean {
  return Boolean(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET);
}

function sessionSecret(): string {
  return process.env.OAUTH_CLIENT_SECRET || "";
}

function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + DEMO_WINDOW_MS }), "utf8").toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function sessionUser(req: IncomingMessage): SessionUser | undefined {
  if (!oauthEnabled()) return undefined;
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & { exp: number };
    if (!parsed.sub || !parsed.username || !parsed.exp || parsed.exp <= Date.now()) return undefined;
    return { sub: parsed.sub, username: parsed.username, avatar: parsed.avatar };
  } catch {
    return undefined;
  }
}

function baseUrl(req: IncomingMessage): string {
  if (process.env.SPACE_HOST) return `https://${process.env.SPACE_HOST}`;
  const proto = header(req, "x-forwarded-proto") || "http";
  return `${proto}://${req.headers.host || "localhost"}`;
}

async function oidcConfig(): Promise<{ authorization_endpoint: string; token_endpoint: string; userinfo_endpoint: string }> {
  if (oidcConfigCache) return oidcConfigCache;
  const provider = (process.env.OPENID_PROVIDER_URL || "https://huggingface.co").replace(/\/$/, "");
  const response = await fetch(`${provider}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error(`OAuth discovery failed (${response.status})`);
  const value = await response.json() as Record<string, unknown>;
  if (!value.authorization_endpoint || !value.token_endpoint || !value.userinfo_endpoint) throw new Error("OAuth discovery response is incomplete");
  oidcConfigCache = {
    authorization_endpoint: String(value.authorization_endpoint),
    token_endpoint: String(value.token_endpoint),
    userinfo_endpoint: String(value.userinfo_endpoint)
  };
  return oidcConfigCache;
}

async function beginOauth(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!oauthEnabled()) { redirect(res, "/?auth=unavailable"); return; }
  const state = randomBytes(24).toString("base64url");
  const config = await oidcConfig();
  const redirectUri = `${baseUrl(req)}/auth/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.OAUTH_CLIENT_ID || "",
    redirect_uri: redirectUri,
    scope: "openid profile",
    state
  });
  res.setHeader("set-cookie", cookie(STATE_COOKIE, state, 600));
  redirect(res, `${config.authorization_endpoint}?${params.toString()}`);
}

async function finishOauth(req: IncomingMessage, res: ServerResponse, u: URL): Promise<void> {
  if (!oauthEnabled()) { redirect(res, "/?auth=unavailable"); return; }
  const state = u.searchParams.get("state") || "";
  const code = u.searchParams.get("code") || "";
  const expectedState = parseCookies(req)[STATE_COOKIE] || "";
  if (!state || !code || !expectedState || state !== expectedState) { redirect(res, "/?auth=failed"); return; }

  const config = await oidcConfig();
  const redirectUri = `${baseUrl(req)}/auth/callback`;
  const credentials = Buffer.from(`${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`, "utf8").toString("base64");
  const tokenResponse = await fetch(config.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.OAUTH_CLIENT_ID || "",
      redirect_uri: redirectUri
    })
  });
  if (!tokenResponse.ok) { redirect(res, "/?auth=failed"); return; }
  const token = await tokenResponse.json() as Record<string, unknown>;
  if (!token.access_token) { redirect(res, "/?auth=failed"); return; }

  const infoResponse = await fetch(config.userinfo_endpoint, { headers: { authorization: `Bearer ${String(token.access_token)}` } });
  if (!infoResponse.ok) { redirect(res, "/?auth=failed"); return; }
  const info = await infoResponse.json() as Record<string, unknown>;
  const username = String(info.preferred_username || info.username || info.name || "").trim();
  const sub = String(info.sub || username).trim();
  if (!username || !sub) { redirect(res, "/?auth=failed"); return; }

  const user: SessionUser = { sub, username, avatar: info.picture ? String(info.picture) : undefined };
  res.setHeader("set-cookie", [cookie(SESSION_COOKIE, signSession(user), DEMO_WINDOW_MS / 1000), cookie(STATE_COOKIE, "", 0)]);
  redirect(res, "/");
}

async function body(req: IncomingMessage, maxBytes = 1_000_000): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += b.length;
    if (size > maxBytes) throw new Error("Request body too large");
    chunks.push(b);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function authorized(req: IncomingMessage): boolean {
  const required = process.env.URL_AGENT_API_TOKEN;
  if (!required) return true;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${required}`;
}

function validateUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function recent(entry: UsageEntry | undefined, now = Date.now()): boolean {
  return Boolean(entry && now - entry.at < DEMO_WINDOW_MS);
}

function cleanupDemoUsage(now = Date.now()): void {
  for (const [key, entry] of demoUsage) if (!recent(entry, now)) demoUsage.delete(key);
}

function currentDemoStatus(req: IncomingMessage, user = sessionUser(req)): DemoStatus {
  cleanupDemoUsage();
  const now = Date.now();
  const ipKey = ipUsageKey(req);
  const ipEntry = demoUsage.get(ipKey);
  const blockers: number[] = [];

  if (user) {
    const accountEntry = demoUsage.get(`account:${user.sub}`);
    if (recent(accountEntry, now)) blockers.push((accountEntry as UsageEntry).at + DEMO_WINDOW_MS);
    // Prevent an anonymous user from consuming a request and then signing in for a second one.
    if (recent(ipEntry, now) && ipEntry?.kind === "anonymous") blockers.push(ipEntry.at + DEMO_WINDOW_MS);
  } else if (recent(ipEntry, now)) {
    blockers.push((ipEntry as UsageEntry).at + DEMO_WINDOW_MS);
  }

  const blocked = blockers.length > 0;
  return {
    allowed: !blocked,
    remaining: blocked ? 0 : 1,
    resetAt: blocked ? new Date(Math.max(...blockers)).toISOString() : undefined,
    identity: user ? "account" : "ip",
    authenticated: Boolean(user)
  };
}

async function resolveDemoRateFile(): Promise<string> {
  if (process.env.URL_AGENT_DEMO_RATE_FILE) return process.env.URL_AGENT_DEMO_RATE_FILE;
  try {
    await access("/data", constants.W_OK);
    return "/data/url-intelligence-demo-usage.json";
  } catch {
    return "/tmp/url-intelligence-demo-usage.json";
  }
}

async function loadDemoUsage(): Promise<void> {
  demoRateFile = await resolveDemoRateFile();
  try {
    const raw = JSON.parse(await readFile(demoRateFile, "utf8")) as Record<string, UsageEntry>;
    for (const [key, value] of Object.entries(raw)) {
      if (value && typeof value.at === "number" && (value.kind === "anonymous" || value.kind === "account")) demoUsage.set(key, value);
    }
    cleanupDemoUsage();
  } catch {
    // First boot or ephemeral storage: start with an empty quota store.
  }
}

async function persistDemoUsage(): Promise<void> {
  if (!demoRateFile) return;
  try {
    cleanupDemoUsage();
    await mkdir(dirname(demoRateFile), { recursive: true });
    await writeFile(demoRateFile, JSON.stringify(Object.fromEntries(demoUsage), null, 2), "utf8");
  } catch {
    // Rate limiting remains active in memory even when persistence is unavailable.
  }
}

async function reserveDemoRequest(req: IncomingMessage, user = sessionUser(req)): Promise<DemoStatus> {
  const status = currentDemoStatus(req, user);
  if (!status.allowed) return status;
  const now = Date.now();
  const ipKey = ipUsageKey(req);
  if (user) {
    demoUsage.set(`account:${user.sub}`, { at: now, kind: "account" });
    demoUsage.set(ipKey, { at: now, kind: "account" });
  } else {
    demoUsage.set(ipKey, { at: now, kind: "anonymous" });
  }
  await persistDemoUsage();
  return { ...status, allowed: false, remaining: 0, resetAt: new Date(now + DEMO_WINDOW_MS).toISOString() };
}

function rateLimited(res: ServerResponse, status: DemoStatus): void {
  const resetMs = status.resetAt ? new Date(status.resetAt).getTime() : Date.now() + DEMO_WINDOW_MS;
  const retry = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  res.setHeader("retry-after", String(retry));
  res.setHeader("x-ratelimit-limit", "1");
  res.setHeader("x-ratelimit-remaining", "0");
  res.setHeader("x-ratelimit-reset", String(Math.ceil(resetMs / 1000)));
  json(res, 429, {
    error: "Hosted demo limit reached",
    message: "This Hugging Face demo allows one analysis request per Hugging Face account or anonymous IP every 24 hours. Clone or self-host the open-source agent for unrestricted local use.",
    demo: status,
    attribution: attributionObject()
  });
}

export async function startApiServer(port = Number(process.env.PORT || 8787), host = process.env.HOST || "127.0.0.1"): Promise<void> {
  await loadDemoUsage();

  const server = createServer(async (req, res) => {
    if (process.env.URL_AGENT_CORS_ORIGIN) {
      res.setHeader("access-control-allow-origin", process.env.URL_AGENT_CORS_ORIGIN);
      res.setHeader("access-control-allow-headers", "content-type,authorization");
      res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    if (!allowed(req)) { json(res, 429, { error: "Rate limit exceeded", attribution: attributionObject() }); return; }
    if (!authorized(req)) { json(res, 401, { error: "Unauthorized", attribution: attributionObject() }); return; }

    try {
      const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const user = sessionUser(req);

      if (u.pathname === "/" && req.method === "GET" && await serveUi(res)) return;
      if (u.pathname === "/auth/login" && req.method === "GET") { await beginOauth(req, res); return; }
      if (u.pathname === "/auth/callback" && req.method === "GET") { await finishOauth(req, res, u); return; }
      if (u.pathname === "/auth/logout" && req.method === "GET") {
        res.setHeader("set-cookie", cookie(SESSION_COOKIE, "", 0));
        redirect(res, "/");
        return;
      }
      if (u.pathname === "/me" && req.method === "GET") {
        json(res, 200, {
          oauthEnabled: oauthEnabled(),
          user: user ? { username: user.username, avatar: user.avatar } : null,
          demo: currentDemoStatus(req, user),
          demoPolicy: { requests: 1, windowHours: DEMO_WINDOW_MS / 3_600_000 },
          attribution: attributionObject()
        });
        return;
      }
      if (u.pathname === "/health") {
        json(res, 200, { ok: true, uptimeSeconds: Math.round(process.uptime()), actions: actionNames().length, demoLimit: "1 request / 24h", attribution: attributionObject() });
        return;
      }
      if (u.pathname === "/actions") {
        json(res, 200, { actions: actionNames(), publicDemoActions: [...PUBLIC_DEMO_ACTIONS], attribution: attributionObject() });
        return;
      }

      const actionMatch = u.pathname.match(/^\/action\/([a-z0-9_:-]+)$/i);
      if (actionMatch) {
        const action = actionMatch[1];
        if (!PUBLIC_DEMO_ACTIONS.has(action)) {
          json(res, 403, {
            error: "Action not enabled in hosted demo",
            message: "Use the open-source CLI, MCP server, Docker image or self-hosted API for this action.",
            publicDemoActions: [...PUBLIC_DEMO_ACTIONS],
            attribution: attributionObject()
          });
          return;
        }
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const url = validateUrl(args.url);
        if (!url) { json(res, 400, { error: "Provide a valid public http/https URL", attribution: attributionObject() }); return; }
        args.url = url;
        const before = currentDemoStatus(req, user);
        if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user);
        const result = await runAction(action, args as any);
        json(res, 200, { attribution: attributionObject(), demo, result });
        return;
      }

      if (u.pathname === "/investigate") {
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const url = validateUrl(args.url);
        if (!url) { json(res, 400, { error: "Provide a valid public http/https URL", attribution: attributionObject() }); return; }
        args.url = url;
        const before = currentDemoStatus(req, user);
        if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user);
        const result = await runAction("investigate_url", args as any);
        json(res, 200, { attribution: attributionObject(), demo, result });
        return;
      }

      json(res, 404, { error: "Not found", available: ["/", "/health", "/me", "/actions", "/investigate", "/action/:name"], attribution: attributionObject() });
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : String(error), attribution: attributionObject() });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  console.log(`${creditsLine()}\nAPI listening on http://${host}:${port}`);
}
