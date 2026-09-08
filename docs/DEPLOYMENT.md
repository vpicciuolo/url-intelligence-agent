# URL Intelligence Agent — Deployment Guide

This guide covers URL Intelligence Agent v1.2.0.

Application version: **1.2.0**  
Provenance schema: **1.0**

## Deployment modes

URL Intelligence Agent can run as:

1. local CLI/library;
2. stdio MCP server;
3. HTTP API + Remote MCP server;
4. Docker service;
5. Hugging Face Docker Space;
6. distributed service with Redis/PostgreSQL adapters;
7. optional browser rendering worker/remote renderer.

## Minimum runtime

```text
Node.js >= 18.17
```

Production containers in the repository use Node.js 22.

## Local service

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
npm test
npm run serve
```

Default:

```text
http://127.0.0.1:8787
```

## Docker

```bash
docker build -t url-intelligence-agent .
docker run --rm -p 8787:8787 \
  -e HOST=0.0.0.0 \
  -e PORT=8787 \
  url-intelligence-agent
```

Use an API token for an internet exposed self hosted service:

```bash
docker run --rm -p 8787:8787 \
  -e HOST=0.0.0.0 \
  -e PORT=8787 \
  -e URL_AGENT_API_TOKEN='replace-with-a-strong-secret' \
  url-intelligence-agent
```

## Core collection configuration

Recommended starting values:

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

Keep crawl and response bounds conservative on public services.

## v1.2 provenance behavior

No additional service is required for claim provenance.

The deterministic provenance engine uses the collected HTML/headers to generate:

```text
PageRepresentation
EvidenceObservation
ResolvedClaim
ProvenanceReport
```

`parse5` is a normal runtime dependency and is installed automatically.

Source HTML and rendered DOM are kept as separate evidence representations when rendering is enabled.

## Persistence

By default the project uses local file persistence for persisted records and memory for the default cache.

Relevant use cases in v1.2:

- monitoring snapshots;
- timestamped snapshot history;
- MCP Tasks records;
- optional durable hosted/demo state where configured.

### File persistence

```env
URL_AGENT_DATA_DIR=/data/url-agent
```

Mount a durable volume if history/tasks must survive container replacement.

### PostgreSQL

```env
DATABASE_URL=postgresql://user:pass@db:5432/url_agent
```

PostgreSQL is an optional peer dependency.

### Redis / Valkey cache

```env
REDIS_URL=redis://redis:6379
```

or:

```env
VALKEY_URL=redis://valkey:6379
```

Redis is optional.

## Browser rendering

Rendering is **optional**.

Modes:

```text
off
auto
always
playwright
```

### Playwright

Install when needed:

```bash
npm install playwright
npx playwright install chromium
```

Then:

```env
URL_AGENT_RENDER_MODE=auto
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

v1.2 adds application level browser defenses including destination checks, bounded requests, service worker/download blocking and bounded same origin runtime JSON capture.

### Important browser security boundary

Playwright/browser networking does not use the same connection path as the guarded Undici collector. Application level request interception is defense in depth, not a substitute for infrastructure egress isolation.

For security sensitive deployments use a separate renderer container/VM with network policy that blocks private, link local, metadata and internal service ranges at the infrastructure layer.

A recommended topology:

```text
Internet client
    │
    ▼
URL Intelligence API
    │
    ├─ guarded HTTP collector → public internet
    │
    └─ renderer service
          │
          └─ restricted egress network → public internet only
```

### Remote renderer

A renderer can be configured instead of local Playwright:

```env
URL_AGENT_RENDER_ENDPOINT=https://renderer.example.com/render
URL_AGENT_RENDER_API_KEY=replace-me
```

Protect the renderer endpoint and apply equivalent network restrictions.

## Runtime JSON evidence

When browser runtime evidence is enabled, URL Intelligence Agent can collect bounded same origin JSON responses from XHR/fetch activity.

This is designed for public page data only. It must not be configured to bypass authentication, steal session state or reach private services.

## External research

Full investigation can perform public external corroboration.

Possible providers:

```env
URL_AGENT_SEARCH_ENDPOINT=https://your-searxng.example/search
BRAVE_SEARCH_API_KEY=...
SERPER_API_KEY=...
TAVILY_API_KEY=...
GOOGLE_CSE_API_KEY=...
GOOGLE_CSE_CX=...
```

External research should be considered a separate network/cost boundary and should have its own quotas.

## Optional AI reasoning

AI is not required for provenance or the main deterministic intelligence path.

Example OpenAI compatible configuration:

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=gpt-5-mini
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.1
```

Do not expose AI provider keys to clients.

## Remote MCP

The HTTP server exposes:

```text
/mcp
/.well-known/mcp.json
```

v1.2 supports:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

The current protocol path is stateless at the core while legacy session compatibility remains available.

For multi instance deployments, use shared persistence when MCP Tasks must be retrievable after a request lands on another instance.

## MCP Tasks persistence

Modern clients can use the `io.modelcontextprotocol/tasks` extension for selected long running tools.

TTL:

```env
URL_AGENT_MCP_TASK_TTL_MS=86400000
```

A production multi instance deployment should use PostgreSQL or another shared persistence adapter rather than node local files for task records.

## Hugging Face Space

The official Space is deployed from GitHub by `.github/workflows/deploy-huggingface.yml`.

The workflow:

1. checks out GitHub `main`;
2. validates the Hugging Face token secret;
3. prepares the Docker Space payload;
4. reconstructs/validates approved brand assets;
5. syncs the payload to `vpicciuolo/url-intelligence-agent` on Hugging Face;
6. waits for the runtime to reach `RUNNING`;
7. verifies live brand assets and UI content.

The Space uses a Docker runtime on port 7860.

### Required GitHub secret

```text
HF_TOKEN
```

The token used by the deployment workflow must have permission to push to the target Space. The connected read only OAuth session used by ChatGPT is not sufficient for direct repository writes to Hugging Face; the GitHub Actions deployment secret performs the publish step.

### Hosted OAuth

The Space is configured for Hugging Face OAuth. Hosted web analysis/report access requires a signed in account.

Hosted web policy:

```text
1 analysis request per signed in account every 24h
owner account vpicciuolo exempt
```

Remote MCP has a separate bounded anti abuse policy.

## Hugging Face Dataset deployment

The benchmark dataset is deployed by `.github/workflows/deploy-huggingface-dataset.yml` when `hf-dataset/**` changes on `main`.

v1.2 includes the provenance consistency fixture track and corresponding documentation/schema files.

## Observability

Useful endpoints:

```text
/health
/actions
/.well-known/mcp.json
/search-providers
```

For production, collect:

- request duration and failures;
- crawl page count;
- external research provider failures;
- render timeouts;
- blocked URL/SSRF events;
- provenance claim/observation counts;
- conflict/drift counts;
- task queue/TTL outcomes;
- cache/persistence errors.

Do not log secrets, OAuth tokens or raw private headers.

## Release verification checklist

A v1.2.0 deployment is not considered complete until:

```text
VERSION                 = 1.2.0
package.json            = 1.2.0
PROJECT.version         = 1.2.0
npm run typecheck       passes
npm test                passes on supported CI Node versions
Hugging Face build      RUNNING
/health                 reports v1.2.0
/actions                contains inspect_provenance + verify_claim
/.well-known/mcp.json   contains 2026-07-28
hosted UI               renders Evidence Inspector
benchmark dataset       contains provenance fixtures/docs
```

See `VERSIONING.md` for the formal release policy.

## Reverse proxy

If deploying behind Nginx/Caddy/Cloudflare, preserve normal request headers and configure the application carefully before trusting forwarded client IP headers for security/rate limiting.

Only trust `X-Forwarded-For`/`X-Real-IP` from a proxy you control. Otherwise a client may spoof identity/rate-limit keys.

## Security headers

Add standard service response hardening at the reverse proxy or application layer where appropriate:

```text
HSTS
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors / X-Frame-Options
```

Do not add a restrictive CSP without testing the hosted UI/OAuth flows.

## Backups

If snapshot history and MCP Tasks are business critical:

- use durable/shared storage;
- back up PostgreSQL or the configured persistence volume;
- define a retention policy;
- avoid retaining complete third party HTML longer than necessary.

Provenance hashes and bounded evidence snippets are generally preferable to indefinite raw third party page archives unless the operator has a specific lawful retention requirement.
