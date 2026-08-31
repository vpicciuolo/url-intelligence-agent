import type { JsonValue, PageSignal } from "./types.js";
import type { SafeFetchResult } from "./net.js";

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .trim();
}

function stripTags(value: string): string {
  return decode(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function one(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m?.[1] ? decode(m[1]) : undefined;
}

function all(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map(m => decode(m[1] || "")).filter(Boolean);
}

function absolute(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try { return new URL(value, base).toString(); } catch { return undefined; }
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([:\w-]+)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/g)) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? "");
  }
  return attrs;
}

function parseMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(m[0]);
    const key = (attrs.name || attrs.property || attrs["http-equiv"] || attrs.itemprop || "").toLowerCase();
    if (key && attrs.content) out[key] = attrs.content;
  }
  return out;
}

function collectJsonLd(html: string): { types: string[]; documents: JsonValue[] } {
  const types: string[] = [];
  const documents: JsonValue[] = [];
  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    if (Array.isArray(type)) types.push(...type.map(String)); else if (type) types.push(String(type));
    if (record["@graph"]) walk(record["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]) as JsonValue;
      documents.push(parsed);
      walk(parsed);
    } catch { /* malformed JSON-LD is common; preserve fail-soft behavior */ }
  }
  return { types: unique(types), documents };
}

function normalizeSocial(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"]) u.searchParams.delete(key);
    if (u.hostname === "twitter.com") u.hostname = "x.com";
    return u.toString().replace(/\/$/, "");
  } catch { return url; }
}

export function parsePage(html: string, url: string, status = 200, fetchResult?: SafeFetchResult): PageSignal {
  const meta = parseMeta(html);
  const title = one(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || meta["og:title"] || meta["twitter:title"];
  const description = meta.description || meta["og:description"] || meta["twitter:description"];
  const canonical = absolute(one(html, /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']/i) || one(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']/i), url);
  const ogImage = absolute(meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"], url);
  const favicon = absolute(one(html, /<link[^>]+rel=["'][^"']*(?:icon|shortcut icon)[^"']*["'][^>]+href=["']([^"']+)["']/i) || one(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(?:icon|shortcut icon)[^"']*["']/i), url) || absolute("/favicon.ico", url);
  const language = one(html, /<html[^>]+lang=["']([^"']+)["']/i) || meta["content-language"];
  const robots = meta.robots;
  const headings = all(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).map(stripTags).filter(Boolean).slice(0, 50);
  const rawLinks = all(html, /<a[^>]+href=["']([^"']+)["']/gi);
  const links = unique(rawLinks.map(x => absolute(x, url)).filter((x): x is string => Boolean(x && /^https?:/i.test(x))));
  const socialPattern = /(x\.com|twitter\.com|linkedin\.com|instagram\.com|facebook\.com|youtube\.com|youtu\.be|tiktok\.com|github\.com|discord\.(gg|com)|threads\.net|snapchat\.com|pinterest\.[a-z.]+|t\.me|telegram\.me|mastodon|bsky\.app|medium\.com|reddit\.com)/i;
  const socials = unique(links.filter(x => socialPattern.test(x)).map(normalizeSocial));
  const emails = unique(
    all(html, /mailto:([^"'?\s<>]+)/gi)
      .concat(all(stripTags(html), /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi))
      .map(x => x.toLowerCase())
  ).slice(0, 100);
  const phones = unique(all(html, /tel:([^"'?<>]+)/gi).concat(all(stripTags(html), /(?:\+?\d[\d .()\-]{7,}\d)/g)).map(x => x.replace(/\s+/g, " ").trim())).slice(0, 50);
  const images = unique(all(html, /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi).map(x => absolute(x, url)).filter((x): x is string => Boolean(x))).slice(0, 200);
  const scripts = unique(all(html, /<script[^>]+src=["']([^"']+)["']/gi).map(x => absolute(x, url)).filter((x): x is string => Boolean(x))).slice(0, 200);
  const stylesheets = unique(all(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*stylesheet[^"']*["']/gi).concat(all(html, /<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]+href=["']([^"']+)["']/gi)).map(x => absolute(x, url)).filter((x): x is string => Boolean(x))).slice(0, 100);
  const jsonLd = collectJsonLd(html);
  const text = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " "));
  const textSample = text.slice(0, 20000);
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const forms = (html.match(/<form\b/gi) || []).length;
  const headers: Record<string, string> = {};
  if (fetchResult) fetchResult.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  return {
    url,
    status,
    title,
    description,
    canonical,
    ogImage,
    favicon,
    language,
    robots,
    jsonLdTypes: jsonLd.types,
    jsonLd: jsonLd.documents,
    headings,
    socials,
    emails,
    phones,
    links,
    images,
    scripts,
    stylesheets,
    forms,
    wordCount,
    textSample,
    meta,
    headers,
    trace: fetchResult?.trace
  };
}

export function classifyImportant(url: string): string | undefined {
  let p = "";
  try { p = new URL(url).pathname.toLowerCase(); } catch { return undefined; }
  const checks: [string, RegExp][] = [
    ["about", /(?:^|\/)(about(?:-us)?|company|who-we-are|mission|story)(?:\/|$)/],
    ["contact", /(?:^|\/)(contact(?:-us)?|support|help)(?:\/|$)/],
    ["team", /(?:^|\/)(team|people|leadership|management|founders?)(?:\/|$)/],
    ["pricing", /(?:^|\/)(pricing|plans|subscriptions?)(?:\/|$)/],
    ["product", /(?:^|\/)(product|products|features|solutions|services|platform)(?:\/|$)/],
    ["customers", /(?:^|\/)(customers?|clients?|case-studies|stories)(?:\/|$)/],
    ["partners", /(?:^|\/)(partners?|integrations?|ecosystem)(?:\/|$)/],
    ["careers", /(?:^|\/)(careers?|jobs?|join-us)(?:\/|$)/],
    ["blog", /(?:^|\/)(blog|news|press|media)(?:\/|$)/],
    ["docs", /(?:^|\/)(docs?|documentation|developers?|api|guides?)(?:\/|$)/],
    ["security", /(?:^|\/)(security|trust|compliance)(?:\/|$)/],
    ["legal", /(?:^|\/)(privacy|terms|legal|imprint|cookies?)(?:\/|$)/]
  ];
  return checks.find(([, re]) => re.test(p))?.[0];
}

export function pagePriority(url: string): number {
  const kind = classifyImportant(url);
  const scores: Record<string, number> = { about: 100, contact: 95, team: 92, product: 90, pricing: 88, security: 84, docs: 80, partners: 76, customers: 72, blog: 50, careers: 45, legal: 40 };
  let score = kind ? scores[kind] || 50 : 10;
  try {
    const u = new URL(url);
    const depth = u.pathname.split("/").filter(Boolean).length;
    score -= Math.min(depth * 3, 20);
    if (/\.(pdf|zip|jpg|jpeg|png|gif|svg|webp|mp4|mp3|css|js|xml)$/i.test(u.pathname)) score -= 100;
    if (u.search.length > 100) score -= 15;
  } catch { score = -100; }
  return score;
}
