import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { actionNames, runAction } from "./agent.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";
import { MCP_PROTOCOL_VERSIONS, MODERN_MCP_PROTOCOL, processMcpMessage, type McpMessage } from "./mcp.js";
import { exportFilename, generateHtml, generateJson, generateMarkdown, generatePdf, type ExportReport } from "./export-report.js";
import { searchProviderStatus } from "./research.js";

const buckets = new Map<string, { count: number; reset: number }>();
let uiHtml: string | undefined;

const SESSION_COOKIE = "url_agent_hf_session";
const STATE_COOKIE = "url_agent_hf_state";
const DEMO_WINDOW_MS = Math.max(60_000, Number(process.env.URL_AGENT_DEMO_WINDOW_MS || 86_400_000));
const OWNER_USERNAME = String(process.env.URL_AGENT_OWNER_USERNAME || "vpicciuolo").toLowerCase();
const REPORT_TTL_MS = Math.max(DEMO_WINDOW_MS, Number(process.env.URL_AGENT_REPORT_TTL_MS || 172_800_000));

export const PUBLIC_DEMO_ACTIONS = new Set([
  "investigate_url",
  "inspect_provenance",
  "verify_claim",
  "audit_seo",
  "audit_security",
  "audit_trust",
  "find_social_profiles",
  "detect_technologies",
  "brand_intelligence",
  "domain_intelligence",
  "structured_data"
]);

const reports = new Map<string, ExportReport>();
const mcpSessions = new Map<string, { createdAt: number; lastToolAt?: number; ipHash: string; clientName?: string }>();
const mcpIpUsage = new Map<string, number>();

type SessionUser = { sub: string; username: string; avatar?: string };
type UsageEntry = { at: number; kind: "account" };
type DemoStatus = {
  allowed: boolean;
  remaining: 0 | 1;
  resetAt?: string;
  identity: "account" | "anonymous";
  authenticated: boolean;
  unlimited: boolean;
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

function send(res: ServerResponse, status: number, contentType: string, value: string | Buffer, cache = "no-store"): void {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.setHeader("cache-control", cache);
  res.setHeader("x-powered-by", `${PROJECT.name}/${PROJECT.version}`);
  res.end(value);
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
    send(res, 200, "text/html; charset=utf-8", uiHtml, "no-cache");
    return true;
  } catch { return false; }
}

async function serveAsset(res: ServerResponse, name: "logo.jpg" | "og.jpg"): Promise<boolean> {
  const base = process.env.URL_AGENT_ASSET_DIR;
  if (!base) return false;
  try {
    const file = await readFile(join(base, name));
    send(res, 200, "image/jpeg", file, "public, max-age=86400, immutable");
    return true;
  } catch { return false; }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(req: IncomingMessage): string {
  const real = header(req, "x-real-ip")?.trim();
  if (real) return real;
  const forwarded = header(req, "x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return String(req.socket.remoteAddress || "unknown");
}

function ipHash(req: IncomingMessage): string { return createHash("sha256").update(clientIp(req)).digest("hex"); }

function allowed(req: IncomingMessage): boolean {
  const limit = Math.max(1, Number(process.env.URL_AGENT_API_RATE_LIMIT || 120));
  const now = Date.now();
  const ip = clientIp(req);
  const bucket = buckets.get(ip);
  if (!bucket || bucket.reset < now) { buckets.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  bucket.count += 1;
  return bucket.count <= limit;
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header(req, "cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key) out[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function secureCookie(): string { return process.env.SPACE_HOST ? "; Secure" : ""; }
function cookie(name: string, value: string, maxAgeSeconds: number, httpOnly = true): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secureCookie()}`;
}

function oauthEnabled(): boolean { return Boolean(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET); }
function sessionSecret(): string { return process.env.OAUTH_CLIENT_SECRET || ""; }

function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + DEMO_WINDOW_MS }), "utf8").toString("base64url");
  return `${payload}.${createHmac("sha256", sessionSecret()).update(payload).digest("base64url")}`;
}

function sessionUser(req: IncomingMessage): SessionUser | undefined {
  if (!oauthEnabled()) return undefined;
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature), expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & { exp: number };
    if (!parsed.sub || !parsed.username || !parsed.exp || parsed.exp <= Date.now()) return undefined;
    return { sub: parsed.sub, username: parsed.username, avatar: parsed.avatar };
  } catch { return undefined; }
}

function isOwner(user?: SessionUser): boolean { return Boolean(user && user.username.toLowerCase() === OWNER_USERNAME); }
function baseUrl(req: IncomingMessage): string {
  if (process.env.SPACE_HOST) return `https://${process.env.SPACE_HOST}`;
  return `${header(req, "x-forwarded-proto") || "http"}://${req.headers.host || "localhost"}`;
}

async function oidcConfig(): Promise<{ authorization_endpoint: string; token_endpoint: string; userinfo_endpoint: string }> {
  if (oidcConfigCache) return oidcConfigCache;
  const provider = (process.env.OPENID_PROVIDER_URL || "https://huggingface.co").replace(/\/$/, "");
  const response = await fetch(`${provider}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error(`OAuth discovery failed (${response.status})`);
  const value = await response.json() as Record<string, unknown>;
  if (!value.authorization_endpoint || !value.token_endpoint || !value.userinfo_endpoint) throw new Error("OAuth discovery response is incomplete");
  oidcConfigCache = { authorization_endpoint: String(value.authorization_endpoint), token_endpoint: String(value.token_endpoint), userinfo_endpoint: String(value.userinfo_endpoint) };
  return oidcConfigCache;
}

async function beginOauth(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!oauthEnabled()) { redirect(res, "/?auth=unavailable"); return; }
  const state = randomBytes(24).toString("base64url"), config = await oidcConfig(), redirectUri = `${baseUrl(req)}/auth/callback`;
  const params = new URLSearchParams({ response_type: "code", client_id: process.env.OAUTH_CLIENT_ID || "", redirect_uri: redirectUri, scope: "openid profile", state });
  res.setHeader("set-cookie", cookie(STATE_COOKIE, state, 600));
  redirect(res, `${config.authorization_endpoint}?${params.toString()}`);
}

async function finishOauth(req: IncomingMessage, res: ServerResponse, u: URL): Promise<void> {
  if (!oauthEnabled()) { redirect(res, "/?auth=unavailable"); return; }
  const state = u.searchParams.get("state") || "", code = u.searchParams.get("code") || "", expectedState = parseCookies(req)[STATE_COOKIE] || "";
  if (!state || !code || !expectedState || state !== expectedState) { redirect(res, "/?auth=failed"); return; }
  const config = await oidcConfig(), redirectUri = `${baseUrl(req)}/auth/callback`;
  const credentials = Buffer.from(`${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`, "utf8").toString("base64");
  const tokenResponse = await fetch(config.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${credentials}` }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: process.env.OAUTH_CLIENT_ID || "", redirect_uri: redirectUri }) });
  if (!tokenResponse.ok) { redirect(res, "/?auth=failed"); return; }
  const token = await tokenResponse.json() as Record<string, unknown>;
  if (!token.access_token) { redirect(res, "/?auth=failed"); return; }
  const infoResponse = await fetch(config.userinfo_endpoint, { headers: { authorization: `Bearer ${String(token.access_token)}` } });
  if (!infoResponse.ok) { redirect(res, "/?auth=failed"); return; }
  const info = await infoResponse.json() as Record<string, unknown>;
  const username = String(info.preferred_username || info.username || info.name || "").trim(), sub = String(info.sub || username).trim();
  if (!username || !sub) { redirect(res, "/?auth=failed"); return; }
  const user: SessionUser = { sub, username, avatar: info.picture ? String(info.picture) : undefined };
  res.setHeader("set-cookie", [cookie(SESSION_COOKIE, signSession(user), DEMO_WINDOW_MS / 1000), cookie(STATE_COOKIE, "", 0)]);
  redirect(res, "/");
}

async function body(req: IncomingMessage, maxBytes = 2_000_000): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += b.length;
    if (size > maxBytes) throw new Error("Request body too large"); chunks.push(b);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> : {};
}
async function rawJson(req: IncomingMessage, maxBytes = 2_000_000): Promise<McpMessage> { return await body(req, maxBytes) as McpMessage; }

function authorized(req: IncomingMessage): boolean {
  const required = process.env.URL_AGENT_API_TOKEN;
  return !required || req.headers.authorization === `Bearer ${required}`;
}

function validateUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try { const parsed = new URL(value.trim()); return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined; } catch { return undefined; }
}

function validateSearchProvider(value: unknown): { ok: true; provider?: string } | { ok: false; message: string } {
  if (value === undefined || value === null || String(value).trim() === "") return { ok: true };
  const requested = String(value).trim().toLowerCase();
  const aliases: Record<string, string> = { google: "google-cse", "google_custom_search": "google-cse", ddg: "duckduckgo", searx: "searxng" };
  const id = aliases[requested] || requested, status = searchProviderStatus(), provider = status.providers.find(p => p.id === id);
  if (!provider) return { ok: false, message: `Unsupported external search provider: ${requested}` };
  if (!provider.available) return { ok: false, message: `${provider.label} is not configured on this Hugging Face runtime. Choose an available provider or configure its Space secret(s).` };
  return { ok: true, provider: provider.id };
}

function recent(entry: UsageEntry | undefined, now = Date.now()): boolean { return Boolean(entry && now - entry.at < DEMO_WINDOW_MS); }
function cleanupDemoUsage(now = Date.now()): void { for (const [key, entry] of demoUsage) if (!recent(entry, now)) demoUsage.delete(key); }
function cleanupReports(now = Date.now()): void { for (const [key, report] of reports) if (now - new Date(report.createdAt).getTime() > REPORT_TTL_MS) reports.delete(key); }
function cleanupMcpSessions(now = Date.now()): void { for (const [key, session] of mcpSessions) if (now - session.createdAt > DEMO_WINDOW_MS) mcpSessions.delete(key); for (const [key, at] of mcpIpUsage) if (now - at > DEMO_WINDOW_MS) mcpIpUsage.delete(key); }

function currentDemoStatus(_req: IncomingMessage, user = sessionUser(_req)): DemoStatus {
  cleanupDemoUsage();
  if (!user) return { allowed: false, remaining: 0, identity: "anonymous", authenticated: false, unlimited: false };
  if (isOwner(user)) return { allowed: true, remaining: 1, identity: "account", authenticated: true, unlimited: true };
  const entry = demoUsage.get(`account:${user.sub}`);
  return recent(entry) ? { allowed: false, remaining: 0, resetAt: new Date((entry as UsageEntry).at + DEMO_WINDOW_MS).toISOString(), identity: "account", authenticated: true, unlimited: false } : { allowed: true, remaining: 1, identity: "account", authenticated: true, unlimited: false };
}

async function resolveDemoRateFile(): Promise<string> {
  if (process.env.URL_AGENT_DEMO_RATE_FILE) return process.env.URL_AGENT_DEMO_RATE_FILE;
  try { await access("/data", constants.W_OK); return "/data/url-intelligence-demo-usage.json"; } catch { return "/tmp/url-intelligence-demo-usage.json"; }
}
async function loadDemoUsage(): Promise<void> {
  demoRateFile = await resolveDemoRateFile();
  try { const raw = JSON.parse(await readFile(demoRateFile, "utf8")) as Record<string, UsageEntry>; for (const [key, value] of Object.entries(raw)) if (value && typeof value.at === "number") demoUsage.set(key, value); cleanupDemoUsage(); } catch { /* first boot */ }
}
async function persistDemoUsage(): Promise<void> {
  if (!demoRateFile) return;
  try { cleanupDemoUsage(); await mkdir(dirname(demoRateFile), { recursive: true }); await writeFile(demoRateFile, JSON.stringify(Object.fromEntries(demoUsage), null, 2), "utf8"); } catch { /* memory limiting remains active */ }
}
async function reserveDemoRequest(req: IncomingMessage, user = sessionUser(req)): Promise<DemoStatus> {
  const status = currentDemoStatus(req, user);
  if (!status.allowed || status.unlimited || !user) return status;
  const now = Date.now(); demoUsage.set(`account:${user.sub}`, { at: now, kind: "account" }); await persistDemoUsage();
  return { ...status, allowed: false, remaining: 0, resetAt: new Date(now + DEMO_WINDOW_MS).toISOString() };
}

function rateLimited(res: ServerResponse, status: DemoStatus): void {
  const resetMs = status.resetAt ? new Date(status.resetAt).getTime() : Date.now() + DEMO_WINDOW_MS;
  res.setHeader("retry-after", String(Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))));
  res.setHeader("x-ratelimit-limit", "1"); res.setHeader("x-ratelimit-remaining", "0"); res.setHeader("x-ratelimit-reset", String(Math.ceil(resetMs / 1000)));
  json(res, 429, { error: "Hosted demo limit reached", message: "The hosted web demo allows one analysis request per signed-in Hugging Face account every 24 hours. Clone or self-host for unrestricted local use.", demo: status, attribution: attributionObject() });
}
function loginRequired(res: ServerResponse): void { json(res, 401, { error: "Hugging Face sign-in required", message: "Sign in with Hugging Face before using the hosted web analysis and export features.", login: "/auth/login", attribution: attributionObject() }); }

function createReport(user: SessionUser, url: string, action: string, result: unknown): ExportReport {
  cleanupReports(); const report: ExportReport = { id: randomUUID(), userSub: user.sub, username: user.username, url, action, createdAt: new Date().toISOString(), result }; reports.set(report.id, report); return report;
}
async function serveReport(req: IncomingMessage, res: ServerResponse, u: URL, user?: SessionUser): Promise<boolean> {
  const match = u.pathname.match(/^\/report\/([a-f0-9-]+)$/i); if (!match) return false;
  if (!user) { loginRequired(res); return true; } cleanupReports(); const report = reports.get(match[1]);
  if (!report || report.userSub !== user.sub) { json(res, 404, { error: "Report not found or expired" }); return true; }
  const format = (u.searchParams.get("format") || "pdf").toLowerCase(); let content: string | Buffer, type: string, ext: string;
  if (format === "pdf") { content = await generatePdf(report); type = "application/pdf"; ext = "pdf"; }
  else if (format === "json") { content = generateJson(report); type = "application/json; charset=utf-8"; ext = "json"; }
  else if (format === "md" || format === "markdown") { content = generateMarkdown(report); type = "text/markdown; charset=utf-8"; ext = "md"; }
  else if (format === "html") { content = generateHtml(report); type = "text/html; charset=utf-8"; ext = "html"; }
  else { json(res, 400, { error: "Unsupported export format", formats: ["pdf", "json", "md", "html"] }); return true; }
  res.setHeader("content-disposition", `attachment; filename=\"${exportFilename(report, ext)}\"`); res.setHeader("x-robots-tag", "noindex, nofollow, noarchive"); send(res, 200, type, content); return true;
}

function mcpOriginAllowed(req: IncomingMessage): boolean {
  const origin = header(req, "origin"); if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase(), own = String(req.headers.host || "").split(":")[0].toLowerCase();
    return host === own || host === "huggingface.co" || host.endsWith(".hf.space") || host === "chatgpt.com" || host.endsWith(".openai.com") || host === "claude.ai" || host.endsWith(".anthropic.com") || host === "localhost" || host === "127.0.0.1";
  } catch { return false; }
}

function mcpProtocolAllowed(req: IncomingMessage, isInitialize: boolean, isDiscover: boolean): boolean {
  if (isInitialize || isDiscover) return true;
  const version = header(req, "mcp-protocol-version");
  return !version || (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(version);
}

function modernRoutingValid(req: IncomingMessage, message: McpMessage): { ok: true } | { ok: false; message: string } {
  const methodHeader = header(req, "mcp-method");
  if (!methodHeader) return { ok: false, message: "Mcp-Method header is required for MCP 2026-07-28 requests" };
  if (methodHeader !== message.method) return { ok: false, message: "Mcp-Method header does not match the JSON-RPC method" };
  const nameRequired = message.method === "tools/call" || message.method === "resources/read";
  const expectedName = message.method === "tools/call" ? String(message.params?.name || "") : message.method === "resources/read" ? String(message.params?.uri || "") : "";
  const nameHeader = header(req, "mcp-name");
  if (nameRequired && !nameHeader) return { ok: false, message: "Mcp-Name header is required for this MCP 2026-07-28 request" };
  if (nameRequired && nameHeader !== expectedName) return { ok: false, message: "Mcp-Name header does not match the routed name" };
  return { ok: true };
}

function reserveMcpIp(req: IncomingMessage): void {
  cleanupMcpSessions();
  const key = ipHash(req), at = mcpIpUsage.get(key), now = Date.now();
  if (at && now - at < DEMO_WINDOW_MS) throw Object.assign(new Error(`Public remote MCP demo limit reached. One analysis tool call per IP every 24 hours. Reset: ${new Date(at + DEMO_WINDOW_MS).toISOString()}`), { code: -32029 });
  mcpIpUsage.set(key, now);
}

async function mcpToolCall(req: IncomingMessage, name: string, args: Record<string, unknown>, sessionId?: string, modern = false): Promise<unknown> {
  if (!PUBLIC_DEMO_ACTIONS.has(name)) throw Object.assign(new Error(`Tool not available on this public MCP endpoint: ${name}`), { code: -32602 });
  if (name !== "list_plugins") {
    const url = validateUrl(args.url); if (!url) throw Object.assign(new Error("Provide a valid public http/https URL"), { code: -32602 }); args.url = url;
  }
  if (modern) reserveMcpIp(req);
  else {
    if (!sessionId) throw Object.assign(new Error("MCP session is missing"), { code: -32000 });
    const session = mcpSessions.get(sessionId); if (!session) throw Object.assign(new Error("MCP session expired"), { code: -32000 });
    if (session.lastToolAt && Date.now() - session.lastToolAt < DEMO_WINDOW_MS) throw Object.assign(new Error(`Public remote MCP demo limit reached. One analysis tool call per session every 24 hours. Reset: ${new Date(session.lastToolAt + DEMO_WINDOW_MS).toISOString()}`), { code: -32029 });
    const ipAt = mcpIpUsage.get(session.ipHash); if (ipAt && Date.now() - ipAt < DEMO_WINDOW_MS) throw Object.assign(new Error(`Public remote MCP demo IP limit reached. Reset: ${new Date(ipAt + DEMO_WINDOW_MS).toISOString()}`), { code: -32029 });
    session.lastToolAt = Date.now(); mcpIpUsage.set(session.ipHash, session.lastToolAt);
  }
  return runAction(name, args as any);
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (!req.url) return false; const u = new URL(req.url, `http://${req.headers.host || "localhost"}`); if (u.pathname !== "/mcp") return false;
  res.setHeader("access-control-expose-headers", "Mcp-Session-Id,MCP-Protocol-Version,Mcp-Method,Mcp-Name"); res.setHeader("x-robots-tag", "noindex, nofollow, noarchive");
  if (!mcpOriginAllowed(req)) { json(res, 403, { error: "Invalid Origin for MCP endpoint" }); return true; }
  if (req.method === "GET") { res.statusCode = 405; res.setHeader("allow", "POST, DELETE"); res.end(); return true; }
  if (req.method === "DELETE") { const sessionId = header(req, "mcp-session-id"); if (sessionId) mcpSessions.delete(sessionId); res.statusCode = 204; res.end(); return true; }
  if (req.method !== "POST") { res.statusCode = 405; res.end(); return true; }

  let message: McpMessage;
  try { message = await rawJson(req); } catch (error) { json(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: error instanceof Error ? error.message : "Invalid JSON" } }); return true; }
  const isInitialize = message.method === "initialize", isDiscover = message.method === "server/discover";
  if (!mcpProtocolAllowed(req, isInitialize, isDiscover)) { json(res, 400, { error: "Unsupported MCP protocol version", supported: MCP_PROTOCOL_VERSIONS }); return true; }
  const requestedVersion = header(req, "mcp-protocol-version");
  const modern = isDiscover || requestedVersion === MODERN_MCP_PROTOCOL;
  if (modern && !isDiscover) { const routing = modernRoutingValid(req, message); if (!routing.ok) { json(res, 400, { error: routing.message, protocolVersion: MODERN_MCP_PROTOCOL }); return true; } }

  cleanupMcpSessions();
  let sessionId = header(req, "mcp-session-id");
  if (!modern) {
    if (isInitialize) { sessionId = randomUUID(); mcpSessions.set(sessionId, { createdAt: Date.now(), ipHash: ipHash(req), clientName: String(message.params?.clientInfo?.name || "remote-mcp-client") }); res.setHeader("Mcp-Session-Id", sessionId); }
    else if (message.method !== "ping" && message.method !== "server/discover") {
      if (!sessionId) { json(res, 400, { error: "Mcp-Session-Id is required after initialize for legacy MCP versions" }); return true; }
      if (!mcpSessions.has(sessionId)) { json(res, 404, { error: "MCP session not found or expired" }); return true; }
    }
  } else if (sessionId) {
    json(res, 400, { error: "Mcp-Session-Id is not used by MCP 2026-07-28 stateless requests" }); return true;
  }

  try {
    const result = await processMcpMessage(message, { allowedTools: PUBLIC_DEMO_ACTIONS, protocolVersion: modern ? MODERN_MCP_PROTOCOL : requestedVersion, callTool: async (name, args) => mcpToolCall(req, name, args, sessionId, modern) });
    if (result === undefined || message.id === undefined) { res.statusCode = 202; res.end(); return true; }
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({ jsonrpc: "2.0", id: message.id ?? null, result }));
  } catch (error) {
    const e = error as Error & { code?: number };
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({ jsonrpc: "2.0", id: message.id ?? null, error: { code: e.code || -32000, message: e.message } }));
  }
  return true;
}

function publicMetadata(req: IncomingMessage): { base: string; canonical: string; mcp: string; github: string; huggingFace: string } {
  const base = baseUrl(req); return { base, canonical: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent", mcp: `${base}/mcp`, github: "https://github.com/vpicciuolo/url-intelligence-agent", huggingFace: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent" };
}

export async function startApiServer(port = Number(process.env.PORT || 8787), host = process.env.HOST || "127.0.0.1"): Promise<void> {
  await loadDemoUsage();
  const server = createServer(async (req, res) => {
    if (process.env.URL_AGENT_CORS_ORIGIN) {
      res.setHeader("access-control-allow-origin", process.env.URL_AGENT_CORS_ORIGIN);
      res.setHeader("access-control-allow-headers", "content-type,authorization,mcp-session-id,mcp-protocol-version,mcp-method,mcp-name");
      res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    if (!allowed(req)) { json(res, 429, { error: "Rate limit exceeded", attribution: attributionObject() }); return; }

    try {
      if (await handleMcp(req, res)) return;
      if (!authorized(req)) { json(res, 401, { error: "Unauthorized", attribution: attributionObject() }); return; }
      const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`), user = sessionUser(req), meta = publicMetadata(req);
      if (u.pathname === "/" && req.method === "GET" && await serveUi(res)) return;
      if (u.pathname === "/assets/logo.jpg" && req.method === "GET" && await serveAsset(res, "logo.jpg")) return;
      if (u.pathname === "/assets/og.jpg" && req.method === "GET" && await serveAsset(res, "og.jpg")) return;
      if (u.pathname === "/favicon.jpg" && req.method === "GET" && await serveAsset(res, "logo.jpg")) return;

      if (u.pathname === "/robots.txt" && req.method === "GET") { send(res, 200, "text/plain; charset=utf-8", `User-agent: *\nAllow: /\nDisallow: /auth/\nDisallow: /report/\nDisallow: /mcp\nSitemap: ${meta.base}/sitemap.xml\n`, "public, max-age=3600"); return; }
      if (u.pathname === "/sitemap.xml" && req.method === "GET") { send(res, 200, "application/xml; charset=utf-8", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${meta.base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`, "public, max-age=3600"); return; }
      if (u.pathname === "/llms.txt" && req.method === "GET") { send(res, 200, "text/plain; charset=utf-8", `# URL Intelligence Agent v${PROJECT.version}\n\nEvidence-first public URL and claim intelligence.\n\nRemote MCP: ${meta.mcp}\nHugging Face: ${meta.huggingFace}\nGitHub: ${meta.github}\nCreator: Vincenzo Picciuolo\nCompany: HRN Innovation Technologies Ltd\n\nCapabilities: claim-level provenance, source-vs-rendered drift detection, structured-data/visible-content comparison, numeric range semantics, deep URL investigation, entity resolution, public web corroboration, SEO/security/trust, RAG, monitoring, API and MCP ${MODERN_MCP_PROTOCOL}.\n`, "public, max-age=3600"); return; }
      if (u.pathname === "/.well-known/security.txt" && req.method === "GET") { send(res, 200, "text/plain; charset=utf-8", `Canonical: ${meta.base}/.well-known/security.txt\nPolicy: ${meta.github}/blob/main/SECURITY.md\nExpires: 2027-09-08T00:00:00.000Z\n`, "public, max-age=3600"); return; }
      if (u.pathname === "/.well-known/mcp.json" && req.method === "GET") { json(res, 200, { name: PROJECT.name, version: PROJECT.version, transport: "streamable-http", endpoint: meta.mcp, protocolVersions: MCP_PROTOCOL_VERSIONS, modernProtocol: MODERN_MCP_PROTOCOL, modernTransport: "stateless", legacyTransport: "session-compatible", tasksExtension: "io.modelcontextprotocol/tasks", authentication: "none", publicDemoTools: [...PUBLIC_DEMO_ACTIONS], limit: "1 analysis tool call per IP / 24h (legacy additionally bounded per session)", github: meta.github, huggingFace: meta.huggingFace, creator: PROJECT.creator }); return; }

      if (u.pathname === "/auth/login" && req.method === "GET") { await beginOauth(req, res); return; }
      if (u.pathname === "/auth/callback" && req.method === "GET") { await finishOauth(req, res, u); return; }
      if (u.pathname === "/auth/logout" && req.method === "GET") { res.setHeader("set-cookie", cookie(SESSION_COOKIE, "", 0)); redirect(res, "/"); return; }
      if (await serveReport(req, res, u, user)) return;

      if (u.pathname === "/me" && req.method === "GET") { json(res, 200, { oauthEnabled: oauthEnabled(), user: user ? { username: user.username, avatar: user.avatar, owner: isOwner(user) } : null, demo: currentDemoStatus(req, user), demoPolicy: { loginRequired: true, requests: 1, windowHours: DEMO_WINDOW_MS / 3_600_000, ownerExempt: true }, remoteMcp: { endpoint: meta.mcp, transport: `Stateless ${MODERN_MCP_PROTOCOL} + legacy sessions`, public: true, tools: [...PUBLIC_DEMO_ACTIONS] }, attribution: attributionObject() }); return; }
      if (u.pathname === "/health") { json(res, 200, { ok: true, version: PROJECT.version, release: PROJECT.release, uptimeSeconds: Math.round(process.uptime()), actions: actionNames().length, provenanceSchema: "1.0", modernMcp: MODERN_MCP_PROTOCOL, webDemo: "HF login required · 1 request / 24h · owner exempt", remoteMcp: meta.mcp, attribution: attributionObject() }); return; }
      if (u.pathname === "/actions") { json(res, 200, { actions: actionNames(), publicDemoActions: [...PUBLIC_DEMO_ACTIONS], remoteMcp: meta.mcp, attribution: attributionObject() }); return; }
      if (u.pathname === "/search-providers" && req.method === "GET") { json(res, 200, { ...searchProviderStatus(), note: "Google Custom Search is the preferred hosted index. The runtime falls back to DuckDuckGo when Google credentials are not configured." }); return; }

      const actionMatch = u.pathname.match(/^\/action\/([a-z0-9_:-]+)$/i);
      if (actionMatch) {
        if (!user) { loginRequired(res); return; }
        const action = actionMatch[1];
        if (!PUBLIC_DEMO_ACTIONS.has(action)) { json(res, 403, { error: "Action not enabled in hosted web demo", message: "Use the open-source CLI, MCP server, Docker image or self-hosted API for this action.", publicDemoActions: [...PUBLIC_DEMO_ACTIONS], attribution: attributionObject() }); return; }
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const url = validateUrl(args.url); if (!url) { json(res, 400, { error: "Provide a valid public http/https URL", attribution: attributionObject() }); return; } args.url = url;
        const before = currentDemoStatus(req, user); if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user), result = await runAction(action, args as any), report = createReport(user, url, action, result);
        json(res, 200, { attribution: attributionObject(), demo, report: { id: report.id, expiresAt: new Date(Date.now() + REPORT_TTL_MS).toISOString(), exports: { pdf: `/report/${report.id}?format=pdf`, json: `/report/${report.id}?format=json`, markdown: `/report/${report.id}?format=md`, html: `/report/${report.id}?format=html` } }, result }); return;
      }

      if (u.pathname === "/investigate") {
        if (!user) { loginRequired(res); return; }
        const args: Record<string, unknown> = req.method === "POST" ? await body(req) : Object.fromEntries(u.searchParams.entries());
        const url = validateUrl(args.url); if (!url) { json(res, 400, { error: "Provide a valid public http/https URL", attribution: attributionObject() }); return; } args.url = url;
        const selected = validateSearchProvider(args.searchProvider); if (!selected.ok) { json(res, 400, { error: selected.message, providers: searchProviderStatus(), attribution: attributionObject() }); return; } if (selected.provider) args.searchProvider = selected.provider;
        const before = currentDemoStatus(req, user); if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user), result = await runAction("investigate_url", args as any), report = createReport(user, url, "investigate_url", result);
        json(res, 200, { attribution: attributionObject(), demo, report: { id: report.id, expiresAt: new Date(Date.now() + REPORT_TTL_MS).toISOString(), exports: { pdf: `/report/${report.id}?format=pdf`, json: `/report/${report.id}?format=json`, markdown: `/report/${report.id}?format=md`, html: `/report/${report.id}?format=html` } }, result }); return;
      }

      json(res, 404, { error: "Not found", available: ["/", "/health", "/me", "/actions", "/search-providers", "/investigate", "/action/:name", "/mcp", "/.well-known/mcp.json", "/llms.txt"], attribution: attributionObject() });
    } catch (error) { json(res, 400, { error: error instanceof Error ? error.message : String(error), attribution: attributionObject() }); }
  });

  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, host, () => resolve()); });
  console.log(`${creditsLine()}\nAPI listening on http://${host}:${port}\nRemote MCP endpoint: http://${host}:${port}/mcp`);
}
