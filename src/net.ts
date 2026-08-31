import { lookup } from "node:dns/promises";
import net from "node:net";
import type { FetchTrace } from "./types.js";

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./, /^192\.0\.2\./, /^198\.18\./, /^198\.19\./, /^198\.51\.100\./, /^203\.0\.113\./, /^224\./, /^2(2[5-9]|3\d)\./, /^24\d\./, /^25[0-5]\./
];

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  maxRedirects?: number;
};

export type SafeFetchResult = {
  url: string;
  status: number;
  headers: Headers;
  text: string;
  trace: FetchTrace;
};

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return PRIVATE_V4.some(r => r.test(ip));
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80:") || x.startsWith("ff") || x.startsWith("2001:db8:");
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http/https URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Local/private host is blocked");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private/reserved IP blocked");
  } else {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(a => isPrivateIp(a.address))) throw new Error("Private/reserved destination blocked");
  }
  return url;
}

function headersObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => { out[k.toLowerCase()] = v; });
  return out;
}

export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const requestedUrl = (await assertPublicUrl(raw)).toString();
  let current = requestedUrl;
  const redirectChain: string[] = [];
  const timeoutMs = opts.timeoutMs ?? Number(process.env.URL_AGENT_TIMEOUT_MS || 10000);
  const maxBytes = opts.maxBytes ?? Number(process.env.URL_AGENT_MAX_BYTES || 3_000_000);
  const maxRedirects = Math.max(0, Math.min(12, opts.maxRedirects ?? Number(process.env.URL_AGENT_MAX_REDIRECTS || 6)));
  const userAgent = opts.userAgent ?? process.env.URL_AGENT_USER_AGENT ?? "url-intelligence-agent/1.0.0 (+https://github.com/vpicciuolo/url-intelligence-agent; https://horno.net)";
  const started = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        method: opts.method || "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": userAgent,
          "accept": "text/html,application/xhtml+xml,application/xml,text/plain,application/json;q=0.8,*/*;q=0.5",
          "accept-language": "en,*;q=0.5",
          ...opts.headers
        }
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error("Redirect without location");
        const next = new URL(loc, current).toString();
        await assertPublicUrl(next);
        redirectChain.push(next);
        current = next;
        continue;
      }
      if (opts.method === "HEAD") {
        return { url: current, status: res.status, headers: res.headers, text: "", trace: { requestedUrl, finalUrl: current, status: res.status, elapsedMs: Date.now() - started, bytes: 0, contentType: res.headers.get("content-type") || undefined, redirectChain, headers: headersObject(res.headers) } };
      }
      const reader = res.body?.getReader();
      if (!reader) return { url: current, status: res.status, headers: res.headers, text: "", trace: { requestedUrl, finalUrl: current, status: res.status, elapsedMs: Date.now() - started, bytes: 0, contentType: res.headers.get("content-type") || undefined, redirectChain, headers: headersObject(res.headers) } };
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) { await reader.cancel(); throw new Error(`Response exceeds ${maxBytes} bytes`); }
        chunks.push(value);
      }
      const all = new Uint8Array(total);
      let pos = 0;
      for (const chunk of chunks) { all.set(chunk, pos); pos += chunk.length; }
      const text = new TextDecoder().decode(all);
      return { url: current, status: res.status, headers: res.headers, text, trace: { requestedUrl, finalUrl: current, status: res.status, elapsedMs: Date.now() - started, bytes: total, contentType: res.headers.get("content-type") || undefined, redirectChain, headers: headersObject(res.headers) } };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects");
}

export async function probeUrl(raw: string): Promise<{ ok: boolean; status?: number; finalUrl?: string; elapsedMs?: number; error?: string }> {
  try {
    const result = await safeFetch(raw, { method: "HEAD", maxBytes: 0 });
    return { ok: result.status >= 200 && result.status < 400, status: result.status, finalUrl: result.url, elapsedMs: result.trace.elapsedMs };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
