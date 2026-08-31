import { createInterface } from "node:readline";
import { stdin, stdout, stderr } from "node:process";
import { actionNames, runAction } from "./agent.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";

const toolDescriptions: Record<string, string> = {
  investigate_url: "Run complete evidence-first URL intelligence.",
  probe_url: "Safely probe a public URL and its redirect/status chain.",
  map_site: "Map important pages, sitemap URLs and crawled page signals.",
  deep_crawl: "Bounded multi-page crawl with robots policy, depth and rendering fallback.",
  resolve_entity: "Resolve entity identity/type and provenance graph.",
  find_social_profiles: "Discover normalized public social profiles.",
  find_contacts: "Discover public email, phone and contact-page signals.",
  detect_technologies: "Fingerprint public web technologies using multiple deterministic signals.",
  brand_intelligence: "Extract logo, favicon, color, handle and tagline candidates.",
  audit_seo: "Audit metadata, canonical, Open Graph, structured data and crawl discoverability.",
  audit_security: "Audit visible HTTP security-header posture.",
  audit_quality: "Audit basic quality/accessibility/performance signals.",
  audit_trust: "Score public trust/transparency signals with explainable checks.",
  entity_graph: "Build an evidence-linked entity relationship graph.",
  competitor_intelligence: "Discover comparison/alternative candidates from public site context.",
  generate_listing: "Generate a ready-to-review directory/marketplace/ranking listing.",
  rag_export: "Return citation-friendly clean documents for RAG ingestion.",
  compare_urls: "Compare two URLs/entities and their technologies, contacts and signals.",
  batch_investigate: "Investigate many URLs with bounded worker concurrency.",
  create_snapshot: "Persist a normalized monitoring snapshot.",
  diff_snapshot: "Compare current state with the previous stored snapshot and optionally webhook changes.",
  ai_reason: "Run optional OpenAI-compatible evidence-only reasoning over collected intelligence.",
  list_plugins: "List registered URL Intelligence Agent plugins."
};

function schemaFor(name: string) {
  if (name === "batch_investigate") return { type: "object", properties: { urls: { type: "array", items: { type: "string", format: "uri" } }, profile: { type: "string" }, concurrency: { type: "integer", minimum: 1, maximum: 20 } }, required: ["urls"] };
  if (name === "compare_urls") return { type: "object", properties: { url: { type: "string", format: "uri" }, url2: { type: "string", format: "uri" }, profile: { type: "string" } }, required: ["url", "url2"] };
  if (name === "list_plugins") return { type: "object", properties: {} };
  return { type: "object", properties: { url: { type: "string", format: "uri" }, profile: { type: "string" }, force: { type: "boolean" }, instruction: { type: "string" }, snapshot: { type: "string" }, webhook: { type: "boolean" }, crawl: { type: "object" } }, required: name === "probe_url" ? ["url"] : ["url"] };
}

export async function startMcpServer(): Promise<void> {
  stderr.write(`${creditsLine()}\nMCP stdio server active. Protocol output is reserved on stdout.\n`);
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let id: unknown = null;
    try {
      const req = JSON.parse(line) as any;
      id = req.id ?? null;
      let result: unknown;
      if (req.method === "initialize") {
        result = { protocolVersion: req.params?.protocolVersion || "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "url-intelligence-agent", version: PROJECT.version }, instructions: `Evidence-first public URL intelligence by ${PROJECT.company}. ${PROJECT.website}` };
      } else if (req.method === "notifications/initialized") {
        continue;
      } else if (req.method === "ping") {
        result = {};
      } else if (req.method === "tools/list") {
        result = { tools: actionNames().map(name => ({ name, title: name.replace(/_/g, " "), description: toolDescriptions[name] || name, inputSchema: schemaFor(name), annotations: { readOnlyHint: !["create_snapshot", "diff_snapshot"].includes(name), destructiveHint: false, openWorldHint: true } })) };
      } else if (req.method === "tools/call") {
        const name = String(req.params?.name || "");
        const args = (req.params?.arguments || {}) as Record<string, unknown>;
        const value = await runAction(name, args as any);
        result = { content: [{ type: "text", text: JSON.stringify({ attribution: attributionObject(), result: value }, null, 2) }], structuredContent: { attribution: attributionObject(), result: value }, isError: false };
      } else if (req.method === "resources/list") {
        result = { resources: [{ uri: "horno://about", name: "HORNO ecosystem", description: "Project attribution and ecosystem links", mimeType: "application/json" }] };
      } else if (req.method === "resources/read" && req.params?.uri === "horno://about") {
        result = { contents: [{ uri: "horno://about", mimeType: "application/json", text: JSON.stringify({ attribution: attributionObject(), horno: PROJECT.website, easy: PROJECT.easy, space: PROJECT.space, repository: PROJECT.repo }, null, 2) }] };
      } else {
        throw Object.assign(new Error(`Method not found: ${req.method}`), { code: -32601 });
      }
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
    } catch (error) {
      const e = error as Error & { code?: number };
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: e.code || -32000, message: e.message }, attribution: attributionObject() }) + "\n");
    }
  }
}
