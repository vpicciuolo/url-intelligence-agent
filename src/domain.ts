import { resolve4, resolve6, resolveMx, resolveNs, resolveTxt, resolveCaa } from "node:dns/promises";
import { connect } from "node:tls";
import { assertPublicUrl } from "./net.js";

export type DomainIntelligence = {
  hostname: string;
  dns: { a: string[]; aaaa: string[]; mx: { exchange: string; priority: number }[]; ns: string[]; txt: string[][]; caa: unknown[] };
  mail: { spf: string[]; dmarc: string[]; providers: string[] };
  tls?: { authorized: boolean; protocol?: string | null; cipher?: string; validFrom?: string; validTo?: string; issuer?: string; subject?: string; altNames?: string[] };
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> { try { return await fn(); } catch { return fallback; } }

function providerHints(mx: { exchange: string }[], txt: string[][]): string[] {
  const haystack = `${mx.map(x => x.exchange).join(" ")} ${txt.flat().join(" ")}`.toLowerCase();
  const hits: string[] = [];
  const patterns: [string, RegExp][] = [["Google Workspace", /google\.com|googlemail\.com|_spf\.google/], ["Microsoft 365", /outlook\.com|protection\.outlook\.com|spf\.protection\.outlook/], ["Zoho Mail", /zoho\./], ["Mailgun", /mailgun\./], ["SendGrid", /sendgrid\./], ["Amazon SES", /amazonses\.com/], ["Proton Mail", /protonmail|proton\.me/], ["Cloudflare", /cloudflare/]];
  for (const [name, re] of patterns) if (re.test(haystack)) hits.push(name);
  return hits;
}

function certText(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.join(", ") || undefined;
  return value || undefined;
}

async function tlsInfo(hostname: string, port = 443): Promise<DomainIntelligence["tls"]> {
  return new Promise(resolve => {
    const socket = connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false, timeout: 6000 }, () => {
      const cert = socket.getPeerCertificate();
      const cipher = socket.getCipher();
      const altNames = typeof cert.subjectaltname === "string" ? cert.subjectaltname.split(",").map(x => x.trim().replace(/^DNS:/, "")) : [];
      resolve({
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        cipher: cipher?.name,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        issuer: certText(cert.issuer?.O) || certText(cert.issuer?.CN),
        subject: certText(cert.subject?.CN),
        altNames
      });
      socket.end();
    });
    socket.on("timeout", () => { socket.destroy(); resolve(undefined); });
    socket.on("error", () => resolve(undefined));
  });
}

export async function inspectDomain(rawUrl: string): Promise<DomainIntelligence> {
  const url = await assertPublicUrl(rawUrl);
  const hostname = url.hostname;
  const [a, aaaa, mx, ns, txt, caa, tls] = await Promise.all([
    safe(() => resolve4(hostname), [] as string[]),
    safe(() => resolve6(hostname), [] as string[]),
    safe(() => resolveMx(hostname), [] as { exchange: string; priority: number }[]),
    safe(() => resolveNs(hostname), [] as string[]),
    safe(() => resolveTxt(hostname), [] as string[][]),
    safe(() => resolveCaa(hostname), [] as unknown[]),
    url.protocol === "https:" ? tlsInfo(hostname) : Promise.resolve(undefined)
  ]);
  const spf = txt.flat().filter(x => /^v=spf1\b/i.test(x));
  const dmarc = await safe(() => resolveTxt(`_dmarc.${hostname}`), [] as string[][]).then(x => x.flat().filter(v => /^v=dmarc1\b/i.test(v)));
  return { hostname, dns: { a, aaaa, mx, ns, txt, caa }, mail: { spf, dmarc, providers: providerHints(mx, txt) }, tls };
}
