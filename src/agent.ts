import { createHash } from "node:crypto";
import { PROJECT, projectMeta } from "./credits.js";
import { crawlSite } from "./crawler.js";
import { createCache, WorkerQueue } from "./adapters.js";
import { applyPluginEnrichers, listPlugins, runPluginAction } from "./plugins.js";
import { auditQuality, auditSecurity, auditSeo, auditTrust, buildEntityGraph, buildRagDocuments, detectTechnologies, discoverCompetitors, extractBrand, profileCompleteness } from "./analyzers.js";
import { createSnapshot, diffSnapshots, loadSnapshot, persistSnapshot, sendWebhook } from "./monitor.js";
import { reasonWithOpenAICompatible } from "./ai.js";
import { probeUrl } from "./net.js";
import { inspectDomain } from "./domain.js";
import { checkLinks, complianceSignals, contentFreshness, discoverApiSurfaces, exportKnowledge, extractCommerceSignals, extractPeople, linkIntelligence, structuredDataInventory } from "./extensions.js";
import { renderUrl } from "./render.js";
import type { CrawlPolicy, EvidenceField, IntelligenceResult, JsonValue, PageSignal, Snapshot } from "./types.js";

const cache = createCache();
const unique = <T>(items: T[]): T[] => [...new Set(items)];
function field<T>(value: T, confidence: number, method: string, sources: string[]): EvidenceField<T> { return { value, confidence: Math.max(0, Math.min(1, confidence)), method, sources: unique(sources) }; }

function visitObjects(value: unknown, fn: (record: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach(x => visitObjects(x, fn)); return; }
  const record = value as Record<string, unknown>; fn(record);
  for (const child of Object.values(record)) if (child && typeof child === "object") visitObjects(child, fn);
}

function identityCandidates(pages: PageSignal[]): { value: string; source: string; weight: number; method: string }[] {
  const out: { value: string; source: string; weight: number; method: string }[] = [];
  for (const page of pages) {
    for (const doc of page.jsonLd) visitObjects(doc, record => {
      const type = String(record["@type"] || ""); const name = typeof record.name === "string" ? record.name.trim() : "";
      if (name && /Organization|Corporation|Person|Product|Brand|WebSite|SoftwareApplication|LocalBusiness/i.test(type)) out.push({ value: name, source: page.url, weight: 1, method: "jsonld-name" });
    });
    if (page.meta["og:site_name"]) out.push({ value: page.meta["og:site_name"], source: page.url, weight: 0.92, method: "og-site-name" });
    if (page.title) out.push({ value: page.title.split(/[|·—–-]/)[0].trim(), source: page.url, weight: page === pages[0] ? 0.85 : 0.55, method: "page-title" });
  }
  return out.filter(x => x.value.length >= 2 && x.value.length <= 120);
}

function resolveName(pages: PageSignal[]): EvidenceField<string> {
  const grouped = new Map<string, { display: string; score: number; sources: string[]; methods: string[] }>();
  for (const candidate of identityCandidates(pages)) {
    const key = candidate.value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); if (!key) continue;
    const current = grouped.get(key) || { display: candidate.value, score: 0, sources: [], methods: [] };
    current.score += candidate.weight; current.sources.push(candidate.source); current.methods.push(candidate.method); grouped.set(key, current);
  }
  const best = [...grouped.values()].sort((a, b) => b.score - a.score)[0];
  if (best) return field(best.display, Math.min(0.99, 0.55 + best.score * 0.12), unique(best.methods).join("+"), best.sources);
  const host = new URL(pages[0].url).hostname.replace(/^www\./, ""); return field(host, 0.55, "hostname-fallback", [pages[0].url]);
}

function resolveType(pages: PageSignal[]): EvidenceField<string> {
  const types = pages.flatMap(x => x.jsonLdTypes).map(x => x.toLowerCase()); const source = pages.filter(p => p.jsonLdTypes.length).map(p => p.url);
  const mapping: [RegExp, string][] = [[/person/, "person"], [/musicgroup|performinggroup/, "creator"], [/product/, "product"], [/softwareapplication|mobileapplication|webapplication/, "software"], [/localbusiness/, "business"], [/organization|corporation|ngo|educationalorganization/, "organization"], [/event/, "event"], [/service/, "service"]];
  for (const [re, type] of mapping) if (types.some(x => re.test(x))) return field(type, 0.96, "jsonld-type", source);
  const text = pages.slice(0, 5).map(x => `${x.title || ""} ${x.description || ""} ${x.textSample.slice(0, 2500)}`).join(" ").toLowerCase();
  const heuristics: [RegExp, string, number][] = [[/\b(dj|musician|artist|creator|influencer|author|photographer|producer)\b/, "creator", 0.78], [/\b(startup|saas|software platform|developer tool|artificial intelligence|\bai\b platform)\b/, "startup", 0.76], [/\b(ecommerce|online store|shop now|add to cart)\b/, "commerce", 0.75], [/\b(nonprofit|foundation|association|organization)\b/, "organization", 0.7], [/\b(event|conference|festival|tickets)\b/, "event", 0.68], [/\b(product|buy now|pricing)\b/, "product", 0.62]];
  for (const [re, type, confidence] of heuristics) if (re.test(text)) return field(type, confidence, "content-heuristics", [pages[0].url]);
  return field("website", 0.58, "generic-fallback", [pages[0].url]);
}

function findDescription(pages: PageSignal[]): EvidenceField<string> | undefined {
  const primary = pages[0].description || pages.find(x => x.description)?.description; if (!primary) return undefined;
  return field(primary, pages[0].description === primary ? 0.92 : 0.78, "meta-description", pages.filter(p => p.description === primary).map(p => p.url));
}

function findContradictions(pages: PageSignal[], name: EvidenceField<string>): string[] {
  const out: string[] = []; const names = unique(identityCandidates(pages).filter(x => x.weight >= 0.85).map(x => x.value.toLowerCase()));
  if (names.length >= 3 && !names.some(x => x.includes(name.value.toLowerCase()) || name.value.toLowerCase().includes(x))) out.push("Multiple high-confidence identity names disagree across metadata sources.");
  const canonicals = unique(pages.map(x => x.canonical).filter((x): x is string => Boolean(x)));
  if (canonicals.some(x => { try { return new URL(x).hostname !== new URL(pages[0].url).hostname; } catch { return false; } })) out.push("At least one canonical URL points to a different hostname.");
  return out;
}

export type InvestigateOptions = { profile?: string; crawl?: Partial<CrawlPolicy>; force?: boolean };

export async function investigate(rawUrl: string, profileOrOptions: string | InvestigateOptions = process.env.URL_AGENT_PROFILE || "full-intelligence"): Promise<IntelligenceResult> {
  const options: InvestigateOptions = typeof profileOrOptions === "string" ? { profile: profileOrOptions } : profileOrOptions;
  const profile = options.profile || process.env.URL_AGENT_PROFILE || "full-intelligence";
  const cacheKey = `investigate:${rawUrl}:${profile}:${JSON.stringify(options.crawl || {})}`;
  if (!options.force) { const hit = await cache.get<IntelligenceResult>(cacheKey); if (hit) return hit; }
  const crawl = await crawlSite(rawUrl, options.crawl); const pages = crawl.pages; const root = pages[0]; if (!root) throw new Error("No page could be collected");
  const name = resolveName(pages); const type = resolveType(pages); const description = findDescription(pages);
  const socials = unique(pages.flatMap(p => p.socials)); const emails = unique(pages.flatMap(p => p.emails)); const phones = unique(pages.flatMap(p => p.phones));
  const technologies = detectTechnologies(pages); const brand = extractBrand(pages); const seo = auditSeo(root, pages, crawl.sitemapUrls); const security = auditSecurity(root); const quality = auditQuality(root); const trust = auditTrust(root, pages, crawl.importantPages, socials, emails); const competitorList = discoverCompetitors(pages); const rag = buildRagDocuments(pages);
  const contentFingerprint = createHash("sha256").update(rag.map(x => x.checksum).sort().join(":" )).digest("hex");
  const fingerprint = createHash("sha256").update(JSON.stringify({ finalUrl: root.url, name: name.value, type: type.value, socials: socials.sort(), contacts: [...emails, ...phones].sort(), importantPages: crawl.importantPages, technologies: technologies.map(x => x.name).sort(), contentFingerprint })).digest("hex");
  let result: IntelligenceResult = { meta: projectMeta(), inputUrl: rawUrl, finalUrl: root.url, profile, entity: { type, name, description }, seo, security, quality, trust, socials, contacts: { emails, phones }, importantPages: crawl.importantPages, pages, sitemapUrls: crawl.sitemapUrls, technologies, brand, graph: { nodes: [], edges: [] }, competitors: competitorList, rag, contradictions: findContradictions(pages, name), warnings: [...crawl.errors.map(x => `${x.url}: ${x.error}`), ...(crawl.robotsText ? [] : ["robots.txt was not available or could not be read"])].slice(0, 100), fingerprint, contentFingerprint, observedAt: new Date().toISOString() };
  result.graph = buildEntityGraph(result); result = await applyPluginEnrichers(result, { profile });
  if (process.env.URL_AGENT_AI_AUTO === "true") result.meta.ai = await reasonWithOpenAICompatible(result, "Produce a concise evidence-based intelligence summary and flag uncertainties.") as unknown as JsonValue;
  await cache.set(cacheKey, result, Number(process.env.URL_AGENT_CACHE_TTL_MS || 300000)); return result;
}

export function generateListing(result: IntelligenceResult) {
  const keywords = unique([result.entity.type.value, result.profile, ...result.technologies.slice(0, 8).map(x => x.name), ...result.pages[0].jsonLdTypes]).slice(0, 20);
  return { meta: result.meta, name: result.entity.name.value, tagline: result.brand.taglines[0] || result.entity.description?.value || "", description: result.entity.description?.value || result.brand.taglines[0] || "", category: result.entity.type.value, url: result.finalUrl, logo: result.brand.logos[0] || result.brand.favicons[0] || result.pages[0].ogImage, image: result.pages[0].ogImage, socials: result.socials, contacts: result.contacts, keywords, technologies: result.technologies.map(x => x.name), seoScore: result.seo.score, trustScore: result.trust.score, completeness: profileCompleteness(result), confidence: Math.min(result.entity.name.confidence, result.entity.type.confidence), evidence: unique([result.finalUrl, ...Object.values(result.importantPages), ...result.entity.name.sources]) };
}

export function compareResults(a: IntelligenceResult, b: IntelligenceResult) {
  const techA = a.technologies.map(x => x.name), techB = b.technologies.map(x => x.name);
  return { meta: a.meta, similar: { entityType: a.entity.type.value === b.entity.type.value, sharedSocials: a.socials.filter(x => b.socials.includes(x)), sharedEmails: a.contacts.emails.filter(x => b.contacts.emails.includes(x)), sharedTechnologies: techA.filter(x => techB.includes(x)), sameCanonicalHost: new URL(a.finalUrl).hostname === new URL(b.finalUrl).hostname }, a: { url: a.finalUrl, name: a.entity.name.value, type: a.entity.type.value, seo: a.seo.score, trust: a.trust.score, technologies: techA }, b: { url: b.finalUrl, name: b.entity.name.value, type: b.entity.type.value, seo: b.seo.score, trust: b.trust.score, technologies: techB } };
}

export async function runAction(name: string, args: Record<string, any>): Promise<unknown> {
  if (name.startsWith("plugin:")) { const [, plugin, action] = name.split(":"); return runPluginAction(plugin, action, args, { profile: args.profile }); }
  if (name === "probe_url") return probeUrl(args.url);
  if (name === "domain_intelligence") return { meta: projectMeta(), domain: await inspectDomain(args.url) };
  if (name === "render_page") { const rendered = await renderUrl(args.url); return { meta: projectMeta(), rendered: rendered ? { url: rendered.url, renderer: rendered.renderer, html: args.includeHtml === false ? undefined : rendered.html, screenshotBase64: rendered.screenshotBase64 } : null }; }
  if (name === "compare_urls") return compareResults(await investigate(args.url, args.profile), await investigate(args.url2, args.profile));
  if (name === "batch_investigate") { const urls = Array.isArray(args.urls) ? args.urls : []; const queue = new WorkerQueue(Number(args.concurrency || process.env.URL_AGENT_WORKER_CONCURRENCY || 4)); urls.forEach((url: string) => queue.add("investigate", { url, profile: args.profile })); return queue.run(async job => investigate((job.payload as any).url, (job.payload as any).profile)); }
  const result = await investigate(args.url, { profile: args.profile, force: Boolean(args.force), crawl: args.crawl });
  if (name === "investigate_url") return result;
  if (name === "map_site" || name === "deep_crawl") return { meta: result.meta, rootUrl: result.finalUrl, importantPages: result.importantPages, sitemapUrls: result.sitemapUrls, pages: result.pages };
  if (name === "resolve_entity") return { meta: result.meta, entity: result.entity, contradictions: result.contradictions, graph: result.graph };
  if (name === "find_social_profiles") return { meta: result.meta, socials: result.socials };
  if (name === "find_contacts") return { meta: result.meta, contacts: result.contacts, contactPage: result.importantPages.contact, people: extractPeople(result.pages) };
  if (name === "detect_technologies") return { meta: result.meta, technologies: result.technologies };
  if (name === "brand_intelligence") return { meta: result.meta, brand: result.brand };
  if (name === "audit_seo") return { meta: result.meta, seo: result.seo };
  if (name === "audit_security") return { meta: result.meta, security: result.security };
  if (name === "audit_quality") return { meta: result.meta, quality: result.quality };
  if (name === "audit_trust") return { meta: result.meta, trust: result.trust };
  if (name === "entity_graph") return { meta: result.meta, graph: result.graph };
  if (name === "competitor_intelligence") return { meta: result.meta, competitors: result.competitors };
  if (name === "generate_listing") return generateListing(result);
  if (name === "rag_export") return { meta: result.meta, documents: result.rag };
  if (name === "structured_data") return { meta: result.meta, structuredData: structuredDataInventory(result.pages) };
  if (name === "api_discovery") return { meta: result.meta, surfaces: discoverApiSurfaces(result.pages) };
  if (name === "compliance_signals") return { meta: result.meta, compliance: complianceSignals(result) };
  if (name === "people_team") return { meta: result.meta, people: extractPeople(result.pages) };
  if (name === "commerce_intelligence") return { meta: result.meta, commerce: extractCommerceSignals(result.pages) };
  if (name === "content_freshness") return { meta: result.meta, freshness: contentFreshness(result.pages) };
  if (name === "link_intelligence") return { meta: result.meta, links: linkIntelligence(result.pages) };
  if (name === "check_links") return { meta: result.meta, health: await checkLinks(result.pages, { limit: Number(args.limit || 50), external: args.external !== false, concurrency: Number(args.concurrency || 5) }) };
  if (name === "knowledge_export") return { meta: result.meta, knowledge: exportKnowledge(result) };
  if (name === "create_snapshot") { const snapshot = createSnapshot(result); const id = await persistSnapshot(snapshot); return { meta: result.meta, id, snapshot }; }
  if (name === "diff_snapshot") { const previous = await loadSnapshot(args.snapshot || result.finalUrl); if (!previous) { const current = createSnapshot(result); await persistSnapshot(current); return { meta: result.meta, changed: false, baselineCreated: true, current }; } const current = createSnapshot(result); const diff = diffSnapshots(previous, current); if (diff.changed && args.webhook !== false) await sendWebhook({ event: "url-intelligence-change", attribution: projectMeta(), diff }); await persistSnapshot(current); return { meta: result.meta, ...diff }; }
  if (name === "ai_reason") return { meta: result.meta, ai: await reasonWithOpenAICompatible(result, args.instruction || "Analyze this evidence and return only claims supported by sources.") };
  if (name === "list_plugins") return { meta: result.meta, plugins: listPlugins() };
  throw new Error(`Unknown action: ${name}`);
}

export function actionNames(): string[] {
  return ["investigate_url","probe_url","domain_intelligence","render_page","map_site","deep_crawl","resolve_entity","find_social_profiles","find_contacts","detect_technologies","brand_intelligence","audit_seo","audit_security","audit_quality","audit_trust","entity_graph","competitor_intelligence","generate_listing","rag_export","structured_data","api_discovery","compliance_signals","people_team","commerce_intelligence","content_freshness","link_intelligence","check_links","knowledge_export","compare_urls","batch_investigate","create_snapshot","diff_snapshot","ai_reason","list_plugins"];
}

export { createSnapshot, diffSnapshots, type Snapshot, PROJECT };
