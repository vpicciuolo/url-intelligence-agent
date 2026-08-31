import { probeUrl } from "./net.js";
import type { IntelligenceResult, JsonValue, PageSignal } from "./types.js";

const unique = <T>(items: T[]): T[] => [...new Set(items)];

export function structuredDataInventory(pages: PageSignal[]) {
  return pages.flatMap(page => page.jsonLd.map(document => ({ url: page.url, types: page.jsonLdTypes, document })));
}

export function discoverApiSurfaces(pages: PageSignal[]) {
  const urls = unique(pages.flatMap(p => p.links.concat(p.scripts)).filter(url => /(?:openapi|swagger|graphql|\/api(?:\/|$)|developers?|docs?|\.well-known)/i.test(url))).slice(0, 100);
  return urls.map(url => ({ url, kind: /openapi/i.test(url) ? "openapi" : /swagger/i.test(url) ? "swagger" : /graphql/i.test(url) ? "graphql" : /\.well-known/i.test(url) ? "well-known" : /docs?|developer/i.test(url) ? "developer-docs" : "api" }));
}

export function complianceSignals(result: IntelligenceResult) {
  const text = result.pages.map(p => p.textSample).join(" ").toLowerCase();
  const pages = result.importantPages;
  return {
    privacyPolicy: pages.legal || result.pages.find(p => /privacy/i.test(p.url))?.url,
    terms: result.pages.find(p => /terms|conditions/i.test(p.url))?.url,
    cookiePolicy: result.pages.find(p => /cookie/i.test(p.url))?.url,
    consentLanguage: /cookie consent|manage cookies|accept cookies|privacy preferences|consent preferences/.test(text),
    gdprLanguage: /\bgdpr\b|general data protection regulation|data subject|right to erasure/.test(text),
    ccpaLanguage: /\bccpa\b|do not sell or share my personal information/.test(text),
    accessibilityStatement: result.pages.find(p => /accessibility/i.test(p.url))?.url,
    securityPage: pages.security,
    trustCenter: result.pages.find(p => /trust(?:-center)?/i.test(p.url))?.url,
    disclaimer: "Presence of public policy language is a discovery signal, not a compliance determination."
  };
}

export function extractPeople(pages: PageSignal[]) {
  const people: { name: string; jobTitle?: string; url?: string; image?: string; source: string }[] = [];
  const walk = (value: unknown, source: string) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(x => walk(x, source)); return; }
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"]) ? record["@type"].map(String) : [String(record["@type"] || "")];
    if (types.some(x => /person/i.test(x)) && typeof record.name === "string") people.push({ name: record.name, jobTitle: typeof record.jobTitle === "string" ? record.jobTitle : undefined, url: typeof record.url === "string" ? record.url : undefined, image: typeof record.image === "string" ? record.image : undefined, source });
    for (const child of Object.values(record)) if (child && typeof child === "object") walk(child, source);
  };
  pages.forEach(page => page.jsonLd.forEach(doc => walk(doc, page.url)));
  const seen = new Set<string>();
  return people.filter(p => { const key = `${p.name.toLowerCase()}|${(p.jobTitle || "").toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 100);
}

export function extractCommerceSignals(pages: PageSignal[]) {
  const text = pages.slice(0, 15).map(p => p.textSample).join(" ");
  const prices = unique([...text.matchAll(/(?:USD|EUR|GBP|AED|\$|€|£)\s?\d{1,6}(?:[.,]\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?\s?(?:USD|EUR|GBP|AED)/gi)].map(m => m[0])).slice(0, 50);
  return {
    prices,
    hasPricingPage: Boolean(pages.find(p => /pricing|plans/i.test(p.url))),
    ecommerceLanguage: /add to cart|buy now|checkout|shopping cart|free shipping/i.test(text),
    subscriptionLanguage: /per month|monthly|annual plan|subscription|free trial/i.test(text),
    marketplaceLanguage: /marketplace|seller|buyer|vendor|gig|escrow/i.test(text)
  };
}

export function contentFreshness(pages: PageSignal[]) {
  const dates: { url: string; value: string; source: string }[] = [];
  for (const page of pages) {
    for (const key of ["article:published_time", "article:modified_time", "date", "datepublished", "datemodified", "last-modified"]) if (page.meta[key]) dates.push({ url: page.url, value: page.meta[key], source: `meta:${key}` });
    const header = page.headers["last-modified"];
    if (header) dates.push({ url: page.url, value: header, source: "http:last-modified" });
  }
  return dates.slice(0, 100);
}

export function linkIntelligence(pages: PageSignal[]) {
  const root = new URL(pages[0].url);
  const all = unique(pages.flatMap(p => p.links));
  const internal: string[] = [], external: string[] = [];
  for (const link of all) { try { (new URL(link).hostname === root.hostname ? internal : external).push(link); } catch { /* ignore */ } }
  const externalDomains = Object.entries(external.reduce<Record<string, number>>((acc, link) => { try { const host = new URL(link).hostname.replace(/^www\./, ""); acc[host] = (acc[host] || 0) + 1; } catch { /* ignore */ } return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, count }));
  return { total: all.length, internal, external, externalDomains };
}

export async function checkLinks(pages: PageSignal[], options: { limit?: number; external?: boolean; concurrency?: number } = {}) {
  const root = new URL(pages[0].url);
  const limit = Math.max(1, Math.min(300, options.limit || 50));
  const concurrency = Math.max(1, Math.min(20, options.concurrency || 5));
  const urls = unique(pages.flatMap(p => p.links)).filter(link => { try { return options.external !== false || new URL(link).hostname === root.hostname; } catch { return false; } }).slice(0, limit);
  const results: { url: string; ok: boolean; status?: number; finalUrl?: string; elapsedMs?: number; error?: string }[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    results.push(...await Promise.all(chunk.map(async url => ({ url, ...await probeUrl(url) }))));
  }
  return { checked: results.length, healthy: results.filter(x => x.ok).length, broken: results.filter(x => !x.ok), results };
}

export function exportKnowledge(result: IntelligenceResult): { entity: Record<string, JsonValue>; facts: { subject: string; predicate: string; object: JsonValue; confidence: number; sources: string[] }[] } {
  const facts: { subject: string; predicate: string; object: JsonValue; confidence: number; sources: string[] }[] = [];
  const subject = result.entity.name.value;
  facts.push({ subject, predicate: "type", object: result.entity.type.value, confidence: result.entity.type.confidence, sources: result.entity.type.sources });
  if (result.entity.description) facts.push({ subject, predicate: "description", object: result.entity.description.value, confidence: result.entity.description.confidence, sources: result.entity.description.sources });
  result.socials.forEach(url => facts.push({ subject, predicate: "socialProfile", object: url, confidence: 0.9, sources: result.pages.filter(p => p.socials.includes(url)).map(p => p.url) }));
  result.technologies.forEach(t => facts.push({ subject, predicate: "usesTechnology", object: t.name, confidence: t.confidence, sources: t.evidence }));
  return { entity: { name: subject, url: result.finalUrl, type: result.entity.type.value }, facts };
}
