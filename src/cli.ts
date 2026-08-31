#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { actionNames, compareResults, investigate, runAction } from "./agent.js";
import { PROJECT, creditsBlock, creditsLine } from "./credits.js";
import { renderHtml, renderMarkdown, renderTerminal } from "./report.js";
import { startApiServer } from "./server.js";
import { startMcpServer } from "./mcp.js";
import { DEFAULT_BENCHMARK, runBenchmark } from "./benchmark.js";
import { listPlugins, loadPlugin } from "./plugins.js";
import { watchUrl } from "./watch.js";
import type { BenchmarkCase } from "./types.js";

function banner(): void {
  console.log(`\n╭──────────────────────────────────────────────────────────────────╮\n│  URL INTELLIGENCE AGENT v${PROJECT.version.padEnd(38)}│\n│  URL in. Identity, evidence and intelligence out.               │\n│                                                                  │\n│  ${PROJECT.company.padEnd(64)}│\n│  Founder & Lead Engineer: ${PROJECT.creator.padEnd(39)}│\n│  HORNO ecosystem: ${PROJECT.website.padEnd(46)}│\n╰──────────────────────────────────────────────────────────────────╯\n`);
}

type MenuItem = { n: string; label: string; action?: string; special?: string };
const menuActions: MenuItem[] = [
  { n: "1", label: "Full URL investigation", action: "investigate_url" },
  { n: "2", label: "Safe URL probe / redirects", action: "probe_url" },
  { n: "3", label: "Domain + DNS + mail + TLS intelligence", action: "domain_intelligence" },
  { n: "4", label: "Deep crawl + sitemap mapping", action: "deep_crawl" },
  { n: "5", label: "Render JavaScript page / browser fallback", action: "render_page" },
  { n: "6", label: "Resolve entity + evidence graph", action: "resolve_entity" },
  { n: "7", label: "Find social profiles", action: "find_social_profiles" },
  { n: "8", label: "Find public contacts + people", action: "find_contacts" },
  { n: "9", label: "Technology fingerprinting", action: "detect_technologies" },
  { n: "10", label: "Brand intelligence", action: "brand_intelligence" },
  { n: "11", label: "SEO audit", action: "audit_seo" },
  { n: "12", label: "Security-header posture audit", action: "audit_security" },
  { n: "13", label: "Quality/accessibility/performance audit", action: "audit_quality" },
  { n: "14", label: "Trust/transparency signals", action: "audit_trust" },
  { n: "15", label: "Entity relationship graph", action: "entity_graph" },
  { n: "16", label: "Competitor/comparison intelligence", action: "competitor_intelligence" },
  { n: "17", label: "Structured-data inventory", action: "structured_data" },
  { n: "18", label: "API / OpenAPI / GraphQL discovery", action: "api_discovery" },
  { n: "19", label: "Privacy/compliance public signals", action: "compliance_signals" },
  { n: "20", label: "Team / people extraction", action: "people_team" },
  { n: "21", label: "Commerce / pricing intelligence", action: "commerce_intelligence" },
  { n: "22", label: "Content freshness signals", action: "content_freshness" },
  { n: "23", label: "Link graph / external-domain intelligence", action: "link_intelligence" },
  { n: "24", label: "Broken-link / URL health check", action: "check_links" },
  { n: "25", label: "Generate marketplace/directory listing", action: "generate_listing" },
  { n: "26", label: "RAG-ready document export", action: "rag_export" },
  { n: "27", label: "Knowledge/fact export with provenance", action: "knowledge_export" },
  { n: "28", label: "Generate Markdown + HTML + JSON reports", special: "report" },
  { n: "29", label: "Compare two URLs", special: "compare" },
  { n: "30", label: "Batch enrichment worker", special: "batch" },
  { n: "31", label: "Create monitoring snapshot", action: "create_snapshot" },
  { n: "32", label: "Diff current URL against stored snapshot", action: "diff_snapshot" },
  { n: "33", label: "Continuous scheduled watch + webhook", special: "watch" },
  { n: "34", label: "Optional AI evidence reasoning", action: "ai_reason" },
  { n: "35", label: "Run reliability benchmark", special: "benchmark" },
  { n: "36", label: "Plugins / extension SDK", special: "plugins" },
  { n: "37", label: "HTTP API server", special: "serve" },
  { n: "38", label: "MCP server", special: "mcp" },
  { n: "39", label: "About & credits", special: "about" },
  { n: "0", label: "Exit", special: "exit" }
];

async function interactive(): Promise<void> {
  banner(); console.log("Actions"); for (const item of menuActions) console.log(` ${item.n.padStart(2)}. ${item.label}`); console.log(`\n${creditsLine()}\n`);
  const rl = createInterface({ input, output });
  try {
    const choice = await rl.question("Select action: "); const item = menuActions.find(x => x.n === choice); if (!item) throw new Error("Unknown menu choice");
    if (item.special === "exit") return;
    if (item.special === "about") { console.log("\n" + creditsBlock()); return; }
    if (item.special === "serve") { const p = await rl.question("Port [8787]: "); await startApiServer(Number(p || 8787)); return; }
    if (item.special === "mcp") { rl.close(); await startMcpServer(); return; }
    if (item.special === "benchmark") { console.log(JSON.stringify(await runBenchmark(DEFAULT_BENCHMARK), null, 2)); return; }
    if (item.special === "plugins") { console.log(JSON.stringify({ plugins: listPlugins(), load: "url-agent plugin-load <module>", credits: creditsBlock() }, null, 2)); return; }
    if (item.special === "batch") { console.log("Use: url-agent batch <urls.txt|urls.json> [--concurrency 4]"); return; }
    const url = await rl.question("Public URL: ");
    if (item.special === "compare") { const url2 = await rl.question("Second public URL: "); console.log(JSON.stringify(compareResults(await investigate(url), await investigate(url2)), null, 2)); return; }
    if (item.special === "report") { const result = await investigate(url); await writeReports(result); console.log(renderTerminal(result)); return; }
    if (item.special === "watch") { const mins = Number(await rl.question("Check every N minutes [5]: ") || 5); const controller = new AbortController(); process.once("SIGINT", () => controller.abort()); console.log("Watching. Press Ctrl+C to stop."); await watchUrl(url, { intervalMs: Math.max(1, mins) * 60000, signal: controller.signal, onCheck: event => console.log(JSON.stringify({ ...event, credits: creditsLine() }, null, 2)) }); return; }
    const args: Record<string, unknown> = { url };
    if (item.action === "ai_reason") args.instruction = await rl.question("Instruction [Analyze evidence]: ") || "Analyze the evidence, summarize the entity, opportunities and uncertainties with source URLs.";
    const result = await runAction(item.action || "investigate_url", args as any);
    if (item.action === "investigate_url") console.log(renderTerminal(result as any) + "\n\n" + JSON.stringify(result, null, 2)); else console.log(JSON.stringify(result, null, 2));
  } finally { rl.close(); }
}

async function writeReports(result: Awaited<ReturnType<typeof investigate>>, prefix = `url-intelligence-${Date.now()}`): Promise<void> {
  await Promise.all([writeFile(`${prefix}.md`, renderMarkdown(result)), writeFile(`${prefix}.html`, renderHtml(result)), writeFile(`${prefix}.json`, JSON.stringify(result, null, 2))]);
  console.log(`Reports written:\n  ${prefix}.md\n  ${prefix}.html\n  ${prefix}.json\n${creditsLine()}`);
}

function argValue(args: string[], name: string): string | undefined { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
function urlArg(args: string[]): string | undefined { return args.find(x => /^https?:\/\//i.test(x)); }
async function readBatch(path: string): Promise<string[]> { const text = await readFile(path, "utf8"); if (path.endsWith(".json")) { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed.map(String); if (Array.isArray(parsed.urls)) return parsed.urls.map(String); } return text.split(/\r?\n/).map(x => x.trim()).filter(x => /^https?:\/\//i.test(x)); }

async function main(args: string[]): Promise<void> {
  const raw = args.includes("--raw"); const clean = args.filter(x => x !== "--raw"); const [cmd = "", ...rest] = clean;
  if (!cmd) { await interactive(); return; }
  if (cmd === "mcp") { await startMcpServer(); return; }
  if (!raw) banner();
  if (cmd === "about") { console.log(creditsBlock()); return; }
  if (cmd === "actions") { console.log(JSON.stringify({ actions: actionNames(), credits: creditsBlock() }, null, 2)); return; }
  if (cmd === "serve") { await startApiServer(Number(argValue(rest, "--port") || 8787), argValue(rest, "--host") || process.env.HOST || "127.0.0.1"); return; }
  if (cmd === "plugin-load") { const module = rest[0]; if (!module) throw new Error("plugin-load requires a module path/package"); await loadPlugin(module); console.log(JSON.stringify({ loaded: module, plugins: listPlugins(), credits: creditsBlock() }, null, 2)); return; }
  if (cmd === "plugins") { console.log(JSON.stringify({ plugins: listPlugins(), credits: creditsBlock() }, null, 2)); return; }
  if (cmd === "benchmark") { const file = rest.find(x => x.endsWith(".json")); const cases = file ? JSON.parse(await readFile(file, "utf8")) as BenchmarkCase[] : DEFAULT_BENCHMARK; console.log(JSON.stringify(await runBenchmark(cases), null, 2)); return; }
  if (cmd === "batch") { const file = rest[0]; if (!file) throw new Error("batch requires a text/JSON file containing URLs"); const urls = await readBatch(file); console.log(JSON.stringify(await runAction("batch_investigate", { urls, profile: argValue(rest, "--profile"), concurrency: Number(argValue(rest, "--concurrency") || 4) }), null, 2)); return; }
  if (cmd === "compare") { const urls = rest.filter(x => /^https?:\/\//i.test(x)); if (urls.length < 2) throw new Error("compare requires two public URLs"); console.log(JSON.stringify(await runAction("compare_urls", { url: urls[0], url2: urls[1], profile: argValue(rest, "--profile") }), null, 2)); return; }
  if (cmd === "watch") { const url = urlArg(rest); if (!url) throw new Error("watch requires a public URL"); const controller = new AbortController(); process.once("SIGINT", () => controller.abort()); const intervalMs = Math.max(60_000, Number(argValue(rest, "--interval") || 300000)); console.log(`Watching ${url} every ${Math.round(intervalMs / 60000)} minute(s). Press Ctrl+C to stop.`); await watchUrl(url, { intervalMs, profile: argValue(rest, "--profile"), webhook: !rest.includes("--no-webhook"), signal: controller.signal, onCheck: event => console.log(JSON.stringify({ ...event, credits: creditsLine() }, null, 2)) }); return; }
  const url = urlArg(rest); if (!url) throw new Error("Provide a public http/https URL"); const profile = argValue(rest, "--profile");
  if (cmd === "report") { const result = await investigate(url, profile); await writeReports(result, argValue(rest, "--out") || `url-intelligence-${Date.now()}`); console.log(renderTerminal(result)); return; }
  const commandMap: Record<string, string> = { investigate: "investigate_url", probe: "probe_url", domain: "domain_intelligence", render: "render_page", "map-site": "map_site", crawl: "deep_crawl", entity: "resolve_entity", socials: "find_social_profiles", contacts: "find_contacts", technologies: "detect_technologies", brand: "brand_intelligence", seo: "audit_seo", security: "audit_security", quality: "audit_quality", trust: "audit_trust", graph: "entity_graph", competitors: "competitor_intelligence", structured: "structured_data", apis: "api_discovery", compliance: "compliance_signals", people: "people_team", commerce: "commerce_intelligence", freshness: "content_freshness", links: "link_intelligence", "check-links": "check_links", listing: "generate_listing", rag: "rag_export", knowledge: "knowledge_export", snapshot: "create_snapshot", diff: "diff_snapshot", reason: "ai_reason" };
  const action = commandMap[cmd] || (actionNames().includes(cmd) ? cmd : undefined); if (!action) throw new Error(`Unknown command: ${cmd}. Run 'url-agent actions'.`);
  const value = await runAction(action, { url, profile, force: rest.includes("--force"), snapshot: argValue(rest, "--snapshot"), webhook: !rest.includes("--no-webhook"), instruction: argValue(rest, "--instruction"), limit: Number(argValue(rest, "--limit") || 50), concurrency: Number(argValue(rest, "--concurrency") || 5), includeHtml: !rest.includes("--no-html") });
  if (action === "investigate_url" && !raw) console.log(renderTerminal(value as any) + "\n"); console.log(JSON.stringify(value, null, 2)); if (!raw) console.log(`\n${creditsLine()}`);
}

main(process.argv.slice(2)).catch(error => { console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}\n${creditsBlock()}`); process.exitCode = 1; });
