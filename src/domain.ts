import { resolve4, resolve6, resolveMx, resolveNs, resolveTxt, resolveCaa } from "node:dns/promises";
import { connect } from "node:tls";
import { assertPublicUrl, safeFetch } from "./net.js";

export type DomainIntelligence = {
  hostname: string;
  dns: { a: string[]; aaaa: string[]; mx: { exchange: string; priority: number }[]; ns: string[]; txt: string[][]; caa: unknown[] };
  mail: {
    spf: string[];
    dmarc: string[];
    providers: string[];
    mtaSts: string[];
    tlsRpt: string[];
    bimi: string[];
    assessment: {
      spfPresent: boolean;
      dmarcPresent: boolean;
      dmarcPolicy?: string;
      mtaStsPresent: boolean;
      tlsRptPresent: boolean;
      bimiPresent: boolean;
    };
  };
  tls?: {
    authorized: boolean;
    protocol?: string | null;
    cipher?: string;
    validFrom?: string;
    validTo?: string;
    daysRemaining?: number;
    issuer?: string;
    subject?: string;
    altNames?: string[];
  };
  rdap?: {
    fetched: boolean;
    status?: number;
    handle?: string;
    registrar?: string;
    statuses?: string[];
    nameservers?: string[];
    events?: { action?: string; date?: string }[];
    error?: string;
  };
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
      const validTo = cert.valid_to;
      const expiry = validTo ? Date.parse(validTo) : NaN;
      resolve({
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        cipher: cipher?.name,
        validFrom: cert.valid_from,
        validTo,
        daysRemaining: Number.isFinite(expiry) ? Math.floor((expiry - Date.now()) / 86_400_000) : undefined,
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

function registrarName(entities: unknown): string | undefined {
  if (!Array.isArray(entities)) return undefined;
  for (const entity of entities) {
    if (!entity || typeof entity !== "object") continue;
    const record = entity as Record<string, any>;
    if (!Array.isArray(record.roles) || !record.roles.includes("registrar")) continue;
    const vcard = record.vcardArray;
    const rows = Array.isArray(vcard) && Array.isArray(vcard[1]) ? vcard[1] : [];
    const fn = rows.find((row: any) => Array.isArray(row) && row[0] === "fn");
    if (fn?.[3]) return String(fn[3]);
    if (record.handle) return String(record.handle);
  }
  return undefined;
}

async function rdapInfo(hostname: string): Promise<DomainIntelligence["rdap"]> {
  if (process.env.URL_AGENT_RDAP === "false") return { fetched: false, error: "RDAP disabled by configuration" };
  try {
    const response = await safeFetch(`https://rdap.org/domain/${encodeURIComponent(hostname)}`, { timeoutMs: 9000, maxBytes: 1_500_000, maxRedirects: 5 });
    if (response.status < 200 || response.status >= 400) return { fetched: false, status: response.status, error: `RDAP returned HTTP ${response.status}` };
    const data = JSON.parse(response.text) as Record<string, any>;
    return {
      fetched: true,
      status: response.status,
      handle: data.handle ? String(data.handle) : undefined,
      registrar: registrarName(data.entities),
      statuses: Array.isArray(data.status) ? data.status.map(String).slice(0, 30) : [],
      nameservers: Array.isArray(data.nameservers) ? data.nameservers.map((x: any) => String(x.ldhName || x.unicodeName || "")).filter(Boolean).slice(0, 30) : [],
      events: Array.isArray(data.events) ? data.events.map((x: any) => ({ action: x.eventAction ? String(x.eventAction) : undefined, date: x.eventDate ? String(x.eventDate) : undefined })).slice(0, 30) : []
    };
  } catch (error) {
    return { fetched: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function dmarcPolicy(records: string[]): string | undefined {
  const source = records.join(";");
  return source.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\b/i)?.[1]?.toLowerCase();
}

export async function inspectDomain(rawUrl: string): Promise<DomainIntelligence> {
  const url = await assertPublicUrl(rawUrl);
  const hostname = url.hostname;
  const [a, aaaa, mx, ns, txt, caa, tls, mtaStsRows, tlsRptRows, bimiRows, rdap] = await Promise.all([
    safe(() => resolve4(hostname), [] as string[]),
    safe(() => resolve6(hostname), [] as string[]),
    safe(() => resolveMx(hostname), [] as { exchange: string; priority: number }[]),
    safe(() => resolveNs(hostname), [] as string[]),
    safe(() => resolveTxt(hostname), [] as string[][]),
    safe(() => resolveCaa(hostname), [] as unknown[]),
    url.protocol === "https:" ? tlsInfo(hostname) : Promise.resolve(undefined),
    safe(() => resolveTxt(`_mta-sts.${hostname}`), [] as string[][]),
    safe(() => resolveTxt(`_smtp._tls.${hostname}`), [] as string[][]),
    safe(() => resolveTxt(`default._bimi.${hostname}`), [] as string[][]),
    rdapInfo(hostname)
  ]);
  const spf = txt.flat().filter(x => /^v=spf1\b/i.test(x));
  const dmarc = await safe(() => resolveTxt(`_dmarc.${hostname}`), [] as string[][]).then(x => x.flat().filter(v => /^v=dmarc1\b/i.test(v)));
  const mtaSts = mtaStsRows.flat().filter(x => /^v=stsv1\b/i.test(x));
  const tlsRpt = tlsRptRows.flat().filter(x => /^v=tlsrptv1\b/i.test(x));
  const bimi = bimiRows.flat().filter(x => /^v=bimi1\b/i.test(x));
  return {
    hostname,
    dns: { a, aaaa, mx, ns, txt, caa },
    mail: {
      spf,
      dmarc,
      providers: providerHints(mx, txt),
      mtaSts,
      tlsRpt,
      bimi,
      assessment: {
        spfPresent: spf.length > 0,
        dmarcPresent: dmarc.length > 0,
        dmarcPolicy: dmarcPolicy(dmarc),
        mtaStsPresent: mtaSts.length > 0,
        tlsRptPresent: tlsRpt.length > 0,
        bimiPresent: bimi.length > 0
      }
    },
    tls,
    rdap
  };
}
