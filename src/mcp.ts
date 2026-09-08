import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { stdin, stdout, stderr } from "node:process";
import { actionNames, runAction } from "./agent.js";
import { createPersistence } from "./adapters.js";
import { PROJECT, attributionObject, creditsLine } from "./credits.js";

export const MODERN_MCP_PROTOCOL = "2026-07-28" as const;
export const MCP_PROTOCOL_VERSIONS = [MODERN_MCP_PROTOCOL, "2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const MCP_TASKS_EXTENSION = "io.modelcontextprotocol/tasks" as const;

export const toolDescriptions: Record<string, string> = {
  investigate_url: "Run complete evidence-first URL intelligence with claim-level provenance, drift/conflict analysis and optional external corroboration.",
  inspect_provenance: "Inspect field-level observations, resolved claims, source layers, representations, conflicts and provenance export.",
  verify_claim: "Verify a supplied claim value against normalized collected observations and return supported, compatible or contradicted status.",
  probe_url: "Safely probe a public URL and its redirect/status chain.",
  domain_intelligence: "Inspect public DNS, TLS and mail/domain signals.",
  render_page: "Render a JavaScript-heavy public page with bounded browser networking and optional same-origin runtime API evidence.",
  map_site: "Map important pages, sitemap URLs and crawled page signals.",
  deep_crawl: "Bounded multi-page crawl with robots policy, depth, rendering fallback and evidence representations.",
  resolve_entity: "Resolve entity identity/type and provenance graph.",
  find_social_profiles: "Discover normalized public social profiles.",
  find_contacts: "Discover public email, phone and contact-page signals.",
  detect_technologies: "Fingerprint public web technologies using multiple deterministic signals.",
  brand_intelligence: "Extract logo, favicon, color, handle and tagline candidates.",
  audit_seo: "Audit metadata, canonical, Open Graph, structured data and crawl discoverability with provenance context.",
  audit_security: "Audit visible HTTP security-header posture.",
  audit_quality: "Audit basic quality/accessibility/performance signals.",
  audit_trust: "Score public trust/transparency signals with explainable checks.",
  entity_graph: "Build an evidence-linked entity relationship graph.",
  competitor_intelligence: "Discover comparison/alternative candidates from public site context.",
  generate_listing: "Generate a ready-to-review directory/marketplace/ranking listing.",
  rag_export: "Return citation-friendly clean documents for RAG ingestion.",
  structured_data: "Inventory JSON-LD and provenance-aware structured-data observations.",
  api_discovery: "Discover public API surfaces and bounded same-origin runtime API evidence.",
  compliance_signals: "Discover public policy/compliance signals without making a legal compliance determination.",
  people_team: "Extract public people/team signals from structured first-party data.",
  commerce_intelligence: "Extract public commerce/pricing signals with claim provenance.",
  content_freshness: "Extract public freshness/date signals and temporal provenance.",
  link_intelligence: "Classify discovered internal/external links and external domains.",
  check_links: "Perform a bounded public URL health check.",
  knowledge_export: "Export evidence-aware knowledge facts plus interoperable provenance.",
  compare_urls: "Compare two URLs/entities, technologies, contacts and resolved claim predicates.",
  batch_investigate: "Investigate many URLs with bounded worker concurrency.",
  create_snapshot: "Persist a normalized monitoring snapshot including resolved claims and HTTP validators.",
  diff_snapshot: "Compare current state with the previous stored snapshot and optionally webhook changes.",
  ai_reason: "Run optional OpenAI-compatible evidence-only reasoning over collected intelligence.",
  list_plugins: "List registered URL Intelligence Agent plugins."
};

const urlProperty = { type: "string", format: "uri", pattern: "^https?://" } as const;
const profileProperty = { type: "string", minLength: 1, maxLength: 80 } as const;
const crawlProperty = {
  type: "object",
  additionalProperties: false,
  properties: {
    maxPages: { type: "integer", minimum: 1, maximum: 500 },
    maxDepth: { type: "integer", minimum: 0, maximum: 10 },
    concurrency: { type: "integer", minimum: 1, maximum: 20 },
    sameOrigin: { type: "boolean" },
    obeyRobots: { type: "boolean" },
    allowPatterns: { type: "array", items: { type: "string" }, maxItems: 100 },
    denyPatterns: { type: "array", items: { type: "string" }, maxItems: 100 },
    renderMode: { type: "string", enum: ["off", "auto", "always", "playwright"] }
  }
} as const;

function objectSchema(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}) };
}

export function schemaFor(name: string): Record<string, unknown> {
  if (name === "batch_investigate") return objectSchema({ urls: { type: "array", items: urlProperty, minItems: 1, maxItems: 100 }, profile: profileProperty, concurrency: { type: "integer", minimum: 1, maximum: 20 }, sync: { type: "boolean" } }, ["urls"]);
  if (name === "compare_urls") return objectSchema({ url: urlProperty, url2: urlProperty, profile: profileProperty, sync: { type: "boolean" } }, ["url", "url2"]);
  if (name === "list_plugins") return objectSchema({});
  if (name === "inspect_provenance") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, predicate: { type: "string", minLength: 1, maxLength: 200 }, limit: { type: "integer", minimum: 1, maximum: 500 }, format: { type: "string", enum: ["json", "prov"] }, crawl: crawlProperty }, ["url"]);
  if (name === "verify_claim") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, predicate: { type: "string", minLength: 1, maxLength: 200 }, value: {}, crawl: crawlProperty }, ["url", "predicate", "value"]);
  if (name === "render_page") return objectSchema({ url: urlProperty, includeHtml: { type: "boolean" }, captureNetwork: { type: "boolean" } }, ["url"]);
  if (name === "check_links") return objectSchema({ url: urlProperty, profile: profileProperty, limit: { type: "integer", minimum: 1, maximum: 300 }, concurrency: { type: "integer", minimum: 1, maximum: 20 }, external: { type: "boolean" } }, ["url"]);
  if (name === "diff_snapshot") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, snapshot: { type: "string" }, webhook: { type: "boolean" }, crawl: crawlProperty }, ["url"]);
  if (name === "ai_reason") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, instruction: { type: "string", maxLength: 8000 }, crawl: crawlProperty }, ["url"]);
  if (name === "investigate_url" || name === "resolve_entity") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, externalResearch: { type: "boolean" }, searchProvider: { type: "string", maxLength: 80 }, crawl: crawlProperty, sync: { type: "boolean" } }, ["url"]);
  if (name === "map_site" || name === "deep_crawl") return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, crawl: crawlProperty, sync: { type: "boolean" } }, ["url"]);
  return objectSchema({ url: urlProperty, profile: profileProperty, force: { type: "boolean" }, crawl: crawlProperty }, ["url"]);
}

function outputSchemaFor(name: string): Record<string, unknown> {
  if (name === "verify_claim") return objectSchema({ meta: { type: "object" }, verification: { type: "object", properties: { status: { type: "string", enum: ["supported", "compatible", "contradicted", "not_found"] }, predicate: { type: "string" }, claimedValue: {}, normalized: {}, matches: { type: "array", items: { type: "object" } } }, required: ["status", "predicate"] } }, ["verification"]);
  if (name === "inspect_provenance") return objectSchema({ meta: { type: "object" }, provenance: { type: "object", properties: { schemaVersion: { type: "string" }, summary: { type: "object" }, claims: { type: "array", items: { type: "object" } }, observations: { type: "array", items: { type: "object" } }, warnings: { type: "array", items: { type: "string" } } }, required: ["schemaVersion", "summary", "claims", "observations"] }, prov: { type: "object" } }, ["provenance"]);
  return { type: "object", additionalProperties: true };
}

export type McpMessage = {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: Record<string, any>;
  _meta?: Record<string, any>;
};

export type McpProcessOptions = {
  allowedTools?: Set<string>;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  protocolVersion?: string;
};

export function negotiatedProtocol(requested: unknown): string {
  const value = String(requested || "");
  if ((MCP_PROTOCOL_VERSIONS as readonly string[]).includes(value)) return value;
  return MCP_PROTOCOL_VERSIONS[0];
}

function isModern(req: McpMessage, options: McpProcessOptions): boolean {
  return options.protocolVersion === MODERN_MCP_PROTOCOL || req.method === "server/discover" || req._meta?.protocolVersion === MODERN_MCP_PROTOCOL || req.params?._meta?.protocolVersion === MODERN_MCP_PROTOCOL;
}

function serverInfoMeta(): Record<string, unknown> {
  return { "io.modelcontextprotocol/serverInfo": { name: "url-intelligence-agent", title: PROJECT.name, version: PROJECT.version, repository: PROJECT.repo } };
}

function modernEnvelope<T extends Record<string, unknown>>(value: T, modern: boolean): T & Record<string, unknown> {
  return modern ? { ...value, _meta: serverInfoMeta() } : value;
}

function clientSupportsTasks(req: McpMessage): boolean {
  const all = [req._meta, req.params?._meta, req.params?.clientCapabilities, req.params?._meta?.clientCapabilities].filter(Boolean) as Record<string, any>[];
  return all.some(meta => Boolean(meta?.extensions?.[MCP_TASKS_EXTENSION] || meta?.["io.modelcontextprotocol/clientCapabilities"]?.extensions?.[MCP_TASKS_EXTENSION] || meta?.clientCapabilities?.extensions?.[MCP_TASKS_EXTENSION]));
}

export function mcpTools(allowedTools?: Set<string>, modern = false): Array<Record<string, unknown>> {
  return actionNames()
    .filter((name) => !allowedTools || allowedTools.has(name))
    .sort()
    .map((name) => ({
      name,
      title: name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      description: toolDescriptions[name] || name,
      inputSchema: schemaFor(name),
      outputSchema: outputSchemaFor(name),
      annotations: {
        readOnlyHint: !["create_snapshot", "diff_snapshot"].includes(name),
        destructiveHint: false,
        openWorldHint: true
      },
      ...(modern && ["investigate_url", "deep_crawl", "compare_urls", "batch_investigate"].includes(name) ? { execution: { taskSupport: "optional" } } : {})
    }));
}

type McpTaskStatus = "working" | "completed" | "failed" | "cancelled";
type McpTaskRecord = {
  resultType: "task";
  taskId: string;
  status: McpTaskStatus;
  createdAt: string;
  lastUpdatedAt: string;
  ttlMs: number;
  pollIntervalMs: number;
  tool: string;
  progress?: number;
  result?: unknown;
  error?: { code: number; message: string };
};

const taskPersistence = createPersistence();
const TASK_COLLECTION = "mcp-tasks";
const taskTtlMs = (): number => Math.max(60_000, Math.min(7 * 86_400_000, Number(process.env.URL_AGENT_MCP_TASK_TTL_MS || 86_400_000)));

async function saveTask(task: McpTaskRecord): Promise<void> { await taskPersistence.put(TASK_COLLECTION, task.taskId, task); }
async function getTask(id: string): Promise<McpTaskRecord | undefined> {
  const task = await taskPersistence.get<McpTaskRecord>(TASK_COLLECTION, id);
  if (!task) return undefined;
  if (Date.now() - new Date(task.createdAt).getTime() > task.ttlMs) return undefined;
  return task;
}

async function startTask(name: string, args: Record<string, unknown>, callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>): Promise<McpTaskRecord> {
  const createdAt = new Date().toISOString();
  const task: McpTaskRecord = { resultType: "task", taskId: randomUUID(), status: "working", createdAt, lastUpdatedAt: createdAt, ttlMs: taskTtlMs(), pollIntervalMs: 1000, tool: name, progress: 0 };
  await saveTask(task);
  void (async () => {
    try {
      const result = await callTool(name, args);
      const latest = await getTask(task.taskId);
      if (latest?.status === "cancelled") return;
      await saveTask({ ...task, status: "completed", result, progress: 1, lastUpdatedAt: new Date().toISOString() });
    } catch (error) {
      const e = error as Error & { code?: number };
      const latest = await getTask(task.taskId);
      if (latest?.status === "cancelled") return;
      await saveTask({ ...task, status: "failed", error: { code: e.code || -32000, message: e.message }, progress: 1, lastUpdatedAt: new Date().toISOString() });
    }
  })();
  return task;
}

function taskPublic(task: McpTaskRecord): Record<string, unknown> {
  return {
    resultType: "task",
    taskId: task.taskId,
    status: task.status,
    createdAt: task.createdAt,
    lastUpdatedAt: task.lastUpdatedAt,
    ttlMs: task.ttlMs,
    pollIntervalMs: task.pollIntervalMs,
    ...(task.progress !== undefined ? { progress: task.progress } : {}),
    ...(task.status === "completed" ? { result: task.result } : {}),
    ...(task.status === "failed" ? { error: task.error } : {})
  };
}

function expensiveTool(name: string): boolean { return ["investigate_url", "deep_crawl", "compare_urls", "batch_investigate"].includes(name); }

export async function processMcpMessage(req: McpMessage, options: McpProcessOptions = {}): Promise<unknown | undefined> {
  if (!req || req.jsonrpc !== "2.0") throw Object.assign(new Error("Invalid JSON-RPC request"), { code: -32600 });
  const modern = isModern(req, options);

  if (req.method === "server/discover") {
    return modernEnvelope({
      supportedVersions: [MODERN_MCP_PROTOCOL],
      serverInfo: { name: "url-intelligence-agent", title: PROJECT.name, version: PROJECT.version },
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        extensions: { [MCP_TASKS_EXTENSION]: { version: "1.0", taskMethods: ["tasks/get", "tasks/update", "tasks/cancel"] } }
      },
      instructions: `Evidence-first public URL intelligence with claim provenance by ${PROJECT.company}. Source: ${PROJECT.repo}`,
      ttlMs: 300000,
      cacheScope: "public"
    }, true);
  }

  if (req.method === "initialize") {
    const protocolVersion = negotiatedProtocol(req.params?.protocolVersion);
    return {
      protocolVersion,
      capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
      serverInfo: { name: "url-intelligence-agent", version: PROJECT.version },
      instructions: `Evidence-first public URL intelligence by ${PROJECT.company}. Remote MCP: https://vpicciuolo-url-intelligence-agent.hf.space/mcp · Source: ${PROJECT.repo}`
    };
  }
  if (req.method === "notifications/initialized" || req.method === "notifications/cancelled") return undefined;
  if (req.method === "ping") return modernEnvelope({}, modern);

  if (["tasks/get", "tasks/update", "tasks/cancel"].includes(String(req.method))) {
    if (!modern) throw Object.assign(new Error("MCP Tasks requires protocol 2026-07-28"), { code: -32601 });
    if (!clientSupportsTasks(req)) throw Object.assign(new Error("Client must advertise the io.modelcontextprotocol/tasks extension"), { code: -32003 });
    const taskId = String(req.params?.taskId || req.params?.id || "");
    if (!taskId) throw Object.assign(new Error("taskId is required"), { code: -32602 });
    const task = await getTask(taskId);
    if (!task) throw Object.assign(new Error("Task not found or expired"), { code: -32004 });
    if (req.method === "tasks/cancel") {
      if (task.status === "working") { task.status = "cancelled"; task.lastUpdatedAt = new Date().toISOString(); await saveTask(task); }
      return modernEnvelope(taskPublic(task), true);
    }
    if (req.method === "tasks/update") {
      return modernEnvelope(taskPublic(task), true);
    }
    return modernEnvelope(taskPublic(task), true);
  }

  if (req.method === "tools/list") return modernEnvelope({ tools: mcpTools(options.allowedTools, modern), ...(modern ? { ttlMs: 300000, cacheScope: "public" } : {}) }, modern);

  if (req.method === "tools/call") {
    const name = String(req.params?.name || "");
    if (!name) throw Object.assign(new Error("Tool name is required"), { code: -32602 });
    if (!actionNames().includes(name)) throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
    if (options.allowedTools && !options.allowedTools.has(name)) throw Object.assign(new Error(`Tool not available on this MCP endpoint: ${name}`), { code: -32602 });
    const args = (req.params?.arguments || {}) as Record<string, unknown>;
    const callTool = options.callTool || ((toolName: string, toolArgs: Record<string, unknown>) => runAction(toolName, toolArgs as any));
    if (modern && clientSupportsTasks(req) && expensiveTool(name) && args.sync !== true) {
      const task = await startTask(name, args, callTool);
      return modernEnvelope(taskPublic(task), true);
    }
    const value = await callTool(name, args);
    const payload = {
      content: [{ type: "text", text: JSON.stringify({ attribution: attributionObject(), result: value }, null, 2) }],
      structuredContent: { attribution: attributionObject(), result: value },
      isError: false,
      ...(modern ? { resultType: "complete" } : {})
    };
    return modernEnvelope(payload, modern);
  }

  if (req.method === "resources/list") {
    return modernEnvelope({
      resources: [
        { uri: "url-intelligence://about", name: "URL Intelligence Agent", description: "Project attribution, public MCP endpoint and ecosystem links", mimeType: "application/json" },
        { uri: "url-intelligence://provenance-schema", name: "Provenance schema", description: "Claim-level provenance model and consistency taxonomy", mimeType: "application/json" }
      ],
      ...(modern ? { ttlMs: 300000, cacheScope: "public" } : {})
    }, modern);
  }
  if (req.method === "resources/read" && req.params?.uri === "url-intelligence://about") {
    return modernEnvelope({
      contents: [{
        uri: "url-intelligence://about",
        mimeType: "application/json",
        text: JSON.stringify({
          attribution: attributionObject(),
          remoteMcp: "https://vpicciuolo-url-intelligence-agent.hf.space/mcp",
          huggingFace: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",
          repository: PROJECT.repo,
          hornoNetwork: PROJECT.website,
          easy: PROJECT.easy,
          space: PROJECT.space,
          protocols: MCP_PROTOCOL_VERSIONS
        }, null, 2)
      }],
      ...(modern ? { ttlMs: 300000, cacheScope: "public" } : {})
    }, modern);
  }
  if (req.method === "resources/read" && req.params?.uri === "url-intelligence://provenance-schema") {
    return modernEnvelope({
      contents: [{
        uri: "url-intelligence://provenance-schema",
        mimeType: "application/json",
        text: JSON.stringify({
          schemaVersion: "1.0",
          observation: ["subject", "predicate", "rawValue", "normalizedValue", "source", "temporal", "integrity", "quality"],
          claimStatus: ["consensus", "compatible_variation", "drift", "conflict", "insufficient_evidence"],
          notableFlags: ["representation_drift", "structured_vs_visible_mismatch", "metadata_vs_visible_mismatch", "precision_difference", "freshness_divergence", "stale_metadata_suspected"]
        }, null, 2)
      }],
      ...(modern ? { ttlMs: 300000, cacheScope: "public" } : {})
    }, modern);
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
