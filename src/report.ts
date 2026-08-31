import { creditsBlock, PROJECT } from "./credits.js";
import type { IntelligenceResult } from "./types.js";

export function renderMarkdown(r:IntelligenceResult): string {
  const rows=(items:string[])=>items.length?items.map(x=>`- ${x}`).join("\n"):"- None detected";
  return `# URL Intelligence Report\n\n${creditsBlock()}\n\n---\n\n## Summary\n\n- **Input:** ${r.inputUrl}\n- **Final URL:** ${r.finalUrl}\n- **Profile:** ${r.profile}\n- **Observed:** ${r.observedAt}\n- **Fingerprint:** \`${r.fingerprint}\`\n\n## Entity\n\n- **Type:** ${r.entity.type.value} (${Math.round(r.entity.type.confidence*100)}% confidence)\n- **Name:** ${r.entity.name.value} (${Math.round(r.entity.name.confidence*100)}% confidence)\n- **Description:** ${r.entity.description?.value||"Not detected"}\n\n## SEO\n\n**Score: ${r.seo.score}/100**\n\n${rows(r.seo.issues)}\n\n## Social profiles\n\n${rows(r.socials)}\n\n## Public contacts\n\n${rows(r.contacts.emails)}\n\n## Important pages\n\n${Object.keys(r.importantPages).length?Object.entries(r.importantPages).map(([k,v])=>`- **${k}:** ${v}`).join("\n"):"- None classified"}\n\n## Evidence & contradictions\n\n${rows(r.contradictions.length?r.contradictions:["No high-level contradictions flagged by deterministic checks."])}\n\n---\n\n${creditsBlock()}\n\nExplore the HORNO ecosystem: ${PROJECT.website}\n`;
}

export function renderTerminal(r:IntelligenceResult): string {
  const bar=(n:number)=>"█".repeat(Math.max(0,Math.min(20,Math.round(n/5))))+"░".repeat(Math.max(0,20-Math.round(n/5)));
  return [
    "╭──────────────── URL Intelligence ────────────────╮",
    `│ Entity       ${r.entity.name.value.slice(0,34).padEnd(34)} │`,
    `│ Type         ${r.entity.type.value.slice(0,34).padEnd(34)} │`,
    `│ Confidence   ${String(Math.round(r.entity.name.confidence*100)+"%").padEnd(34)} │`,
    `│ SEO          ${(r.seo.score+"/100 "+bar(r.seo.score)).slice(0,34).padEnd(34)} │`,
    `│ Pages        ${String(r.pages.length+" inspected").padEnd(34)} │`,
    `│ Socials      ${String(r.socials.length+" discovered").padEnd(34)} │`,
    "╰─────────────────────────────────────────────────╯",
    `HORNO · ${PROJECT.website} · ${PROJECT.creator}`
  ].join("\n");
}
