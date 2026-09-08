import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { lookup as dnsLookupAsync } from "node:dns/promises";
import net from "node:net";
import { Agent, fetch } from "undici";
import { PROJECT } from "./credits.js";
import type { FetchTrace } from "./types.js";

const BLOCKED_V4 = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
] as const) BLOCKED_V4.addSubnet(address, prefix, "ipv4");

const BLOCKED_V6 = new net.BlockList();
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8]
] as const) BLOCKED_V6.addSubnet(address, prefix, "ipv6");

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  maxRedirects?: number;
};

type FetchHeaders = Awaited<ReturnType<typeof fetch>>["headers"];

export type SafeFetchResult = {
  url: string;
  status: number;
  headers: FetchHeaders;
  text: string;
  trace: FetchTrace;
};

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return BLOCKED_V4.check(ip, "ipv4");
  if (net.isIPv6(ip)) return BLOCKED_V6.check(ip, "ipv6");
  return true;
}

export function assertPublicAddresses(addresses: readonly { address: string; family: number }[]): void {
  if (!addresses.length) throw new Error("DNS resolution returned no addresses");
  if (addresses.some(a => (a.family !== 4 && a.family !== 6) || isBlockedIp(a.address))) {
    throw new Error("Private/reserved destination blocked");
  }
}

function blockedHost(host: string): boolean {
  return !host
    || host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host.endsWith(".internal")
    || host === "home.arpa"
    || host.endsWith(".home.arpa");
}

function requestedFamily(options: LookupOptions): 0 | 4 | 6 {
  if (options.family === 4 || options.family === "IPv4") return 4;
  if (options.family === 6 || options.family === "IPv6") return 6;
  return 0;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

function ssrfLookupError(error: unknown): NodeJS.ErrnoException {
  if (error && typeof error === "object" && "code" in error) return error as NodeJS.ErrnoException;
  const out = (error instanceof Error ? error : new Error(String(error))) as NodeJS.ErrnoException;
  out.code = "ERR_SSRF_BLOCKED";
  return out;
}

/**
 * DNS resolver used by the actual outbound socket. This is deliberately
 * separate from assertPublicUrl() so a hostname that changes between the
 * preflight lookup and connection lookup cannot rebind to a private address.
 */
function guardedLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) { callback(error, ""); return; }
    try {
      assertPublicAddresses(addresses);
      const family = requestedFamily(options);
      const eligible = family ? addresses.filter(a => a.family === family) : addresses;
      if (!eligible.length) throw new Error("DNS resolution returned no address for requested family");
      if (options.all) callback(null, eligible);
      else callback(null, eligible[0].address, eligible[0].family);
    } catch (error) {
      callback(ssrfLookupError(error), "");
    }
  });
}

// Undici is used explicitly instead of the process-global fetch dispatcher so
// only untrusted URL-agent collection is subject to this network policy. Every
// new socket resolves through guardedLookup; existing validated public sockets
// may be safely reused by the pool.
const GUARDED_DISPATCHER = new Agent({
  autoSelectFamily: false,
  connect: { lookup: guardedLookup }
});

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http/https URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed");
  const rawHost = url.hostname.toLowerCase();
  const host = rawHost.startsWith("[") && rawHost.endsWith("]") ? rawHost.slice(1, -1) : rawHost;
  if (blockedHost(host)) throw new Error("Local/private host is blocked");
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Private/reserved IP blocked");
  } else {
    const addresses = await dnsLookupAsync(host, { all: true, verbatim: true });
    assertPublicAddresses(addresses);
  }
  return url;
}

function headersObject(headers: FetchHeaders): Record<string, string> {
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
  const userAgent = opts.userAgent ?? process.env.URL_AGENT_USER_AGENT ?? `url-intelligence-agent/${PROJECT.version} (+https://github.com/vpicciuolo/url-intelligence-agent; https://horno.net)`;
  const started = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // Preflight validation catches obvious unsafe destinations. The custom
    // dispatcher then independently validates the DNS answer used by the
    // socket itself, closing the DNS-rebinding/TOCTOU gap.
    current = (await assertPublicUrl(current)).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        method: opts.method || "GET",
        redirect: "manual",
        dispatcher: GUARDED_DISPATCHER,
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
        await res.body?.cancel();
        const next = (await assertPublicUrl(new URL(loc, current).toString())).toString();
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
