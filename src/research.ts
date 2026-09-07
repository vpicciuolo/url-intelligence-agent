import { safeFetch } from "./net.js";
import { parsePage } from "./extract.js";
import type { PageSignal, WebEvidenceSource, WebResearchReport } from "./types.js";

type SearchHit = {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

type Candidate = {
  url: string;
  discoveredBy: Set<string>;
  searchProvider?: string;
  searchTitle?: string;
  searchSnippet?: string;
  publishedAt?: string;
  priority: number;
};

const PLATFORM_HOSTS = [
  "x.com", "twitter.com", "linkedin.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be",
  "tiktok.com", "github.com", "gitlab.com", "reddit.com", "medium.com", "threads.net", "bsky.app",
  "t.me", "telegram.me", "discord.com", "discord.gg", "producthunt.com", "huggingface.co"
];

const IGNORE_HOST_PATTERNS = [
  /(^|\.)schema\.org$/i, /(^|\.)googleapis\.com$/i, /(^|\.)gstatic\.com$/i, /(^|\.)googletagmanager\.com$/i,
  /(^|\.)google-analytics\.com$/i, /(^|\.)doubleclick\.net$/i, /(^|\.)cloudflare\.com$/i, /(^|\.)stripe\.com$/i,
  /(^|\.)fonts\.googleapis\.com$/i
];

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name] || fallback);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function canonicalUrl(raw: string): string | undefined {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return undefined;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|source$|source_|campaign$|fbclid$|gclid$|igshid$|mc_)/i.test(key)) u.searchParams.delete(key);
    }
    if (/\.(?:jpg|jpeg|png|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|mov|mp3|wav|zip|rar|7z|tar|gz)(?:$|\?)/i.test(u.pathname + u.search)) return undefined;
    return u.toString().replace(/\/$/, "");
  } catch { return undefined; }
}

function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  const twoLevel = new Set(["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au", "co.nz", "com.br", "com.sg", "com.hk", "co.jp", "co.in", "com.mx", "com.tr", "com.cn"]);
  const suffix2 = parts.slice(-2).join(".");
  if (twoLevel.has(suffix2) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function isSameSite(host: string, rootDomain: string): boolean {
  return registrableDomain(host) === rootDomain;
}

function isPlatform(host: string): boolean {
  const h = host.toLowerCase();
  return PLATFORM_HOSTS.some(p => h === p || h.endsWith(`.${p}`));
}

function shouldIgnore(url: string): boolean {
  try {
    const u = new URL(url);
    if (IGNORE_HOST_PATTERNS.some(re => re.test(u.hostname))) return true;
    if (/\/(?:login|signin|sign-in|logout|signout|checkout|cart|share)(?:\/|$|\?)/i.test(u.pathname)) return true;
    return false;
  } catch { return true; }
}

function collectJsonUrls(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) { value.forEach(v => collectJsonUrls(v, out)); return; }
  if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(v => collectJsonUrls(v, out));
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function mentionsEntity(text: string, entityName: string, rootHost: string): boolean {
  const hay = normalizeText(text);
  const entity = normalizeText(entityName);
  const hostToken = normalizeText(registrableDomain(rootHost).split(".")[0]);
  if (entity.length >= 4 && hay.includes(entity)) return true;
  if (hostToken.length >= 4 && new RegExp(`\\b${hostToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(hay)) return true;
  const meaningful = entity.split(" ").filter(x => x.length >= 4);
  return meaningful.length >= 2 && meaningful.every(x => hay.includes(x));
}

function pageLinksToTarget(page: PageSignal, rootDomain: string): boolean {
  return page.links.some(link => {
    try { return isSameSite(new URL(link).hostname, rootDomain); } catch { return false; }
  });
}

function extractPublishedAt(page: PageSignal): string | undefined {
  const direct = page.meta["article:published_time"] || page.meta["date"] || page.meta["datepublished"] || page.meta["pubdate"] || page.meta["dc.date"];
  if (direct) return direct;
  const dates: string[] = [];
  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const record = value as Record<string, unknown>;
    for (const k of ["datePublished", "dateCreated", "dateModified"]) if (typeof record[k] === "string") dates.push(String(record[k]));
    Object.values(record).forEach(walk);
  };
  page.jsonLd.forEach(walk);
  return dates[0];
}

function configuredProvider(): string | undefined {
  const requested = String(process.env.URL_AGENT_SEARCH_PROVIDER || "").trim().toLowerCase();
  if (requested === "off" || requested === "none" || requested === "disabled") return undefined;
  if (requested === "duckduckgo" || requested === "ddg") return "duckduckgo";
  if (requested === "searxng" && process.env.URL_AGENT_SEARCH_ENDPOINT) return "searxng";
  if (requested === "brave" && process.env.BRAVE_SEARCH_API_KEY) return "brave";
  if (requested === "serper" && process.env.SERPER_API_KEY) return "serper";
  if (requested === "tavily" && process.env.TAVILY_API_KEY) return "tavily";
  if (requested === "google-cse" && process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) return "google-cse";
  if (process.env.URL_AGENT_SEARCH_ENDPOINT) return "searxng";
  if (process.env.BRAVE_SEARCH_API_KEY) return "brave";
  if (process.env.SERPER_API_KEY) return "serper";
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) return "google-cse";
  return "duckduckgo";
}

function unwrapDuckDuckGo(raw: string): string | undefined {
  try {
    const decoded = decodeHtml(raw);
    const u = new URL(decoded, "https://html.duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return canonicalUrl(decodeURIComponent(uddg));
    const host = u.hostname.toLowerCase();
    if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) return undefined;
    return canonicalUrl(u.toString());
  } catch { return undefined; }
}

function parseDuckDuckGoHtml(html: string, limit: number): SearchHit[] {
  const out: SearchHit[] = [];
  const seen = new Set<string>();
  const push = (href: string, title: string) => {
    const url = unwrapDuckDuckGo(href);
    if (!url || seen.has(url) || shouldIgnore(url)) return;
    seen.add(url);
    out.push({ url, title: stripHtml(title), provider: "duckduckgo" });
  };

  for (const m of html.matchAll(/<a\b([^>]*class=["'][^"']*result__a[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href=["']([^"']+)["']/i)?.[1];
    if (href) push(href, m[2]);
    if (out.length >= limit) break;
  }

  if (out.length < limit) {
    for (const m of html.matchAll(/<a\b([^>]*href=["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = m[1].match(/href=["']([^"']+)["']/i)?.[1];
      if (href) push(href, m[2]);
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchHit[]> {
  const endpoints = ["https://html.duckduckgo.com/html/", "https://lite.duckduckgo.com/lite/"];
  let lastError: unknown;
  for (const base of endpoints) {
    try {
      const u = new URL(base);
      u.searchParams.set("q", query);
      const fetched = await safeFetch(u.toString(), {
        timeoutMs: envInt("URL_AGENT_SEARCH_TIMEOUT_MS", 10000, 2000, 30000),
        maxBytes: 1_500_000,
        headers: { "accept-language": "en-US,en;q=0.8" }
      });
      const hits = parseDuckDuckGoHtml(fetched.text, limit);
      if (hits.length) return hits;
      lastError = new Error("No parseable public search results returned");
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("DuckDuckGo public search failed");
}

async function searchSearx(query: string, limit: number): Promise<SearchHit[]> {
  const endpoint = new URL(String(process.env.URL_AGENT_SEARCH_ENDPOINT));
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "json");
  const res = await fetch(endpoint, { headers: { accept: "application/json", "user-agent": "url-intelligence-agent/1.0.0" }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`SearXNG search failed: ${res.status}`);
  const data = await res.json() as { results?: { url?: string; title?: string; content?: string; publishedDate?: string }[] };
  return (data.results || []).slice(0, limit).flatMap(x => x.url ? [{ url: x.url, title: x.title, snippet: x.content, publishedAt: x.publishedDate, provider: "searxng" }] : []);
}

async function searchBrave(query: string, limit: number): Promise<SearchHit[]> {
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", query); u.searchParams.set("count", String(Math.min(limit, 20))); u.searchParams.set("safesearch", "moderate");
  const res = await fetch(u, { headers: { accept: "application/json", "x-subscription-token": String(process.env.BRAVE_SEARCH_API_KEY) }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Brave Search failed: ${res.status}`);
  const data = await res.json() as { web?: { results?: { url?: string; title?: string; description?: string; page_age?: string }[] } };
  return (data.web?.results || []).slice(0, limit).flatMap(x => x.url ? [{ url: x.url, title: x.title, snippet: x.description, publishedAt: x.page_age, provider: "brave" }] : []);
}

async function searchSerper(query: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": String(process.env.SERPER_API_KEY) },
    body: JSON.stringify({ q: query, num: Math.min(limit, 20) }),
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`Serper search failed: ${res.status}`);
  const data = await res.json() as { organic?: { link?: string; title?: string; snippet?: string; date?: string }[] };
  return (data.organic || []).slice(0, limit).flatMap(x => x.link ? [{ url: x.link, title: x.title, snippet: x.snippet, publishedAt: x.date, provider: "serper" }] : []);
}

async function searchTavily(query: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: "advanced", max_results: Math.min(limit, 20), include_answer: false, include_raw_content: false }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json() as { results?: { url?: string; title?: string; content?: string; published_date?: string }[] };
  return (data.results || []).slice(0, limit).flatMap(x => x.url ? [{ url: x.url, title: x.title, snippet: x.content, publishedAt: x.published_date, provider: "tavily" }] : []);
}

async function searchGoogleCse(query: string, limit: number): Promise<SearchHit[]> {
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", String(process.env.GOOGLE_CSE_API_KEY)); u.searchParams.set("cx", String(process.env.GOOGLE_CSE_CX)); u.searchParams.set("q", query); u.searchParams.set("num", String(Math.min(limit, 10)));
  const res = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Google CSE failed: ${res.status}`);
  const data = await res.json() as { items?: { link?: string; title?: string; snippet?: string }[] };
  return (data.items || []).slice(0, limit).flatMap(x => x.link ? [{ url: x.link, title: x.title, snippet: x.snippet, provider: "google-cse" }] : []);
}

async function searchWeb(query: string, limit: number, provider: string): Promise<SearchHit[]> {
  if (provider === "duckduckgo") return searchDuckDuckGo(query, limit);
  if (provider === "searxng") return searchSearx(query, limit);
  if (provider === "brave") return searchBrave(query, limit);
  if (provider === "serper") return searchSerper(query, limit);
  if (provider === "tavily") return searchTavily(query, limit);
  if (provider === "google-cse") return searchGoogleCse(query, limit);
  return [];
}

function addCandidate(map: Map<string, Candidate>, rawUrl: string, discoveredBy: string, priority: number, hit?: SearchHit): void {
  const url = canonicalUrl(rawUrl);
  if (!url || shouldIgnore(url)) return;
  const current = map.get(url) || { url, discoveredBy: new Set<string>(), priority };
  current.discoveredBy.add(discoveredBy);
  current.priority = Math.max(current.priority, priority);
  if (hit) {
    current.searchProvider = hit.provider;
    current.searchTitle ||= hit.title;
    current.searchSnippet ||= hit.snippet;
    current.publishedAt ||= hit.publishedAt;
  }
  map.set(url, current);
}

async function fetchCandidate(candidate: Candidate, entityName: string, rootDomain: string): Promise<WebEvidenceSource> {
  const observedAt = new Date().toISOString();
  let host = "";
  try { host = new URL(candidate.url).hostname.toLowerCase(); } catch { host = "unknown"; }
  const sourceClass: WebEvidenceSource["sourceClass"] = isSameSite(host, rootDomain) ? "first-party" : isPlatform(host) ? "platform" : "third-party";
  const base: WebEvidenceSource = {
    url: candidate.url,
    host,
    sourceClass,
    discoveredBy: [...candidate.discoveredBy],
    searchProvider: candidate.searchProvider,
    searchTitle: candidate.searchTitle,
    searchSnippet: candidate.searchSnippet,
    publishedAt: candidate.publishedAt,
    mentionsEntity: mentionsEntity(`${candidate.searchTitle || ""} ${candidate.searchSnippet || ""}`, entityName, rootDomain),
    fetched: false,
    observedAt
  };
  if (sourceClass === "platform" && /(?:facebook|instagram|linkedin|tiktok|t\.me|telegram)/i.test(host)) return base;
  try {
    const fetched = await safeFetch(candidate.url, { timeoutMs: envInt("URL_AGENT_EXTERNAL_TIMEOUT_MS", 9000, 2000, 30000), maxBytes: envInt("URL_AGENT_EXTERNAL_MAX_BYTES", 1_500_000, 100_000, 5_000_000) });
    const contentType = fetched.headers.get("content-type") || "";
    if (!/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) return { ...base, status: fetched.status, finalUrl: fetched.url, error: `Unsupported content type: ${contentType || "unknown"}` };
    const page = parsePage(fetched.text, fetched.url, fetched.status, fetched);
    const text = `${page.title || ""} ${page.description || ""} ${page.textSample.slice(0, 12000)}`;
    const backlink = pageLinksToTarget(page, rootDomain);
    return {
      ...base,
      finalUrl: fetched.url,
      host: new URL(fetched.url).hostname.toLowerCase(),
      status: fetched.status,
      title: page.title,
      description: page.description,
      publishedAt: extractPublishedAt(page) || candidate.publishedAt,
      mentionsEntity: mentionsEntity(text, entityName, rootDomain),
      discoveredBy: backlink ? unique([...base.discoveredBy, "backlink-to-target"]) : base.discoveredBy,
      fetched: true
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  }
}

function coverageScore(thirdPartyDomains: number, thirdPartySources: number, platformSources: number, backlinkDomains: number): number {
  if (!thirdPartyDomains && !platformSources && !backlinkDomains) return 0;
  const domainSignal = 1 - Math.exp(-0.48 * thirdPartyDomains);
  const sourceSignal = 1 - Math.exp(-0.12 * Math.max(0, thirdPartySources - thirdPartyDomains));
  const platformSignal = 1 - Math.exp(-0.08 * platformSources);
  const backlinkSignal = 1 - Math.exp(-0.35 * backlinkDomains);
  return Math.round(Math.min(0.98, domainSignal * 0.72 + sourceSignal * 0.1 + platformSignal * 0.04 + backlinkSignal * 0.14) * 100);
}

function coverageLevel(score: number): WebResearchReport["coverageLevel"] {
  if (score >= 75) return "strong";
  if (score >= 45) return "moderate";
  if (score > 0) return "limited";
  return "none";
}

export async function researchExternalWeb(rootUrl: string, entityName: string, pages: PageSignal[]): Promise<WebResearchReport> {
  const enabled = process.env.URL_AGENT_EXTERNAL_RESEARCH !== "false";
  if (!enabled) return { enabled: false, searchConfigured: false, queries: [], candidateUrls: 0, fetchedSources: 0, thirdPartySources: 0, thirdPartyDomains: 0, corroboratingThirdPartySources: 0, corroboratingThirdPartyDomains: 0, platformSources: 0, sourceCoverageScore: 0, coverageLevel: "none", sources: [], notes: ["External web research is disabled by configuration."] };

  const rootHost = new URL(rootUrl).hostname.toLowerCase();
  const rootDomain = registrableDomain(rootHost);
  const provider = configuredProvider();
  const candidates = new Map<string, Candidate>();
  const notes: string[] = [];

  // Stage A: collect everything the target itself points at, including JSON-LD sameAs/citations.
  for (const page of pages) {
    for (const link of page.links) addCandidate(candidates, link, "outbound-link", 60);
    const jsonUrls: string[] = [];
    page.jsonLd.forEach(doc => collectJsonUrls(doc, jsonUrls));
    jsonUrls.forEach(url => addCandidate(candidates, url, "structured-data", 85));
  }

  // Stage B: search beyond the target domain for mentions, articles, reviews and possible backlinks.
  const hostQuery = rootDomain;
  const cleanName = entityName.replace(/["“”]/g, "").trim();
  const queries = unique([
    cleanName ? `"${cleanName}" -site:${hostQuery}` : "",
    `"${hostQuery}" -site:${hostQuery}`,
    `"${rootUrl.replace(/\/$/, "")}" -site:${hostQuery}`,
    cleanName ? `"${cleanName}" news OR article OR review OR interview` : ""
  ].filter(Boolean)).slice(0, envInt("URL_AGENT_SEARCH_QUERIES", 4, 1, 6));

  if (provider) {
    const perQuery = envInt("URL_AGENT_SEARCH_RESULTS_PER_QUERY", 10, 1, 20);
    for (const query of queries) {
      try {
        const hits = await searchWeb(query, perQuery, provider);
        hits.forEach(hit => addCandidate(candidates, hit.url, `search:${provider}`, 100, hit));
      } catch (error) {
        notes.push(`Search query failed (${provider}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    notes.push("External search is disabled. Third-party discovery is limited to public URLs referenced by the target site.");
  }

  // The primary site crawl remains same-origin. This external stage deliberately removes same-site URLs.
  for (const [url] of candidates) {
    const host = new URL(url).hostname.toLowerCase();
    if (isSameSite(host, rootDomain)) candidates.delete(url);
  }

  const maxSources = envInt("URL_AGENT_EXTERNAL_MAX_SOURCES", 24, 1, 60);
  const selected = [...candidates.values()].sort((a, b) => b.priority - a.priority).slice(0, maxSources);
  const concurrency = envInt("URL_AGENT_EXTERNAL_CONCURRENCY", 4, 1, 10);
  const sources: WebEvidenceSource[] = [];
  for (let i = 0; i < selected.length; i += concurrency) {
    const batch = selected.slice(i, i + concurrency);
    sources.push(...await Promise.all(batch.map(c => fetchCandidate(c, entityName, rootDomain))));
  }

  const isBacklink = (s: WebEvidenceSource) => s.discoveredBy.includes("backlink-to-target");
  const corroboratingThirdParty = sources.filter(s => s.sourceClass === "third-party" && s.fetched && (s.mentionsEntity || isBacklink(s)) && (s.status || 0) >= 200 && (s.status || 0) < 400);
  const thirdPartySources = sources.filter(s => s.sourceClass === "third-party" && s.fetched).length;
  const thirdPartyDomains = new Set(sources.filter(s => s.sourceClass === "third-party" && s.fetched).map(s => registrableDomain(s.host))).size;
  const corroboratingThirdPartyDomains = new Set(corroboratingThirdParty.map(s => registrableDomain(s.host))).size;
  const platformSources = sources.filter(s => s.sourceClass === "platform").length;
  const backlinkSources = sources.filter(s => s.sourceClass === "third-party" && s.fetched && isBacklink(s));
  const backlinkDomains = new Set(backlinkSources.map(s => registrableDomain(s.host))).size;
  const score = coverageScore(corroboratingThirdPartyDomains, corroboratingThirdParty.length, platformSources, backlinkDomains);

  if (sources.length && !corroboratingThirdParty.length) notes.push("External sources were discovered, but no fetched third-party page produced a clear entity mention or direct link back to the target. Treat external corroboration as unverified.");
  if (corroboratingThirdPartyDomains === 1) notes.push("Only one corroborating third-party domain was observed. A single external domain should not be treated as broad consensus.");
  if (backlinkSources.length) notes.push(`${backlinkSources.length} fetched third-party source(s) linked directly back to the target across ${backlinkDomains} independent domain(s).`);
  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo search fallback. For higher-volume or more reproducible coverage, configure SearXNG, Brave Search, Serper, Tavily or Google CSE.");
  notes.push("No live crawler can guarantee discovery of every backlink or every page on the public web. This stage performs bounded live discovery plus search-index discovery; exhaustive backlink coverage depends on the external index available to the runtime.");
  notes.push("Source coverage is a measure of independent-domain corroboration, not a probability that every claim is true. Claim-level verification still depends on the evidence attached to each assertion.");

  return {
    enabled: true,
    searchConfigured: Boolean(provider),
    searchProvider: provider,
    queries: provider ? queries : [],
    candidateUrls: candidates.size,
    fetchedSources: sources.filter(s => s.fetched).length,
    thirdPartySources,
    thirdPartyDomains,
    corroboratingThirdPartySources: corroboratingThirdParty.length,
    corroboratingThirdPartyDomains,
    platformSources,
    sourceCoverageScore: score,
    coverageLevel: coverageLevel(score),
    sources,
    notes
  };
}
