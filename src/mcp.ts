import { createInterface } from "node:readline";
import { stdin, stdout, stderr } from "node:process";
import { actionNames, runAction } from "./agent.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";

export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

export const toolDescriptions: Record<string, string> = {
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

export function schemaFor(name: string): Record<string, unknown> {
  if (name === "batch_investigate") return { type: "object", properties: { urls: { type: "array", items: { type: "string", format: "uri" } }, profile: { type: "string" }, concurrency: { type: "integer", minimum: 1, maximum: 20 } }, required: ["urls"] };
  if (name === "compare_urls") return { type: "object", properties: { url: { type: "string", format: "uri" }, url2: { type: "string", format: "uri" }, profile: { type: "string" } }, required: ["url", "url2"] };
  if (name === "list_plugins") return { type: "object", properties: {} };
  return { type: "object", properties: { url: { type: "string", format: "uri" }, profile: { type: "string" }, force: { type: "boolean" }, instruction: { type: "string" }, snapshot: { type: "string" }, webhook: { type: "boolean" }, crawl: { type: "object" } }, required: ["url"] };
}

export type McpMessage = {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: Record<string, any>;
};

export type McpProcessOptions = {
  allowedTools?: Set<string>;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
};

export function negotiatedProtocol(requested: unknown): string {
  const value = String(requested || "");
  if ((MCP_PROTOCOL_VERSIONS as readonly string[]).includes(value)) return value;
  return MCP_PROTOCOL_VERSIONS[0];
}

export function mcpTools(allowedTools?: Set<string>): Array<Record<string, unknown>> {
  return actionNames()
    .filter((name) => !allowedTools || allowedTools.has(name))
    .map((name) => ({
      name,
      title: name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      description: toolDescriptions[name] || name,
      inputSchema: schemaFor(name),
      annotations: {
        readOnlyHint: !["create_snapshot", "diff_snapshot"].includes(name),
        destructiveHint: false,
        openWorldHint: true
      }
    }));
}

export async function processMcpMessage(req: McpMessage, options: McpProcessOptions = {}): Promise<unknown | undefined> {
  if (!req || req.jsonrpc !== "2.0") throw Object.assign(new Error("Invalid JSON-RPC request"), { code: -32600 });

  if (req.method === "initialize") {
    return {
      protocolVersion: negotiatedProtocol(req.params?.protocolVersion),
      capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
      serverInfo: { name: "url-intelligence-agent", version: PROJECT.version },
      instructions: `Evidence-first public URL intelligence by ${PROJECT.company}. Remote MCP: https://vpicciuolo-url-intelligence-agent.hf.space/mcp · Source: ${PROJECT.repo}`
    };
  }
  if (req.method === "notifications/initialized" || req.method === "notifications/cancelled") return undefined;
  if (req.method === "ping") return {};
  if (req.method === "tools/list") return { tools: mcpTools(options.allowedTools) };
  if (req.method === "tools/call") {
    const name = String(req.params?.name || "");
    if (!name) throw Object.assign(new Error("Tool name is required"), { code: -32602 });
    if (options.allowedTools && !options.allowedTools.has(name)) throw Object.assign(new Error(`Tool not available on this MCP endpoint: ${name}`), { code: -32602 });
    const args = (req.params?.arguments || {}) as Record<string, unknown>;
    const value = options.callTool ? await options.callTool(name, args) : await runAction(name, args as any);
    return {
      content: [{ type: "text", text: JSON.stringify({ attribution: attributionObject(), result: value }, null, 2) }],
      structuredContent: { attribution: attributionObject(), result: value },
      isError: false
    };
  }
  if (req.method === "resources/list") {
    return {
      resources: [
        { uri: "url-intelligence://about", name: "URL Intelligence Agent", description: "Project attribution, public MCP endpoint and ecosystem links", mimeType: "application/json" }
      ]
    };
  }
  if (req.method === "resources/read" && req.params?.uri === "url-intelligence://about") {
    return {
      contents: [{
        uri: "url-intelligence://about",
        mimeType: "application/json",
        text: JSON.stringify({
          attribution: attributionObject(),
          remoteMcp: "https://vpicciuolo-url-intelligence-agent.hf.space/mcp",
          huggingFace: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",
          repository: PROJECT.repo,
          horno: PROJECT.website,
          easy: PROJECT.easy,
          space: PROJECT.space
        }, null, 2)
      }]
    };
  }

  throw Object.assign(new Error(`Method not found: ${req.method}`), { code: -32601 });
}

export async function startMcpServer(): Promise<void> {
  stderr.write(`${creditsLine()}\nMCP stdio server active. Protocol output is reserved on stdout.\n`);
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let id: unknown = null;
    try {
      const req = JSON.parse(line) as McpMessage;
      id = req.id ?? null;
      const result = await processMcpMessage(req);
      if (result === undefined) continue;
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
    } catch (error) {
      const e = error as Error & { code?: number };
      stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: e.code || -32000, message: e.message }, attribution: attributionObject() }) + "\n");
    }
  }
}
