import { safeFetch } from "./net.js";
import { parsePage, pagePriority, classifyImportant } from "./extract.js";
import { analyzeRepresentation } from "./provenance.js";
import { renderUrl, shouldRender } from "./render.js";
import type { CrawlPolicy, CrawlResult, PageRepresentation, PageSignal } from "./types.js";

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name] || fallback);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
}

export function defaultCrawlPolicy(overrides: Partial<CrawlPolicy> = {}): CrawlPolicy {
  return {
    maxPages: envInt("URL_AGENT_MAX_PAGES", 30, 1, 500),
    maxDepth: envInt("URL_AGENT_MAX_DEPTH", 3, 0, 10),
    concurrency: envInt("URL_AGENT_CONCURRENCY", 4, 1, 20),
    sameOrigin: process.env.URL_AGENT_SAME_ORIGIN !== "false",
    obeyRobots: process.env.URL_AGENT_OBEY_ROBOTS !== "false",
    allowPatterns: (process.env.URL_AGENT_ALLOW_PATTERNS || "").split(",").map(x => x.trim()).filter(Boolean),
    denyPatterns: (process.env.URL_AGENT_DENY_PATTERNS || "logout,signout,delete,unsubscribe,cart,checkout").split(",").map(x => x.trim()).filter(Boolean),
    renderMode: ((process.env.URL_AGENT_RENDER_MODE || "off").toLowerCase() as CrawlPolicy["renderMode"]),
    ...overrides
  };
}

function robotsDisallows(text: string): string[] {
  const rules: string[] = [];
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*" || /url-intelligence-agent/i.test(value);
    if (key === "disallow" && applies && value) rules.push(value);
  }
  return rules;
}

function robotsSitemaps(text: string): string[] {
  return [...text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map(m => m[1]);
}

function isAllowed(url: string, rootOrigin: string, policy: CrawlPolicy, disallow: string[]): { ok: boolean; reason?: string } {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: "unsupported-protocol" };
    if (policy.sameOrigin && u.origin !== rootOrigin) return { ok: false, reason: "external-origin" };
    if (/\.(?:pdf|zip|rar|7z|gz|tar|jpg|jpeg|png|gif|svg|webp|avif|ico|mp4|mov|avi|mp3|wav|css|js|woff2?|ttf|eot)(?:$|\?)/i.test(u.pathname + u.search)) return { ok: false, reason: "non-html-asset" };
    if (policy.allowPatterns.length && !policy.allowPatterns.some(p => u.href.includes(p))) return { ok: false, reason: "not-allowlisted" };
    if (policy.denyPatterns.some(p => u.href.toLowerCase().includes(p.toLowerCase()))) return { ok: false, reason: "deny-pattern" };
    if (policy.obeyRobots && disallow.some(rule => rule !== "/" && u.pathname.startsWith(rule))) return { ok: false, reason: "robots-disallow" };
    if (policy.obeyRobots && disallow.includes("/")) return { ok: false, reason: "robots-disallow-all" };
    return { ok: true };
  } catch { return { ok: false, reason: "invalid-url" }; }
}

async function fetchSitemapUrls(url: string, seen = new Set<string>(), depth = 0): Promise<string[]> {
  if (depth > 3 || seen.has(url) || seen.size > 30) return [];
  seen.add(url);
  try {
    const response = await safeFetch(url, { maxBytes: 5_000_000, timeoutMs: 15000 });
    const xml = response.text;
    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].replace(/&amp;/g, "&").trim());
    if (/<sitemapindex\b/i.test(xml)) {
      const nested: string[] = [];
      for (const loc of locs.slice(0, 30)) nested.push(...await fetchSitemapUrls(loc, seen, depth + 1));
      return nested;
    }
    return locs;
  } catch { return []; }
}

function requestVariant(): PageRepresentation["requestVariant"] {
  return {
    language: (process.env.URL_AGENT_ACCEPT_LANGUAGE || "en,*;q=0.5").split(",")[0],
    userAgentClass: "url-intelligence-agent",
    region: process.env.URL_AGENT_REQUEST_REGION || undefined,
    device: "server"
  };
}

async function collectPage(url: string, renderMode: CrawlPolicy["renderMode"]): Promise<PageSignal> {
  const fetched = await safeFetch(url, { headers: { "accept-language": process.env.URL_AGENT_ACCEPT_LANGUAGE || "en,*;q=0.5" } });
  const sourceParsed = parsePage(fetched.text, fetched.url, fetched.status, fetched);
  const render = shouldRender(fetched.text, sourceParsed.textSample.length, renderMode) ? await renderUrl(fetched.url, { captureNetwork: true }) : undefined;
  const finalUrl = render?.url || fetched.url;
  const includeHtml = process.env.URL_AGENT_INCLUDE_RAW_REPRESENTATIONS === "true";
  const sourceRepresentation = analyzeRepresentation(fetched.text, fetched.url, "source_html", {
    finalUrl,
    observedAt: new Date().toISOString(),
    headers: fetched.trace.headers,
    requestVariant: requestVariant(),
    includeHtml
  });
  let page = sourceParsed;
  const representations: PageRepresentation[] = [sourceRepresentation];
  if (render) {
    page = parsePage(render.html, render.url, fetched.status, fetched);
    page.rendered = true;
    representations.push(analyzeRepresentation(render.html, render.url, "rendered_dom", {
      finalUrl: render.url,
      observedAt: new Date().toISOString(),
      requestVariant: { ...requestVariant(), device: "chromium" },
      networkEvidence: render.networkEvidence,
      includeHtml
    }));
  }
  page.representations = representations;
  page.observations = [...new Map(representations.flatMap(rep => rep.observations).map(observation => [observation.id, observation])).values()];
  return page;
}

async function fetchPage(url: string, renderMode: CrawlPolicy["renderMode"]): Promise<PageSignal> {
  return collectPage(url, renderMode);
}

export async function crawlSite(rawUrl: string, overrides: Partial<CrawlPolicy> = {}): Promise<CrawlResult> {
  const policy = defaultCrawlPolicy(overrides);
  const root = await collectPage(rawUrl, policy.renderMode);
  const origin = new URL(root.url).origin;
  const robotsUrl = new URL("/robots.txt", origin).toString();
  let robotsText = "";
  try { robotsText = (await safeFetch(robotsUrl, { maxBytes: 300_000, timeoutMs: 6000 })).text; } catch { /* optional */ }
  const disallow = robotsDisallows(robotsText);
  const sitemapSeeds = [...new Set([...robotsSitemaps(robotsText), new URL("/sitemap.xml", origin).toString()])];
  const sitemapUrls = [...new Set((await Promise.all(sitemapSeeds.map(x => fetchSitemapUrls(x)))).flat())].slice(0, 5000);
  const pages: PageSignal[] = [root];
  const importantPages: Record<string, string> = {};
  const errors: { url: string; error: string }[] = [];
  const skipped: { url: string; reason: string }[] = [];
  const visited = new Set<string>([root.url]);
  const queue: { url: string; depth: number; priority: number }[] = [];

  const enqueue = (url: string, depth: number) => {
    if (visited.has(url) || queue.some(x => x.url === url)) return;
    const allowed = isAllowed(url, origin, policy, disallow);
    if (!allowed.ok) { if (allowed.reason !== "external-origin") skipped.push({ url, reason: allowed.reason || "blocked" }); return; }
    queue.push({ url, depth, priority: pagePriority(url) });
  };

  root.links.forEach(url => enqueue(url, 1));
  sitemapUrls.slice(0, Math.max(policy.maxPages * 5, 100)).forEach(url => enqueue(url, Math.min(policy.maxDepth, 1)));

  while (queue.length && pages.length < policy.maxPages) {
    queue.sort((a, b) => b.priority - a.priority || a.depth - b.depth);
    const batch = queue.splice(0, Math.min(policy.concurrency, policy.maxPages - pages.length));
    await Promise.all(batch.map(async item => {
      if (item.depth > policy.maxDepth || visited.has(item.url)) return;
      visited.add(item.url);
      try {
        const page = await fetchPage(item.url, policy.renderMode);
        pages.push(page);
        const kind = classifyImportant(page.url);
        if (kind && !importantPages[kind]) importantPages[kind] = page.url;
        if (item.depth < policy.maxDepth) page.links.forEach(link => enqueue(link, item.depth + 1));
      } catch (error) {
        errors.push({ url: item.url, error: error instanceof Error ? error.message : String(error) });
      }
    }));
  }

  for (const page of pages) {
    const kind = classifyImportant(page.url);
    if (kind && !importantPages[kind]) importantPages[kind] = page.url;
  }

  return { rootUrl: root.url, pages, importantPages, sitemapUrls, robotsUrl, robotsText: robotsText || undefined, skipped: skipped.slice(0, 500), errors: errors.slice(0, 500), policy };
}
