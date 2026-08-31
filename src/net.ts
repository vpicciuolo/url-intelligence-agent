import { lookup } from "node:dns/promises";
import net from "node:net";

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./, /^0\./
];

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return PRIVATE_V4.some(r => r.test(ip));
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80:");
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http/https URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) throw new Error("Localhost is blocked");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private/reserved IP blocked");
  } else {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(a => isPrivateIp(a.address))) throw new Error("Private/reserved destination blocked");
  }
  return url;
}

export async function safeFetch(raw: string, opts: {timeoutMs?: number; maxBytes?: number; userAgent?: string} = {}): Promise<{url:string; status:number; headers:Headers; text:string}> {
  let current = (await assertPublicUrl(raw)).toString();
  const timeoutMs = opts.timeoutMs ?? Number(process.env.URL_AGENT_TIMEOUT_MS || 8000);
  const maxBytes = opts.maxBytes ?? Number(process.env.URL_AGENT_MAX_BYTES || 2_500_000);
  const userAgent = opts.userAgent ?? process.env.URL_AGENT_USER_AGENT ?? "url-intelligence-agent/0.1.0 (+https://github.com/vpicciuolo/url-intelligence-agent)";

  for (let hop = 0; hop < 6; hop++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, { redirect: "manual", signal: controller.signal, headers: {"user-agent": userAgent, "accept": "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5"} });
      if ([301,302,303,307,308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error("Redirect without location");
        current = new URL(loc, current).toString();
        continue;
      }
      const reader = res.body?.getReader();
      if (!reader) return {url: current, status: res.status, headers: res.headers, text: ""};
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
        chunks.push(value);
      }
      const all = new Uint8Array(total); let pos = 0;
      for (const c of chunks) { all.set(c, pos); pos += c.length; }
      return {url: current, status: res.status, headers: res.headers, text: new TextDecoder().decode(all)};
    } finally { clearTimeout(timer); }
  }
  throw new Error("Too many redirects");
}
