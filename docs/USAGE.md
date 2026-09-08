# URL Intelligence Agent — Complete Usage Guide

This guide covers v1.2.0 and provenance schema 1.0.

## Install

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
```

Requires Node.js 18.17+.

## Full investigation

```bash
node dist/src/cli.js investigate https://example.com
```

Development mode:

```bash
npm run dev -- investigate https://example.com
```

The complete result includes entity, web research, audits, pages, technologies, brand, graph, RAG, contradictions/warnings and the v1.2 `provenance` object.

## Understanding provenance

For a claim, inspect:

```text
result.provenance.claims[]
result.provenance.observations[]
```

Each observation records the raw/normalized value plus source representation/layer, timestamps, hashes and confidence dimensions.

A claim can be:

```text
consensus
compatible_variation
drift
conflict
insufficient_evidence
```

### Example

If metadata says `80,000+` and rendered content says `100,502`, v1.2 can keep both observations and report that they are logically compatible while still flagging stale metadata/representation drift.

## CLI action mode

List actions:

```bash
node dist/src/cli.js actions
```

The v1.2 registry contains 36 machine callable actions.

## Provenance action

Through the library/API/MCP action registry:

```ts
import { runAction } from "url-intelligence-agent";

const evidence = await runAction("inspect_provenance", {
  url: "https://example.com",
  predicate: "pages_indexed",
  format: "json"
});
```

PROV export:

```ts
const evidence = await runAction("inspect_provenance", {
  url: "https://example.com",
  format: "prov"
});
```

## Verify a claim

```ts
const result = await runAction("verify_claim", {
  url: "https://example.com",
  predicate: "pages_indexed",
  value: 100502
});
```

Status:

```text
supported
compatible
contradicted
not_found
```

## TypeScript API

```ts
import {
  investigate,
  runAction,
  verifyClaim,
  exportProvJson
} from "url-intelligence-agent";

const result = await investigate("https://example.com", {
  externalResearch: false,
  crawl: {
    maxPages: 20,
    maxDepth: 2,
    renderMode: "off"
  }
});

console.log(result.entity.name);
console.log(result.provenance.summary);

const verification = verifyClaim(
  result.provenance,
  "pages_indexed",
  100502
);

console.log(verification);

const prov = exportProvJson(result.provenance);
```

## Crawl settings

```ts
const result = await investigate("https://example.com", {
  crawl: {
    maxPages: 30,
    maxDepth: 3,
    concurrency: 4,
    sameOrigin: true,
    obeyRobots: true,
    renderMode: "auto"
  }
});
```

Rendering modes:

```text
off
auto
always
playwright
```

## Rendering

Rendering is optional.

Local Playwright:

```bash
npm install playwright
npx playwright install chromium
```

Environment:

```env
URL_AGENT_RENDER_MODE=auto
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

Browser rendering is a separate network trust boundary. See `docs/NETWORK_SECURITY.md`.

## Runtime JSON evidence

When rendering is configured to capture network evidence, bounded same origin JSON responses can become provenance observations.

Use this for public page data only.

## HTTP API

Start:

```bash
npm run serve
```

Full investigation:

```bash
curl -X POST http://127.0.0.1:8787/investigate \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","externalResearch":false}'
```

Provenance:

```bash
curl -X POST http://127.0.0.1:8787/action/inspect_provenance \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","format":"json"}'
```

Claim verification:

```bash
curl -X POST http://127.0.0.1:8787/action/verify_claim \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","predicate":"pages_indexed","value":100502}'
```

See `docs/API.md`.

## Local MCP

```bash
npm run mcp
```

The stdio process writes protocol JSON to stdout and startup/human information to stderr.

## Remote MCP

Official endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Supported revisions:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

See `docs/MCP.md` and `docs/REMOTE_MCP.md`.

## MCP Tasks

For modern 2026-07-28 clients advertising the Tasks extension, selected expensive actions can execute asynchronously.

Task capable actions:

```text
investigate_url
deep_crawl
compare_urls
batch_investigate
```

Set `sync: true` for synchronous behavior when needed.

## External web corroboration

Full investigation can search/fetch public external sources when enabled.

```ts
const result = await investigate("https://example.com", {
  externalResearch: true
});
```

External corroboration is intentionally separate from target side extraction confidence and claim resolution.

Configured search providers can include Google CSE, SearXNG, Brave Search, Serper and Tavily.

## Monitoring

Create snapshot:

```ts
const out = await runAction("create_snapshot", {
  url: "https://example.com"
});
```

Diff snapshot:

```ts
const diff = await runAction("diff_snapshot", {
  url: "https://example.com"
});
```

v1.2 snapshots include claim values/statuses, provenance fingerprint and HTTP validators.

Repeated snapshots are stored in timestamped history, allowing temporal drift analysis.

## RAG

```ts
const out = await runAction("rag_export", {
  url: "https://example.com"
});
```

RAG documents are deterministic/citation friendly. If a RAG workflow needs claim level verification, keep the provenance object alongside document chunks.

## Knowledge export

```ts
const out = await runAction("knowledge_export", {
  url: "https://example.com"
});
```

The knowledge output is provenance aware and can include interoperable evidence lineage.

## Reports

The CLI/report modules support Markdown, HTML and JSON oriented outputs. The hosted Hugging Face UI additionally exposes branded PDF, JSON, Markdown and HTML report downloads for signed in users.

## Domain intelligence

```ts
const out = await runAction("domain_intelligence", {
  url: "https://example.com"
});
```

This inspects public DNS/mail/TLS signals.

## SEO

```ts
const out = await runAction("audit_seo", {
  url: "https://example.com"
});
```

## Security posture

```ts
const out = await runAction("audit_security", {
  url: "https://example.com"
});
```

This is observable public header posture, not penetration testing.

## Technology detection

```ts
const out = await runAction("detect_technologies", {
  url: "https://example.com"
});
```

## Batch investigations

```ts
const out = await runAction("batch_investigate", {
  urls: [
    "https://example.com",
    "https://example.org"
  ],
  concurrency: 4
});
```

Keep concurrency bounded.

## Optional AI reasoning

Configure an OpenAI compatible endpoint only if needed:

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=gpt-5-mini
```

Then call `ai_reason`.

AI reasoning is optional and should not be treated as the provenance source.

## Configuration baseline

```env
URL_AGENT_TIMEOUT_MS=10000
URL_AGENT_MAX_BYTES=3000000
URL_AGENT_MAX_REDIRECTS=6
URL_AGENT_MAX_PAGES=30
URL_AGENT_MAX_DEPTH=3
URL_AGENT_CONCURRENCY=4
URL_AGENT_SAME_ORIGIN=true
URL_AGENT_OBEY_ROBOTS=true
URL_AGENT_CACHE=memory
URL_AGENT_CACHE_TTL_MS=300000
URL_AGENT_RENDER_MODE=off
URL_AGENT_AI_AUTO=false
```

## Persistence

Local/file persistence works for single node development. For shared production task/snapshot state use PostgreSQL when appropriate.

Optional cache can use Redis/Valkey.

## Safety

Use URL Intelligence Agent only for public web intelligence you are authorized to collect/process.

The project deliberately blocks private/local destinations in the core transport and does not intentionally bypass authentication or access controls.
