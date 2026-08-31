import { createHash } from "node:crypto";
import { PROJECT } from "./credits.js";
import { safeFetch } from "./net.js";
import { classifyImportant, parsePage } from "./extract.js";
import type { EvidenceField, IntelligenceResult, PageSignal } from "./types.js";

const SAME_ORIGIN_ONLY = true;

function field<T>(value:T, confidence:number, method:string, sources:string[]): EvidenceField<T> { return {value,confidence,method,sources:[...new Set(sources)]}; }
function pickName(page:PageSignal): string {
  return page.title?.split(/[|·—–-]/)[0]?.trim() || new URL(page.url).hostname.replace(/^www\./,"");
}
function entityType(page:PageSignal): string {
  const types = page.jsonLdTypes.map(x=>x.toLowerCase());
  if (types.some(x=>/person/.test(x))) return "person";
  if (types.some(x=>/product/.test(x))) return "product";
  if (types.some(x=>/organization|corporation|localbusiness/.test(x))) return "organization";
  const t=(page.title+" "+page.description+" "+page.textSample.slice(0,1200)).toLowerCase();
  if (/creator|artist|dj|musician|author|influencer/.test(t)) return "creator";
  if (/startup|saas|platform|software|app\b/.test(t)) return "startup";
  return "website";
}
function seoScore(page:PageSignal): {score:number;issues:string[]} {
  let score=100; const issues:string[]=[];
  const miss=(cond:boolean,msg:string,points:number)=>{if(cond){issues.push(msg);score-=points;}};
  miss(!page.title,"Missing <title>",20); miss(!page.description,"Missing meta description",15); miss(!page.canonical,"Missing canonical URL",10); miss(!page.ogImage,"Missing og:image",10); miss(!page.headings.length,"No H1-H3 headings detected",10); miss(!page.jsonLdTypes.length,"No JSON-LD structured data detected",10);
  if (page.title && (page.title.length<20 || page.title.length>70)) {issues.push("Title length is outside common SEO range");score-=5;}
  if (page.description && (page.description.length<70 || page.description.length>180)) {issues.push("Description length is outside common SEO range");score-=5;}
  return {score:Math.max(0,score),issues};
}

export async function investigate(rawUrl:string, profile=process.env.URL_AGENT_PROFILE || "startup-intelligence"): Promise<IntelligenceResult> {
  const first=await safeFetch(rawUrl); const root=parsePage(first.text,first.url,first.status);
  const maxPages=Math.max(1,Math.min(30,Number(process.env.URL_AGENT_MAX_PAGES||12)));
  const pages:PageSignal[]=[root]; const important:Record<string,string>={};
  const origin=new URL(root.url).origin;
  const candidates=root.links.filter(u=>{try{return !SAME_ORIGIN_ONLY || new URL(u).origin===origin}catch{return false}});
  const ranked=[...new Set(candidates.filter(u=>classifyImportant(u)))].slice(0,maxPages-1);
  for (const u of ranked) {
    const kind=classifyImportant(u); if(kind && !important[kind]) important[kind]=u;
    try { const r=await safeFetch(u); pages.push(parsePage(r.text,r.url,r.status)); } catch { /* fail soft */ }
  }
  const name=pickName(root); const type=entityType(root); const seo=seoScore(root);
  const socials=[...new Set(pages.flatMap(p=>p.socials))];
  const emails=[...new Set(pages.flatMap(p=>p.emails))];
  const contradictions:string[]=[];
  const names=[...new Set(pages.map(p=>p.title?.split(/[|·—–-]/)[0]?.trim()).filter(Boolean))] as string[];
  if(names.length>3) contradictions.push("Multiple materially different page-title identity candidates were observed; review entity naming evidence.");
  const fingerprint=createHash("sha256").update(JSON.stringify({url:root.url,title:root.title,description:root.description,socials,important,text:root.textSample.slice(0,3000)})).digest("hex");
  return {
    meta:{project:PROJECT.name,version:PROJECT.version,creator:PROJECT.creator,company:PROJECT.company,ecosystem:PROJECT.ecosystem,website:PROJECT.website,repository:PROJECT.repo},
    inputUrl:rawUrl,finalUrl:root.url,profile,
    entity:{type:field(type,root.jsonLdTypes.length?0.95:0.72,root.jsonLdTypes.length?"jsonld+heuristics":"content-heuristics",[root.url]),name:field(name,root.title?0.88:0.65,root.title?"title-consensus":"hostname-fallback",[root.url]),description:root.description?field(root.description,0.9,"meta-description",[root.url]):undefined},
    seo,socials,contacts:{emails},importantPages:important,pages,contradictions,fingerprint,observedAt:new Date().toISOString()
  };
}

export function generateListing(r:IntelligenceResult) {
  return {meta:r.meta,name:r.entity.name.value,description:r.entity.description?.value||"",category:r.entity.type.value,url:r.finalUrl,socials:r.socials,keywords:[r.entity.type.value,r.profile],confidence:Math.min(r.entity.name.confidence,r.entity.type.confidence),evidence:[...new Set([r.finalUrl,...Object.values(r.importantPages)])]};
}

export function compareResults(a:IntelligenceResult,b:IntelligenceResult){
  return {meta:a.meta,similar:{entityType:a.entity.type.value===b.entity.type.value,sharedSocials:a.socials.filter(x=>b.socials.includes(x)),sharedEmails:a.contacts.emails.filter(x=>b.contacts.emails.includes(x))},a:{url:a.finalUrl,name:a.entity.name.value,seo:a.seo.score},b:{url:b.finalUrl,name:b.entity.name.value,seo:b.seo.score}};
}
