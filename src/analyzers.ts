import { createHash } from "node:crypto";
import type { AuditResult, BrandProfile, CompetitorCandidate, EntityGraph, IntelligenceResult, PageSignal, RagDocument, TechnologySignal } from "./types.js";

const unique = <T>(items: T[]): T[] => [...new Set(items)];
const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function detectTechnologies(pages: PageSignal[]): TechnologySignal[] {
  const hits = new Map<string, TechnologySignal>();
  const add = (name: string, category: string, confidence: number, evidence: string, version?: string) => {
    const current = hits.get(name);
    if (!current) hits.set(name, { name, category, confidence, evidence: [evidence], version });
    else {
      current.confidence = Math.min(0.99, 1 - (1 - current.confidence) * (1 - confidence));
      current.evidence = unique([...current.evidence, evidence]);
      if (!current.version && version) current.version = version;
    }
  };
  for (const page of pages) {
    const haystack = `${page.textSample}\n${page.scripts.join("\n")}\n${page.stylesheets.join("\n")}`;
    const headers = page.headers;
    const generator = page.meta.generator || "";
    const patterns: [string, string, RegExp, number][] = [
      ["Next.js", "framework", /\/_next\/|__NEXT_DATA__|next\/static/i, 0.92],
      ["Nuxt", "framework", /\/_nuxt\/|__NUXT__/i, 0.92],
      ["React", "framework", /react(?:\.production)?\.min\.js|data-reactroot|__REACT/i, 0.7],
      ["Vue.js", "framework", /vue(?:\.runtime)?(?:\.global)?(?:\.prod)?\.js|data-v-[a-f0-9]/i, 0.72],
      ["Angular", "framework", /ng-version=|angular(?:\.min)?\.js/i, 0.9],
      ["Svelte", "framework", /svelte-[a-z0-9]+|sveltekit/i, 0.75],
      ["WordPress", "cms", /wp-content|wp-includes|wordpress/i, 0.96],
      ["Shopify", "ecommerce", /cdn\.shopify\.com|Shopify\.theme|shopify-section/i, 0.97],
      ["WooCommerce", "ecommerce", /woocommerce|wc-block/i, 0.94],
      ["Webflow", "site-builder", /webflow\.js|webflow\.com/i, 0.95],
      ["Wix", "site-builder", /wixstatic\.com|wix-code/i, 0.95],
      ["Squarespace", "site-builder", /static1\.squarespace\.com|squarespace/i, 0.94],
      ["Framer", "site-builder", /framerusercontent\.com|framer\.com\/m\//i, 0.9],
      ["Google Analytics", "analytics", /googletagmanager\.com\/gtag\/js|google-analytics\.com/i, 0.96],
      ["Google Tag Manager", "tag-manager", /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i, 0.97],
      ["Meta Pixel", "analytics", /connect\.facebook\.net\/.*\/fbevents\.js|fbq\(/i, 0.95],
      ["Hotjar", "analytics", /static\.hotjar\.com|hotjar/i, 0.94],
      ["Stripe", "payments", /js\.stripe\.com|stripe-js|stripe\.com\/v3/i, 0.97],
      ["Intercom", "support", /widget\.intercom\.io|intercomSettings/i, 0.95],
      ["HubSpot", "crm", /js\.hs-scripts\.com|hubspot/i, 0.94],
      ["Cloudflare", "cdn-security", /cloudflare|cdnjs\.cloudflare\.com/i, 0.75],
      ["Vercel", "hosting", /vercel-insights|vercel\.app/i, 0.75],
      ["Netlify", "hosting", /netlify\.app|netlify-identity/i, 0.8]
    ];
    for (const [name, category, re, confidence] of patterns) if (re.test(haystack)) add(name, category, confidence, page.url);
    if (/wordpress/i.test(generator)) add("WordPress", "cms", 0.99, `${page.url} meta generator`, generator.match(/[\d.]+/)?.[0]);
    if (headers.server) {
      if (/cloudflare/i.test(headers.server)) add("Cloudflare", "cdn-security", 0.96, `${page.url} server header`);
      if (/nginx/i.test(headers.server)) add("Nginx", "web-server", 0.88, `${page.url} server header`, headers.server.match(/[\d.]+/)?.[0]);
      if (/apache/i.test(headers.server)) add("Apache", "web-server", 0.88, `${page.url} server header`, headers.server.match(/[\d.]+/)?.[0]);
    }
    if (headers["x-powered-by"]) add(headers["x-powered-by"].split("/")[0], "runtime", 0.85, `${page.url} x-powered-by`, headers["x-powered-by"].split("/")[1]);
    if (headers["x-vercel-id"]) add("Vercel", "hosting", 0.99, `${page.url} x-vercel-id`);
  }
  return [...hits.values()].sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

export function extractBrand(pages: PageSignal[]): BrandProfile {
  const root = pages[0];
  const colors: string[] = [];
  const taglines: string[] = [];
  for (const page of pages.slice(0, 10)) {
    for (const match of page.textSample.matchAll(/#[0-9a-fA-F]{6}\b/g)) colors.push(match[0].toLowerCase());
    const theme = page.meta["theme-color"];
    if (theme && /^#[0-9a-f]{3,8}$/i.test(theme)) colors.push(theme.toLowerCase());
    if (page.description && page.description.length <= 180) taglines.push(page.description);
  }
  const logos = unique(pages.flatMap(page => page.images.filter(url => /logo|brand|mark/i.test(url))).concat(root?.ogImage ? [root.ogImage] : [])).slice(0, 20);
  const favicons = unique(pages.map(x => x.favicon).filter((x): x is string => Boolean(x))).slice(0, 10);
  const socialProfiles = unique(pages.flatMap(x => x.socials));
  const handles = unique(socialProfiles.map(url => { try { const u = new URL(url); return u.pathname.split("/").filter(Boolean)[0] || u.hostname; } catch { return url; } })).slice(0, 30);
  return { name: root?.title?.split(/[|·—–-]/)[0]?.trim(), logos, favicons, colors: unique(colors).slice(0, 12), socialProfiles, handles, taglines: unique(taglines).slice(0, 10) };
}

export function auditSeo(root: PageSignal, pages: PageSignal[], sitemapUrls: string[]): AuditResult {
  let score = 100;
  const issues: string[] = [];
  const warnings: string[] = [];
  const penalize = (condition: boolean, message: string, points: number) => { if (condition) { issues.push(message); score -= points; } };
  penalize(!root.title, "Missing <title>", 18);
  penalize(!root.description, "Missing meta description", 12);
  penalize(!root.canonical, "Missing canonical URL", 8);
  penalize(!root.ogImage, "Missing social preview image (og:image)", 7);
  penalize(!root.meta["og:title"], "Missing og:title", 4);
  penalize(!root.meta["og:description"], "Missing og:description", 4);
  penalize(!root.headings.length, "No H1-H3 headings detected", 8);
  penalize(!root.jsonLdTypes.length, "No JSON-LD structured data detected", 7);
  penalize(!sitemapUrls.length, "No sitemap URLs discovered", 5);
  if (root.title && (root.title.length < 15 || root.title.length > 70)) { warnings.push("Title length is outside common search-snippet range"); score -= 3; }
  if (root.description && (root.description.length < 50 || root.description.length > 180)) { warnings.push("Meta description length is outside common range"); score -= 3; }
  if (/noindex/i.test(root.robots || "")) { issues.push("Homepage contains noindex directive"); score -= 25; }
  const canonicalMismatch = Boolean(root.canonical && new URL(root.canonical).hostname !== new URL(root.url).hostname);
  if (canonicalMismatch) warnings.push("Canonical points to another hostname");
  const duplicateTitles = pages.map(x => x.title).filter(Boolean).reduce<Record<string, number>>((m, t) => { m[t as string] = (m[t as string] || 0) + 1; return m; }, {});
  const duplicates = Object.values(duplicateTitles).filter(n => n > 1).length;
  if (duplicates) warnings.push(`${duplicates} duplicate page-title group(s) detected in crawl sample`);
  return { score: clamp(score), issues, warnings, checks: { title: Boolean(root.title), description: Boolean(root.description), canonical: Boolean(root.canonical), openGraph: Boolean(root.meta["og:title"] || root.meta["og:description"]), socialImage: Boolean(root.ogImage), structuredData: root.jsonLdTypes.length > 0, sitemapUrls: sitemapUrls.length, crawledPages: pages.length, duplicateTitleGroups: duplicates, noindex: /noindex/i.test(root.robots || "") } };
}

export function auditSecurity(root: PageSignal): AuditResult {
  let score = 100;
  const issues: string[] = [];
  const warnings: string[] = [];
  const headers = root.headers;
  const checks: Record<string, boolean | number | string> = {};
  const require = (header: string, points: number, friendly: string) => {
    const present = Boolean(headers[header]); checks[header] = present;
    if (!present) { warnings.push(`Missing ${friendly} response header`); score -= points; }
  };
  const https = new URL(root.url).protocol === "https:";
  checks.https = https;
  if (!https) { issues.push("Site is not using HTTPS"); score -= 35; }
  require("strict-transport-security", 10, "HSTS");
  require("content-security-policy", 10, "Content-Security-Policy");
  require("x-content-type-options", 5, "X-Content-Type-Options");
  require("referrer-policy", 5, "Referrer-Policy");
  require("permissions-policy", 3, "Permissions-Policy");
  const frameProtected = Boolean(headers["x-frame-options"] || headers["content-security-policy"]?.includes("frame-ancestors"));
  checks.frameProtection = frameProtected;
  if (!frameProtected) { warnings.push("No clickjacking/frame-ancestor protection detected"); score -= 5; }
  const serverLeak = headers.server || headers["x-powered-by"];
  if (serverLeak) warnings.push(`Technology disclosure header detected: ${serverLeak}`);
  return { score: clamp(score), issues, warnings, checks };
}

export function auditQuality(root: PageSignal): AuditResult {
  let score = 100;
  const issues: string[] = [];
  const warnings: string[] = [];
  const htmlLang = Boolean(root.language);
  if (!htmlLang) { warnings.push("Missing html lang attribute"); score -= 8; }
  if (!root.headings.length) { issues.push("No semantic headings detected"); score -= 12; }
  if (root.wordCount < 80) { warnings.push("Very little indexable text detected on the page"); score -= 10; }
  if (root.trace && root.trace.elapsedMs > 3000) { warnings.push(`Slow initial response observed (${root.trace.elapsedMs} ms)`); score -= 8; }
  const imageCount = root.images.length;
  const forms = root.forms;
  const brokenSignals = root.status >= 400;
  if (brokenSignals) { issues.push(`Homepage returned HTTP ${root.status}`); score -= 40; }
  return { score: clamp(score), issues, warnings, checks: { language: htmlLang, wordCount: root.wordCount, headings: root.headings.length, images: imageCount, forms, rendered: Boolean(root.rendered), responseMs: root.trace?.elapsedMs || 0, status: root.status } };
}

export function auditTrust(root: PageSignal, pages: PageSignal[], important: Record<string, string>, socials: string[], emails: string[]): AuditResult {
  let score = 45;
  const issues: string[] = [];
  const warnings: string[] = [];
  const add = (condition: boolean, points: number) => { if (condition) score += points; };
  add(new URL(root.url).protocol === "https:", 10);
  add(Boolean(important.about), 8);
  add(Boolean(important.contact), 8);
  add(Boolean(important.legal), 6);
  add(Boolean(important.security), 5);
  add(Boolean(socials.length), 5);
  add(Boolean(emails.length), 5);
  add(Boolean(root.jsonLdTypes.length), 5);
  add(pages.length >= 5, 3);
  if (!important.contact && !emails.length) warnings.push("No public contact route found in crawl sample");
  if (!important.legal) warnings.push("No privacy/terms/legal page classified");
  if (/free money|guaranteed return|double your|act now!!!/i.test(root.textSample)) { warnings.push("High-pressure/promotional language signal detected; manual review recommended"); score -= 15; }
  return { score: clamp(score), issues, warnings, checks: { https: new URL(root.url).protocol === "https:", about: Boolean(important.about), contact: Boolean(important.contact), legal: Boolean(important.legal), securityPage: Boolean(important.security), socials: socials.length, publicEmails: emails.length, structuredData: root.jsonLdTypes.length } };
}

export function buildEntityGraph(result: Pick<IntelligenceResult, "finalUrl" | "entity" | "pages" | "socials" | "contacts" | "technologies" | "importantPages">): EntityGraph {
  const nodes: EntityGraph["nodes"] = [];
  const edges: EntityGraph["edges"] = [];
  const entityId = `entity:${createHash("sha1").update(result.finalUrl).digest("hex").slice(0, 12)}`;
  nodes.push({ id: entityId, type: result.entity.type.value, label: result.entity.name.value, url: result.finalUrl, confidence: result.entity.name.confidence });
  const addLinked = (id: string, type: string, label: string, url: string | undefined, relation: string, confidence: number, evidence: string[]) => {
    if (!nodes.some(n => n.id === id)) nodes.push({ id, type, label, url, confidence });
    edges.push({ from: entityId, to: id, type: relation, confidence, evidence });
  };
  for (const social of result.socials) addLinked(`social:${social}`, "social-profile", social, social, "has_social_profile", 0.9, [result.finalUrl]);
  for (const email of result.contacts.emails) addLinked(`email:${email}`, "public-email", email, undefined, "has_public_contact", 0.85, result.pages.filter(p => p.emails.includes(email)).map(p => p.url));
  for (const phone of result.contacts.phones) addLinked(`phone:${phone}`, "public-phone", phone, undefined, "has_public_contact", 0.8, result.pages.filter(p => p.phones.includes(phone)).map(p => p.url));
  for (const tech of result.technologies) addLinked(`tech:${tech.name}`, "technology", tech.name, undefined, "uses_technology", tech.confidence, tech.evidence);
  for (const [kind, url] of Object.entries(result.importantPages)) addLinked(`page:${url}`, "page", kind, url, `has_${kind}_page`, 0.95, [url]);
  return { nodes, edges };
}

export function discoverCompetitors(pages: PageSignal[]): CompetitorCandidate[] {
  const candidates = new Map<string, CompetitorCandidate>();
  const rootHost = new URL(pages[0].url).hostname.replace(/^www\./, "");
  for (const page of pages) {
    const context = `${page.title || ""} ${page.description || ""} ${page.textSample}`.toLowerCase();
    const comparisonPage = /alternatives?|compare|comparison|versus|\bvs\b|competitors?/.test(context) || /alternatives?|compare|versus|\bvs\b/i.test(page.url);
    if (!comparisonPage) continue;
    for (const link of page.links) {
      try {
        const u = new URL(link);
        const host = u.hostname.replace(/^www\./, "");
        if (host === rootHost || /facebook|instagram|linkedin|x\.com|twitter|youtube|tiktok|github/.test(host)) continue;
        const current = candidates.get(host);
        const item: CompetitorCandidate = { name: host.split(".")[0], url: u.origin, confidence: 0.55, reason: "Linked from a comparison/alternatives context", evidence: [page.url] };
        if (!current) candidates.set(host, item); else { current.confidence = Math.min(0.9, current.confidence + 0.08); current.evidence = unique([...current.evidence, page.url]); }
      } catch { /* ignore */ }
    }
  }
  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 30);
}

export function buildRagDocuments(pages: PageSignal[]): RagDocument[] {
  return pages.filter(p => p.textSample.length > 40).map(page => {
    const text = page.textSample.replace(/\s+/g, " ").trim();
    const checksum = createHash("sha256").update(text).digest("hex");
    return { id: `url:${checksum.slice(0, 20)}`, url: page.url, title: page.title, text, wordCount: page.wordCount, checksum, metadata: { status: page.status, language: page.language || "", canonical: page.canonical || page.url, jsonLdTypes: page.jsonLdTypes } };
  });
}

export function profileCompleteness(result: IntelligenceResult): number {
  const points = [result.entity.name.value, result.entity.description?.value, result.brand.logos[0], result.socials[0], result.contacts.emails[0] || result.contacts.phones[0], result.importantPages.about, result.importantPages.contact, result.technologies[0]?.name];
  return Math.round(points.filter(Boolean).length / points.length * 100);
}
