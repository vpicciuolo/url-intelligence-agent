import type { PageSignal } from "./types.js";

function decode(s: string): string {
  return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
}
function one(html:string, re:RegExp): string|undefined { const m = html.match(re); return m?.[1] ? decode(m[1]) : undefined; }
function all(html:string, re:RegExp): string[] { return [...html.matchAll(re)].map(m=>decode(m[1]||"")).filter(Boolean); }

export function parsePage(html:string, url:string, status=200): PageSignal {
  const title = one(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || one(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const description = one(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || one(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const canonical = one(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const ogImage = one(html, /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i);
  const headings = all(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).map(x=>x.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()).filter(Boolean).slice(0,20);
  const rawLinks = all(html, /<a[^>]+href=["']([^"'#]+)["']/gi);
  const links = [...new Set(rawLinks.map(x=>{try{return new URL(x,url).toString()}catch{return ""}}).filter(Boolean))];
  const socials = links.filter(x=>/(x\.com|twitter\.com|linkedin\.com|instagram\.com|facebook\.com|youtube\.com|youtu\.be|tiktok\.com|github\.com|discord\.(gg|com)|threads\.net|snapchat\.com)/i.test(x));
  const emails = [...new Set(all(html, /mailto:([^"'?\s]+)/gi).concat(all(html, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi)))].slice(0,30);
  const jsonLdTypes = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{
    try { const data=JSON.parse(m[1]); const arr=Array.isArray(data)?data:[data]; return arr.flatMap((x:any)=>Array.isArray(x?.["@type"])?x["@type"]:(x?.["@type"]?[x["@type"]]:[])); } catch { return []; }
  }).map(String);
  const textSample = html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,6000);
  return {url,title,description,canonical,ogImage,jsonLdTypes:[...new Set(jsonLdTypes)],headings,socials:[...new Set(socials)],emails,links,textSample,status};
}

export function classifyImportant(url:string): string|undefined {
  const p = new URL(url).pathname.toLowerCase();
  const checks: [string,RegExp][] = [["about",/about|company|who-we-are/],["contact",/contact|support/],["team",/team|people|leadership/],["pricing",/pricing|plans/],["product",/product|features|solutions|services/],["legal",/privacy|terms|legal|imprint/]];
  return checks.find(([,r])=>r.test(p))?.[0];
}
