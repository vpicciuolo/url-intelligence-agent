import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, v) => fs.writeFileSync(p, v, "utf8");

function replaceOnce(text, search, replacement, label) {
  const i = text.indexOf(search);
  if (i < 0) throw new Error(`Patch target not found: ${label}`);
  if (text.indexOf(search, i + search.length) >= 0) throw new Error(`Patch target not unique: ${label}`);
  return text.slice(0, i) + replacement + text.slice(i + search.length);
}

function replaceAllInFile(path, from, to) {
  const before = read(path);
  if (!before.includes(from)) throw new Error(`Expected ${JSON.stringify(from)} in ${path}`);
  write(path, before.split(from).join(to));
}

// ---------------------------------------------------------------------------
// Core provenance / conflict engine
// ---------------------------------------------------------------------------
{
  const path = "src/provenance.ts";
  let s = read(path);

  const constants = `const MONEY_PREDICATES = /(?:price|cost|amount|fee|revenue)/i;\n`;
  const helpers = `const MONEY_PREDICATES = /(?:price|cost|amount|fee|revenue)/i;\n\nconst METRIC_STRONG_SCOPE = new Set([\n  "active", "inactive", "daily", "weekly", "monthly", "annual", "yearly", "paid", "free",\n  "verified", "online", "offline", "available", "concurrent", "unique"\n]);\n\nconst METRIC_BASE_ALIASES: Record<string, string> = {\n  server: "mcp_servers", servers: "mcp_servers", mcp: "mcp_servers", mcps: "mcp_servers",\n  mcpserver: "mcp_servers", mcpservers: "mcp_servers",\n  follower: "followers", followers: "followers",\n  user: "users", users: "users", customer: "customers", customers: "customers",\n  member: "members", members: "members", employee: "employees", employees: "employees",\n  review: "reviews", reviews: "reviews", rating: "ratings", ratings: "ratings",\n  download: "downloads", downloads: "downloads", view: "views", views: "views",\n  like: "likes", likes: "likes", subscriber: "subscribers", subscribers: "subscribers",\n  install: "installs", installs: "installs", page: "pages", pages: "pages",\n  url: "urls", urls: "urls", item: "items", items: "items", product: "products", products: "products"\n};\n\nfunction metricWords(value: string): string[] {\n  return value\n    .replace(/^metric:/i, "")\n    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")\n    .normalize("NFKC")\n    .toLowerCase()\n    .replace(/[^\\p{L}\\p{N}]+/gu, "_")\n    .split("_")\n    .filter(Boolean);\n}\n\nfunction canonicalMetricPredicate(predicate: string): string {\n  const words = metricWords(predicate);\n  if (!words.length) return predicate;\n\n  const strongScope = [...new Set(words.filter(word => METRIC_STRONG_SCOPE.has(word)))].sort();\n  let base: string | undefined;\n\n  if (words.includes("page") || words.includes("pages")) {\n    if (words.includes("indexed") || words.includes("index")) base = "pages_indexed";\n  }\n  if (!base && words.some(word => ["server", "servers", "mcp", "mcps", "mcpserver", "mcpservers"].includes(word))) base = "mcp_servers";\n  if (!base) {\n    const candidates = words.filter(word => !METRIC_STRONG_SCOPE.has(word) && !["count", "number", "of", "total", "curated", "indexed", "index", "metric"].includes(word));\n    for (const word of candidates) {\n      if (METRIC_BASE_ALIASES[word]) { base = METRIC_BASE_ALIASES[word]; break; }\n    }\n    if (!base && candidates.length) base = candidates.join("_");\n  }\n  if (!base) return predicate;\n  return \`metric:\${strongScope.length ? strongScope.join("_") + "_" : ""}\${base}\`;\n}\n\nfunction canonicalPredicateForGrouping(observation: EvidenceObservation): string {\n  const predicate = observation.predicate;\n  const metricLike = predicate.startsWith("metric:") || /(?:_count|count$|followers?|following|views?|likes?|downloads?|users?|customers?|members?|employees?|reviews?|ratings?|pages?|urls?|items?|products?|subscribers?|installs?|servers?|mcps?)/i.test(predicate);\n  return metricLike ? canonicalMetricPredicate(predicate) : predicate;\n}\n`;
  s = replaceOnce(s, constants, helpers, "metric reconciliation helpers");

  const metricReturn = `  return \`metric:\${slug}\`;\n}`;
  const metricReturnNew = `  return canonicalMetricPredicate(\`metric:\${slug}\`);\n}`;
  s = replaceOnce(s, metricReturn, metricReturnNew, "metricPredicate canonicalization");

  const anchorsOld = `function factualAnchors(input: string): string[] {\n  const out = new Set<string>();\n  for (const match of input.matchAll(/(?:^|[^\\p{L}\\p{N}])([-+]?\\d[\\d\\s,.]*)(?:\\s*([kmb]))?(?:\\b|\\+|$)/giu)) {\n    const normalized = numericCore(\`\${match[1]}\${match[2] || ""}\`);\n    if (normalized?.kind === "number") out.add(\`n:\${normalized.value}\`);\n  }\n  for (const match of input.matchAll(/https?:\\/\\/[^\\s)\\]}>]+/gi)) out.add(\`u:\${normalizeUrl(match[0]) || match[0]}\`);\n  for (const match of input.matchAll(/\\b(?:USD|EUR|GBP|AED)\\b|[$€£]/gi)) out.add(\`c:\${match[0].toUpperCase()}\`);\n  return [...out].sort();\n}`;
  const anchorsNew = `function factualAnchors(input: string): string[] {\n  const out = new Set<string>();\n  for (const match of input.matchAll(/(?:^|[^\\p{L}\\p{N}])([-+]?\\d[\\d\\s,.]*)(?:\\s*([kmb]))?(\\+)?(?:\\b|$)/giu)) {\n    const normalized = numericCore(\`\${match[1]}\${match[2] || ""}\${match[3] || ""}\`);\n    // A lower/upper bound or approximation is not an incompatible factual anchor by itself.\n    // Exact-vs-bound compatibility is handled by the numeric claim resolver.\n    if (normalized?.kind === "number" && normalized.exact) out.add(\`n:\${normalized.value}\`);\n  }\n  for (const match of input.matchAll(/https?:\\/\\/[^\\s)\\]}>]+/gi)) out.add(\`u:\${normalizeUrl(match[0]) || match[0]}\`);\n  for (const match of input.matchAll(/\\b(?:USD|EUR|GBP|AED)\\b|[$€£]/gi)) out.add(\`c:\${match[0].toUpperCase()}\`);\n  return [...out].sort();\n}`;
  s = replaceOnce(s, anchorsOld, anchorsNew, "bound-aware factual anchors");

  const flagsOld = `  const flags: string[] = [];\n  const relations = new Set(comparisons.map(x => x.relation));`;
  const flagsNew = `  const flags: string[] = [];\n  const originalPredicates = unique(observations.map(x => x.predicate));\n  if (originalPredicates.length > 1) flags.push("semantic_cross_field_reconciliation");\n  const relations = new Set(comparisons.map(x => x.relation));`;
  s = replaceOnce(s, flagsOld, flagsNew, "cross-field reconciliation flag");

  const staleOld = `  const renderedExact = observations.filter(x => x.source.representation === "rendered_dom" && x.source.layer === "visible_dom" && x.normalizedValue.kind === "number" && x.normalizedValue.exact).sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];\n  const staticNumeric = observations.filter(x => ["meta", "open_graph", "twitter_card", "source_html"].includes(x.source.layer) && x.normalizedValue.kind === "number").sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];\n  if (renderedExact && staticNumeric && renderedExact.normalizedValue.kind === "number" && staticNumeric.normalizedValue.kind === "number") {\n    const current = renderedExact.normalizedValue.value;\n    const previous = staticNumeric.normalizedValue.value;\n    const delta = Math.abs(current - previous);\n    if (current > previous && delta / Math.max(1, previous) >= 0.05) flags.push("stale_metadata_suspected");\n  }`;
  const staleNew = `  const dynamicExact = observations\n    .filter(x => ["visible_dom", "api"].includes(x.source.layer) && x.normalizedValue.kind === "number" && x.normalizedValue.exact)\n    .sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];\n  const metadataNumeric = observations\n    .filter(x => ["meta", "open_graph", "twitter_card", "json_ld", "microdata", "rdfa"].includes(x.source.layer) && x.normalizedValue.kind === "number")\n    .sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];\n  if (dynamicExact && metadataNumeric && dynamicExact.normalizedValue.kind === "number" && metadataNumeric.normalizedValue.kind === "number") {\n    const current = dynamicExact.normalizedValue.value;\n    const previous = metadataNumeric.normalizedValue.value;\n    const deltaRatio = Math.abs(current - previous) / Math.max(1, Math.abs(previous));\n    const metadataIsBound = !metadataNumeric.normalizedValue.exact;\n    const compatibleWithBound = metadataIsBound && overlaps(\n      { min: metadataNumeric.normalizedValue.min ?? null, max: metadataNumeric.normalizedValue.max ?? null },\n      { min: current, max: current }\n    );\n    const dynamicTime = Date.parse(dynamicExact.temporal.observedAt || "");\n    const metadataTime = Date.parse(metadataNumeric.temporal.observedAt || "");\n    const notOlderObservation = !Number.isFinite(dynamicTime) || !Number.isFinite(metadataTime) || dynamicTime >= metadataTime;\n    if (notOlderObservation && current > previous && (compatibleWithBound || deltaRatio >= 0.02)) flags.push("stale_metadata_suspected");\n  }`;
  s = replaceOnce(s, staleOld, staleNew, "expanded stale metadata detection");

  const explanationOld = `  if (flags.includes("stale_metadata_suspected")) explanation.push("A higher exact rendered value materially exceeds a static metadata value; metadata staleness is suspected, not asserted as fact.");\n  if (flags.includes("precision_difference")) explanation.push("Approximate/lower-bound and exact values are treated as compatible when their numeric ranges overlap.");`;
  const explanationNew = `  if (flags.includes("semantic_cross_field_reconciliation")) explanation.push(\`Semantically equivalent metric labels were reconciled across fields while preserving the original predicates on each observation: \${originalPredicates.join(", ")}.\`);\n  if (flags.includes("stale_metadata_suspected")) explanation.push("A newer/dynamic exact value materially advances beyond metadata or structured evidence; metadata staleness is suspected, not asserted as fact.");\n  if (flags.includes("precision_difference")) explanation.push("Approximate/lower-bound and exact values are treated as compatible when their numeric ranges overlap.");`;
  s = replaceOnce(s, explanationOld, explanationNew, "resolution explanations");

  const groupOld = `  for (const observation of observations) {\n    const key = \`\${observation.subject}\\u0000\${observation.predicate}\`;\n    const current = groups.get(key) || [];\n    current.push(observation);\n    groups.set(key, current);\n  }`;
  const groupNew = `  for (const observation of observations) {\n    const groupedPredicate = canonicalPredicateForGrouping(observation);\n    const key = \`\${observation.subject}\\u0000\${groupedPredicate}\`;\n    const current = groups.get(key) || [];\n    current.push(observation);\n    groups.set(key, current);\n  }`;
  s = replaceOnce(s, groupOld, groupNew, "semantic metric grouping");

  const inspectOld = `export function inspectProvenance(report: ProvenanceReport, predicate?: string, limit = 100) {\n  const query = String(predicate || "").trim().toLowerCase();\n  const claims = report.claims.filter(claim => !query || claim.predicate.toLowerCase() === query || claim.predicate.toLowerCase().includes(query)).slice(0, Math.max(1, Math.min(500, limit)));\n  const ids = new Set(claims.flatMap(claim => claim.observationIds));\n  return { schemaVersion: report.schemaVersion, generatedAt: report.generatedAt, summary: report.summary, claims, observations: report.observations.filter(obs => ids.has(obs.id)), warnings: report.warnings };\n}`;
  const inspectNew = `export function inspectProvenance(report: ProvenanceReport, predicate?: string, limit = 100) {\n  const query = String(predicate || "").trim().toLowerCase();\n  const canonicalQuery = query ? canonicalMetricPredicate(query.startsWith("metric:") ? query : \`metric:\${query}\`) : "";\n  const matched = report.claims.filter(claim => {\n    if (!query) return true;\n    const value = claim.predicate.toLowerCase();\n    return value === query || value.includes(query) || value === canonicalQuery;\n  });\n  const effectiveLimit = Math.max(1, Math.min(500, limit));\n  const claims = matched.slice(0, effectiveLimit);\n  const ids = new Set(claims.flatMap(claim => claim.observationIds));\n  return {\n    schemaVersion: report.schemaVersion, generatedAt: report.generatedAt, summary: report.summary,\n    selection: { predicate: predicate || null, totalMatchedClaims: matched.length, returnedClaims: claims.length, limit: effectiveLimit, truncated: matched.length > claims.length },\n    claims, observations: report.observations.filter(obs => ids.has(obs.id)), warnings: report.warnings\n  };\n}`;
  s = replaceOnce(s, inspectOld, inspectNew, "inspect provenance completeness metadata");

  const verifyOld = `export function verifyClaim(report: ProvenanceReport, predicate: string, claimedValue: JsonValue) {\n  const normalized = normalizeEvidenceValue(claimedValue, predicate);\n  const matches = report.claims.filter(claim => claim.predicate.toLowerCase() === predicate.toLowerCase() || claim.predicate.toLowerCase().includes(predicate.toLowerCase()));`;
  const verifyNew = `export function verifyClaim(report: ProvenanceReport, predicate: string, claimedValue: JsonValue) {\n  const canonicalPredicate = canonicalMetricPredicate(predicate.startsWith("metric:") ? predicate : \`metric:\${predicate}\`);\n  const normalized = normalizeEvidenceValue(claimedValue, canonicalPredicate);\n  const query = predicate.toLowerCase();\n  const matches = report.claims.filter(claim => claim.predicate.toLowerCase() === query || claim.predicate.toLowerCase().includes(query) || claim.predicate === canonicalPredicate);`;
  s = replaceOnce(s, verifyOld, verifyNew, "canonical claim verification");

  write(path, s);
}

// ---------------------------------------------------------------------------
// MCP machine-readable output schemas
// ---------------------------------------------------------------------------
{
  const path = "src/mcp.ts";
  let s = read(path);
  const old = `function outputSchemaFor(name: string): Record<string, unknown> {\n  if (name === "verify_claim") return objectSchema({ meta: { type: "object" }, verification: { type: "object", properties: { status: { type: "string", enum: ["supported", "compatible", "contradicted", "not_found"] }, predicate: { type: "string" }, claimedValue: {}, normalized: {}, matches: { type: "array", items: { type: "object" } } }, required: ["status", "predicate"] } }, ["verification"]);\n  if (name === "inspect_provenance") return objectSchema({ meta: { type: "object" }, provenance: { type: "object", properties: { schemaVersion: { type: "string" }, summary: { type: "object" }, claims: { type: "array", items: { type: "object" } }, observations: { type: "array", items: { type: "object" } }, warnings: { type: "array", items: { type: "string" } } }, required: ["schemaVersion", "summary", "claims", "observations"] }, prov: { type: "object" } }, ["provenance"]);\n  return { type: "object", additionalProperties: true };\n}`;
  const replacement = `const normalizedEvidenceSchema = {\n  type: "object",\n  required: ["kind"],\n  additionalProperties: true,\n  properties: {\n    kind: { type: "string", enum: ["string", "number", "date", "url", "money", "boolean", "json"] },\n    value: {}, folded: { type: "string" }, exact: { type: "boolean" }, approximate: { type: "boolean" },\n    min: { type: ["number", "null"] }, max: { type: ["number", "null"] }, comparator: { type: "string" },\n    amount: { type: "number" }, currency: { type: "string" }, cadence: { type: "string" }, precision: { type: "string" }\n  }\n} as const;\n\nconst observationSchema = {\n  type: "object", additionalProperties: true,\n  required: ["id", "subject", "predicate", "rawValue", "normalizedValue", "source", "temporal", "integrity", "quality"],\n  properties: {\n    id: { type: "string" }, subject: { type: "string" }, predicate: { type: "string" }, rawValue: {}, normalizedValue: normalizedEvidenceSchema,\n    source: { type: "object", additionalProperties: true, required: ["pageUrl", "finalUrl", "representation", "layer"], properties: {\n      pageUrl: { type: "string" }, finalUrl: { type: "string" }, representation: { type: "string" }, layer: { type: "string" }, property: { type: "string" }, locator: { type: "string" }, jsonPointer: { type: "string" }, visibility: { type: "string" }\n    } },\n    temporal: { type: "object", additionalProperties: true, required: ["observedAt"], properties: { observedAt: { type: "string" }, publishedAt: { type: "string" }, modifiedAt: { type: "string" }, lastModified: { type: "string" } } },\n    integrity: { type: "object", additionalProperties: true, required: ["observationHash"], properties: { observationHash: { type: "string" }, documentHash: { type: "string" } } },\n    quality: { type: "object", additionalProperties: false, required: ["extractionConfidence", "sourceAuthority", "freshnessConfidence"], properties: { extractionConfidence: { type: "number" }, sourceAuthority: { type: "number" }, freshnessConfidence: { type: "number" } } }\n  }\n} as const;\n\nconst conflictSchema = {\n  type: "object", additionalProperties: false, required: ["observationIds", "relation", "severity", "explanation"],\n  properties: { observationIds: { type: "array", items: { type: "string" } }, relation: { type: "string" }, severity: { type: "string", enum: ["none", "low", "medium", "high"] }, explanation: { type: "string" } }\n} as const;\n\nconst claimSchema = {\n  type: "object", additionalProperties: true, required: ["id", "subject", "predicate", "value", "status", "observationIds", "flags", "resolution", "conflicts"],\n  properties: {\n    id: { type: "string" }, subject: { type: "string" }, predicate: { type: "string" }, value: normalizedEvidenceSchema, displayValue: {},\n    status: { type: "string", enum: ["consensus", "compatible_variation", "drift", "conflict", "insufficient_evidence"] },\n    observationIds: { type: "array", items: { type: "string" } }, flags: { type: "array", items: { type: "string" } },\n    resolution: { type: "object", additionalProperties: false, required: ["confidence", "policy", "explanation"], properties: { preferredObservationId: { type: "string" }, confidence: { type: "number" }, policy: { type: "string" }, explanation: { type: "array", items: { type: "string" } } } },\n    conflicts: { type: "array", items: conflictSchema }\n  }\n} as const;\n\nconst provenanceSchema = {\n  type: "object", additionalProperties: true, required: ["schemaVersion", "generatedAt", "summary", "claims", "observations", "warnings"],\n  properties: {\n    schemaVersion: { type: "string" }, generatedAt: { type: "string" },\n    summary: { type: "object", additionalProperties: true, required: ["totalObservations", "totalClaims", "conflictClaims", "driftClaims", "staleMetadataSuspected"], properties: { totalObservations: { type: "integer" }, totalClaims: { type: "integer" }, consensusClaims: { type: "integer" }, compatibleClaims: { type: "integer" }, driftClaims: { type: "integer" }, conflictClaims: { type: "integer" }, staleMetadataSuspected: { type: "integer" }, layers: { type: "array", items: { type: "string" } }, representations: { type: "array", items: { type: "string" } } } },\n    selection: { type: "object", additionalProperties: false, properties: { predicate: { type: ["string", "null"] }, totalMatchedClaims: { type: "integer" }, returnedClaims: { type: "integer" }, limit: { type: "integer" }, truncated: { type: "boolean" } } },\n    claims: { type: "array", items: claimSchema }, observations: { type: "array", items: observationSchema }, warnings: { type: "array", items: { type: "string" } }\n  }\n} as const;\n\nfunction outputSchemaFor(name: string): Record<string, unknown> {\n  if (name === "verify_claim") return objectSchema({ meta: { type: "object" }, verification: { type: "object", additionalProperties: true, required: ["status", "predicate"], properties: { status: { type: "string", enum: ["supported", "compatible", "contradicted", "not_found"] }, predicate: { type: "string" }, claimedValue: {}, normalized: normalizedEvidenceSchema, matches: { type: "array", items: { type: "object", additionalProperties: true, required: ["claimId", "predicate", "status", "relation", "severity", "explanation", "confidence", "observationIds"], properties: { claimId: { type: "string" }, predicate: { type: "string" }, status: { type: "string" }, relation: { type: "string" }, severity: { type: "string" }, explanation: { type: "string" }, resolvedValue: {}, confidence: { type: "number" }, observationIds: { type: "array", items: { type: "string" } } } } } } }, ["verification"]);\n  if (name === "inspect_provenance") return objectSchema({ meta: { type: "object" }, provenance: provenanceSchema, prov: { type: "object" } }, ["provenance"]);\n  if (name === "investigate_url") return { type: "object", additionalProperties: true, properties: { provenance: provenanceSchema } };\n  return { type: "object", additionalProperties: true };\n}`;
  s = replaceOnce(s, old, replacement, "typed MCP output schemas");
  write(path, s);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
{
  const path = "tests/basic.test.ts";
  let s = read(path);
  s = s.replace('analyzeRepresentation, buildProvenanceReport, exportProvJson, normalizeEvidenceValue, verifyClaim', 'analyzeRepresentation, buildProvenanceReport, exportProvJson, inspectProvenance, normalizeEvidenceValue, verifyClaim');
  if (!s.includes('inspectProvenance')) throw new Error("Failed to add inspectProvenance import");
  s = s.replace('import { diffSnapshots } from "../src/monitor.js";', 'import { diffSnapshots } from "../src/monitor.js";\nimport { mcpTools } from "../src/mcp.js";');
  s = s.replace('assert.equal(PROJECT.version, "1.3.0");', 'assert.equal(PROJECT.version, "1.4.0");');
  s = s.replace('assert.equal(PROJECT.release, "Semantic Conflict Intelligence Release");', 'assert.equal(PROJECT.release, "Semantic Reconciliation & Source Verification Release");');

  const marker = `test("structured exact price disagreement becomes a field-level conflict", () => {`;
  const additions = `test("v1.4 reconciles semantically equivalent cross-field metrics while preserving original observations", () => {\n  const page = provenancePage(\n    \`<html><head><meta property="og:description" content="80,000+ curated MCPs"></head><body><h1>Stats</h1></body></html>\`,\n    \`<html><head><meta property="og:description" content="80,000+ curated MCPs"></head><body><div>100,502 servers</div></body></html>\`\n  );\n  const report = buildProvenanceReport([page]);\n  const claim = report.claims.find(x => x.predicate === "metric:mcp_servers");\n  assert.ok(claim);\n  assert.notEqual(claim?.status, "conflict");\n  assert.ok(claim?.flags.includes("semantic_cross_field_reconciliation"));\n  assert.ok(claim?.flags.includes("precision_difference"));\n  assert.ok(claim?.flags.includes("stale_metadata_suspected"));\n  assert.equal(claim?.displayValue, 100502);\n  const originals = new Set(report.observations.filter(x => claim?.observationIds.includes(x.id)).map(x => x.predicate));\n  assert.ok(originals.has("metric:curated_mcps"));\n  assert.ok(originals.has("metric:mcp_servers") || originals.has("metric:servers"));\n});\n\ntest("v1.4 does not merge explicitly scoped active metrics with unscoped totals", () => {\n  const page = provenancePage(\n    \`<html><head><meta property="og:description" content="80,000 active servers"></head><body></body></html>\`,\n    \`<html><body><div>100,502 servers</div></body></html>\`\n  );\n  const report = buildProvenanceReport([page]);\n  assert.ok(report.claims.some(x => x.predicate === "metric:active_mcp_servers"));\n  assert.ok(report.claims.some(x => x.predicate === "metric:mcp_servers"));\n});\n\ntest("v1.4 keeps lower-bound numbers inside prose from becoming a hard factual disagreement", () => {\n  const url = "https://bounds.test/";\n  const html = \`<html><head><meta name="description" content="80,000+ servers available"><meta property="og:description" content="100,502 servers available"></head><body></body></html>\`;\n  const rep = analyzeRepresentation(html, url, "source_html", { finalUrl: url });\n  const page: PageSignal = { ...parsePage(html, url, 200), representations: [rep], observations: rep.observations };\n  const report = buildProvenanceReport([page]);\n  const description = report.claims.find(x => x.predicate === "description");\n  assert.ok(description);\n  assert.notEqual(description?.status, "conflict");\n});\n\ntest("v1.4 provenance inspection reports truncation instead of looking complete", () => {\n  const url = "https://selection.test/";\n  const html = \`<html><head><meta name="description" content="Example"><meta property="og:title" content="Example"></head><body>42 users</body></html>\`;\n  const rep = analyzeRepresentation(html, url, "source_html", { finalUrl: url });\n  const page: PageSignal = { ...parsePage(html, url, 200), representations: [rep], observations: rep.observations };\n  const report = buildProvenanceReport([page]);\n  const inspected = inspectProvenance(report, undefined, 1) as any;\n  assert.equal(inspected.selection.returnedClaims, 1);\n  assert.equal(inspected.selection.truncated, report.claims.length > 1);\n  assert.equal(inspected.selection.totalMatchedClaims, report.claims.length);\n});\n\ntest("v1.4 MCP provenance schemas describe nested claims and observations", () => {\n  const tools = mcpTools(undefined, true) as any[];\n  const inspect = tools.find(tool => tool.name === "inspect_provenance");\n  const verify = tools.find(tool => tool.name === "verify_claim");\n  assert.ok(inspect?.outputSchema?.properties?.provenance?.properties?.claims?.items?.properties?.predicate);\n  assert.ok(inspect?.outputSchema?.properties?.provenance?.properties?.observations?.items?.properties?.source);\n  assert.ok(verify?.outputSchema?.properties?.verification?.properties?.matches?.items?.properties?.relation);\n});\n\n${marker}`;
  s = replaceOnce(s, marker, additions, "v1.4 regression tests");
  write(path, s);
}

// ---------------------------------------------------------------------------
// Version and release attribution
// ---------------------------------------------------------------------------
replaceAllInFile("package.json", '"version": "1.3.0"', '"version": "1.4.0"');
replaceAllInFile("src/credits.ts", 'version: "1.3.0"', 'version: "1.4.0"');
replaceAllInFile("src/credits.ts", 'release: "Semantic Conflict Intelligence Release"', 'release: "Semantic Reconciliation & Source Verification Release"');
write("VERSION", "1.4.0\n");
write("hf-space/VERSION", "1.4.0\n");

// Current-release documentation only. Historical changelog/version text is preserved.
{
  const path = "README.md";
  let s = read(path);
  s = s.replace('release-v1.3.0-00c853', 'release-v1.4.0-00c853').replace('alt="v1.3.0"', 'alt="v1.4.0"');
  const oldHeading = '## 🧬 What\'s new in v1.3.0 — Semantic Conflict Intelligence';
  const newSection = `## 🧬 What's new in v1.4.0 — Semantic Reconciliation & Source Verification\n\nVersion **1.4.0** strengthens the existing provenance engine so downstream agents inherit evidence they can inspect rather than certainty they must trust.\n\n- **Semantic cross-field reconciliation** connects the same metric across Open Graph, Twitter Cards, JSON-LD, API/runtime evidence and rendered content even when labels differ, while preserving each original observation and keeping explicit scope differences separate.\n- **Stronger stale-metadata detection** compares dynamic visible/API values against Meta, Open Graph, Twitter Cards, JSON-LD, Microdata and RDFa evidence without treating freshness as certainty.\n- **Bound-aware factual comparison** prevents values such as \`80,000+\` and \`100,502\` from becoming false contradictions when the lower bound is logically compatible.\n- **Traceable source resolution** keeps competing raw/normalised values, timestamps, confidence dimensions, source layers and reasoning attached to the resolved claim.\n- **Complete inspection metadata** states when a filtered/limited provenance response is truncated.\n- **Typed MCP output contracts** now describe nested provenance observations, claims, conflicts and verification matches for \`inspect_provenance\`, \`verify_claim\` and the provenance portion of \`investigate_url\`.\n\nSelecting a preferred value never deletes the alternatives. If the evidence cannot resolve a disagreement, the claim remains a conflict or drift state and the evidence trail stays intact.\n\n### Previous release: v1.3.0 — Semantic Conflict Intelligence\n\n`;
  s = replaceOnce(s, oldHeading + '\n\n', newSection, "README v1.4 section");
  write(path, s);
}

{
  const path = "CHANGELOG.md";
  let s = read(path);
  const anchor = "## 1.3.0 — Semantic Conflict Intelligence Release";
  const entry = `## 1.4.0 — Semantic Reconciliation & Source Verification Release\n\n### Semantic cross-field reconciliation\n- Reconciles semantically equivalent metric predicates across metadata, structured data, rendered content and runtime/API evidence.\n- Preserves every original observation predicate, raw value, normalized value, source layer and timestamp.\n- Keeps explicit scope qualifiers such as active/daily/monthly/paid separate to reduce false merges.\n\n### Stale metadata and claim comparison\n- Expands stale-metadata detection to Meta, Open Graph, Twitter Cards, JSON-LD, Microdata and RDFa against visible/API evidence.\n- Keeps staleness as a suspected evidence state rather than asserting it as fact.\n- Fixes free-text factual-anchor handling so lower/upper bounds and approximations do not become false exact contradictions.\n\n### Source verification and machine contracts\n- Claim verification now understands reconciled metric aliases.\n- Provenance inspection exposes selection/truncation metadata.\n- MCP output schemas now describe nested observations, claims, conflicts and verification matches instead of opaque object placeholders.\n\n### Tests and hosted release\n- Adds regression coverage for cross-field aliases, scope separation, lower-bound prose, completeness metadata and MCP schema depth.\n- Updates GitHub/Hugging Face release metadata and live deployment checks to v1.4.0.\n\n`;
  s = replaceOnce(s, anchor, entry + anchor, "CHANGELOG v1.4 entry");
  write(path, s);
}

replaceAllInFile("VERSIONING.md", "Current application release: **1.3.0**", "Current application release: **1.4.0**");
replaceAllInFile("SECURITY.md", "Current release: **1.3.0**", "Current release: **1.4.0**");
replaceAllInFile("docs/DEPLOYMENT.md", "This guide covers URL Intelligence Agent v1.3.0.", "This guide covers URL Intelligence Agent v1.4.0.");
replaceAllInFile("docs/REMOTE_MCP.md", "Current application release: **1.3.0**", "Current application release: **1.4.0**");
replaceAllInFile("docs/API.md", "A correct v1.3.0 deployment must report version `1.3.0`", "A correct v1.4.0 deployment must report version `1.4.0`");

{
  const path = "docs/PROVENANCE.md";
  let s = read(path);
  const heading = "# Claim provenance and temporal consistency";
  const note = `# Claim provenance and temporal consistency\n\n## v1.4 semantic reconciliation and source verification\n\nv1.4 adds a reconciliation layer before claim resolution. Metric labels from different evidence surfaces can be grouped when they are semantically equivalent, while strong scope qualifiers remain separate. The original predicates are never rewritten in the observation ledger; only the derived claim grouping is canonicalized.\n\nStale metadata is evaluated across Meta/Open Graph/Twitter Cards/JSON-LD/Microdata/RDFa against visible or runtime/API evidence. A stale signal is explicitly probabilistic evidence: it does not delete the older value and does not convert compatible lower bounds into contradictions.\n\nInspection responses include selection metadata so a limited response cannot be mistaken for the complete evidence set.\n`;
  s = replaceOnce(s, heading, note, "PROVENANCE v1.4 docs");
  write(path, s);
}

{
  const path = "docs/MCP.md";
  let s = read(path);
  const first = "# MCP";
  if (s.startsWith(first)) {
    s = s.replace(first, `${first}\n\n> **v1.4:** provenance/verification output schemas now expose typed nested claims, observations, conflicts and selection metadata for downstream agents.`);
  } else {
    s = `> **v1.4:** provenance/verification output schemas now expose typed nested claims, observations, conflicts and selection metadata for downstream agents.\n\n${s}`;
  }
  write(path, s);
}

{
  const path = "hf-space/README.md";
  let s = read(path);
  s = s.replace("# 🧠 URL Intelligence Agent v1.3.0", "# 🧠 URL Intelligence Agent v1.4.0");
  const marker = "# 🧠 URL Intelligence Agent v1.4.0";
  const addition = `${marker}\n\n**v1.4 — Semantic Reconciliation & Source Verification**\n\nThe live Space now reconciles equivalent metrics across metadata/structured/rendered/runtime evidence, expands suspected stale-metadata detection, preserves lower-bound semantics such as \`80,000+\`, exposes complete source reasoning, and publishes typed provenance/verification MCP contracts. Competing observations remain visible even when a preferred value is selected.\n`;
  s = replaceOnce(s, marker, addition, "HF README v1.4 intro");
  write(path, s);
}

replaceAllInFile("hf-space/index.html", '"softwareVersion":"1.3.0"', '"softwareVersion":"1.4.0"');

{
  const path = ".github/workflows/deploy-huggingface.yml";
  let s = read(path);
  s = s.replaceAll("1.3.0", "1.4.0");
  s = s.replaceAll("v1.3 semantic conflict release", "v1.4 semantic reconciliation release");
  s = s.replaceAll("Hugging Face v1.3 payload metadata OK", "Hugging Face v1.4 payload metadata OK");
  s = s.replaceAll("v1.3 enhancement code", "v1.4 enhancement code");
  s = s.replaceAll("Live /health OK: v1.3.0", "Live /health OK: v1.4.0");
  s = s.replaceAll("Visible UI contains v1.3 Evidence Inspector", "Visible UI contains v1.4 Evidence Inspector");
  s = s.replaceAll("url-intelligence-agent-deploy-check/1.3", "url-intelligence-agent-deploy-check/1.4");
  write(path, s);
}

console.log("v1.4 release patches applied successfully");
