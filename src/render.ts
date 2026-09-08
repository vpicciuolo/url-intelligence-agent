import { PROJECT } from "./credits.js";
import { assertPublicUrl } from "./net.js";
import type { JsonValue } from "./types.js";

export type RenderNetworkEvidence = {
  url: string;
  status: number;
  contentType?: string;
  body?: JsonValue;
  observedAt: string;
};

export type RenderResult = {
  html: string;
  url: string;
  renderer: "remote" | "playwright";
  screenshotBase64?: string;
  networkEvidence?: RenderNetworkEvidence[];
  blockedRequests?: number;
};
export type RenderOptions = {
  screenshot?: boolean;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  timeoutMs?: number;
  captureNetwork?: boolean;
  maxRequests?: number;
};

async function remoteRender(url: string, options: RenderOptions): Promise<RenderResult | undefined> {
  const endpoint = process.env.URL_AGENT_RENDER_ENDPOINT;
  if (!endpoint) return undefined;
  const key = process.env.URL_AGENT_RENDER_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || Number(process.env.URL_AGENT_RENDER_TIMEOUT_MS || 30000));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        url,
        waitUntil: options.waitUntil || "networkidle",
        screenshot: Boolean(options.screenshot),
        captureNetwork: options.captureNetwork !== false,
        maxRequests: options.maxRequests || Number(process.env.URL_AGENT_RENDER_MAX_REQUESTS || 300)
      })
    });
    if (!response.ok) throw new Error(`Render endpoint returned ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json() as { html?: string; url?: string; screenshotBase64?: string; networkEvidence?: RenderNetworkEvidence[]; blockedRequests?: number };
      if (!data.html) throw new Error("Render endpoint did not return html");
      const finalUrl = (await assertPublicUrl(data.url || url)).toString();
      return { html: data.html, url: finalUrl, renderer: "remote", screenshotBase64: data.screenshotBase64, networkEvidence: data.networkEvidence?.slice(0, 50), blockedRequests: data.blockedRequests };
    }
    return { html: await response.text(), url, renderer: "remote" };
  } finally {
    clearTimeout(timer);
  }
}

async function playwrightRender(url: string, options: RenderOptions): Promise<RenderResult | undefined> {
  if (!/^(playwright|auto|always)$/i.test(process.env.URL_AGENT_RENDER_MODE || "off")) return undefined;
  try {
    const importer = new Function("m", "return import(m)") as (module: string) => Promise<any>;
    const pw = await importer("playwright");
    const browser = await pw.chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent: process.env.URL_AGENT_USER_AGENT || `url-intelligence-agent/${PROJECT.version}`,
        serviceWorkers: "block",
        acceptDownloads: false
      });
      const page = await context.newPage();
      const root = new URL(url);
      const maxRequests = Math.max(20, Math.min(1500, options.maxRequests || Number(process.env.URL_AGENT_RENDER_MAX_REQUESTS || 300)));
      const blockMedia = process.env.URL_AGENT_RENDER_BLOCK_MEDIA !== "false";
      let requestCount = 0;
      let blockedRequests = 0;

      await context.route("**/*", async (route: any) => {
        const request = route.request();
        const requestUrl = String(request.url() || "");
        const resourceType = String(request.resourceType() || "");
        if (/^(data|blob|about):/i.test(requestUrl)) { await route.continue(); return; }
        if (!/^https?:/i.test(requestUrl)) { blockedRequests += 1; await route.abort("blockedbyclient"); return; }
        requestCount += 1;
        if (requestCount > maxRequests) { blockedRequests += 1; await route.abort("blockedbyclient"); return; }
        if (blockMedia && ["media", "font"].includes(resourceType)) { blockedRequests += 1; await route.abort("blockedbyclient"); return; }
        try {
          await assertPublicUrl(requestUrl);
          await route.continue();
        } catch {
          blockedRequests += 1;
          await route.abort("blockedbyclient");
        }
      });

      const evidence: RenderNetworkEvidence[] = [];
      const networkTasks: Promise<void>[] = [];
      if (options.captureNetwork !== false) {
        page.on("response", (response: any) => {
          const task = (async () => {
            if (evidence.length >= 50) return;
            const responseUrl = String(response.url() || "");
            let parsed: URL;
            try { parsed = new URL(responseUrl); } catch { return; }
            if (parsed.origin !== root.origin) return;
            const request = response.request();
            const resourceType = String(request?.resourceType?.() || "");
            if (!["xhr", "fetch"].includes(resourceType)) return;
            const headers = await response.allHeaders();
            const contentType = String(headers["content-type"] || "");
            if (!/(?:application|text)\/(?:[^;]+\+)?json/i.test(contentType) && !/(?:graphql|\/api\/|\.json(?:$|\?))/i.test(responseUrl)) return;
            const declared = Number(headers["content-length"] || 0);
            const maxBody = Math.max(10_000, Math.min(1_000_000, Number(process.env.URL_AGENT_RENDER_API_MAX_BYTES || 250_000)));
            if (declared && declared > maxBody) return;
            try {
              const text = await response.text();
              if (Buffer.byteLength(text) > maxBody) return;
              const body = JSON.parse(text) as JsonValue;
              evidence.push({ url: responseUrl, status: Number(response.status()), contentType, body, observedAt: new Date().toISOString() });
            } catch {
              // Runtime API evidence is optional and fail-soft.
            }
          })();
          networkTasks.push(task);
        });
      }

      page.on("download", async (download: any) => { try { await download.cancel(); } catch { /* noop */ } });
      await page.goto(url, { waitUntil: options.waitUntil || "networkidle", timeout: options.timeoutMs || Number(process.env.URL_AGENT_RENDER_TIMEOUT_MS || 30000) });
      await Promise.allSettled(networkTasks);
      const finalUrl = page.url();
      await assertPublicUrl(finalUrl);
      const screenshotBase64 = options.screenshot ? (await page.screenshot({ fullPage: true, type: "png" })).toString("base64") : undefined;
      const result: RenderResult = { html: await page.content(), url: finalUrl, renderer: "playwright", screenshotBase64, networkEvidence: evidence.slice(0, 50), blockedRequests };
      await context.close();
      return result;
    } finally {
      await browser.close();
    }
  } catch {
    return undefined;
  }
}

export async function renderUrl(rawUrl: string, options: RenderOptions = {}): Promise<RenderResult | undefined> {
  const url = (await assertPublicUrl(rawUrl)).toString();
  return await remoteRender(url, options) || await playwrightRender(url, options);
}

export function shouldRender(html: string, textLength: number, mode: "off" | "auto" | "always" | "playwright" = ((process.env.URL_AGENT_RENDER_MODE || "off").toLowerCase() as "off" | "auto" | "always" | "playwright")): boolean {
  if (mode === "always" || mode === "playwright") return true;
  if (mode === "off") return false;
  return textLength < Number(process.env.URL_AGENT_RENDER_MIN_TEXT || 180)
    || /<div[^>]+id=["'](?:root|app|__next)["'][^>]*>\s*<\/div>/i.test(html)
    || /enable javascript|javascript is required/i.test(html);
}
