import { assertPublicUrl } from "./net.js";

export type RenderResult = { html: string; url: string; renderer: "remote" | "playwright"; screenshotBase64?: string };
export type RenderOptions = { screenshot?: boolean; waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeoutMs?: number };

async function remoteRender(url: string, options: RenderOptions): Promise<RenderResult | undefined> {
  const endpoint = process.env.URL_AGENT_RENDER_ENDPOINT; if (!endpoint) return undefined;
  const key = process.env.URL_AGENT_RENDER_API_KEY; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeoutMs || Number(process.env.URL_AGENT_RENDER_TIMEOUT_MS || 30000));
  try {
    const response = await fetch(endpoint, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ url, waitUntil: options.waitUntil || "networkidle", screenshot: Boolean(options.screenshot) }) });
    if (!response.ok) throw new Error(`Render endpoint returned ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) { const data = await response.json() as { html?: string; url?: string; screenshotBase64?: string }; if (!data.html) throw new Error("Render endpoint did not return html"); return { html: data.html, url: data.url || url, renderer: "remote", screenshotBase64: data.screenshotBase64 }; }
    return { html: await response.text(), url, renderer: "remote" };
  } finally { clearTimeout(timer); }
}

async function playwrightRender(url: string, options: RenderOptions): Promise<RenderResult | undefined> {
  if (!/^(playwright|auto|always)$/i.test(process.env.URL_AGENT_RENDER_MODE || "off")) return undefined;
  try {
    const importer = new Function("m", "return import(m)") as (module: string) => Promise<any>; const pw = await importer("playwright"); const browser = await pw.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ userAgent: process.env.URL_AGENT_USER_AGENT || "url-intelligence-agent/1.0.0" });
      await page.goto(url, { waitUntil: options.waitUntil || "networkidle", timeout: options.timeoutMs || Number(process.env.URL_AGENT_RENDER_TIMEOUT_MS || 30000) });
      const finalUrl = page.url(); await assertPublicUrl(finalUrl);
      const screenshotBase64 = options.screenshot ? (await page.screenshot({ fullPage: true, type: "png" })).toString("base64") : undefined;
      return { html: await page.content(), url: finalUrl, renderer: "playwright", screenshotBase64 };
    } finally { await browser.close(); }
  } catch { return undefined; }
}

export async function renderUrl(rawUrl: string, options: RenderOptions = {}): Promise<RenderResult | undefined> {
  const url = (await assertPublicUrl(rawUrl)).toString(); return await remoteRender(url, options) || await playwrightRender(url, options);
}

export function shouldRender(html: string, textLength: number): boolean {
  if ((process.env.URL_AGENT_RENDER_MODE || "off") === "always") return true;
  if ((process.env.URL_AGENT_RENDER_MODE || "off") === "off") return false;
  return textLength < Number(process.env.URL_AGENT_RENDER_MIN_TEXT || 180) || /<div[^>]+id=["'](?:root|app|__next)["'][^>]*>\s*<\/div>/i.test(html) || /enable javascript|javascript is required/i.test(html);
}
