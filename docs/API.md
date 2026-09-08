# URL Intelligence Agent — HTTP API Guide

URL Intelligence Agent v1.2.0 exposes the same intelligence engine used by the CLI and MCP server through a lightweight HTTP service.

## Start the API

```bash
npm install
npm run build
npm run serve
```

Default local endpoint:

```text
http://127.0.0.1:8787
```

Environment overrides:

```env
HOST=0.0.0.0
PORT=8787
```

## Main endpoints

```text
GET  /health
GET  /actions
GET  /search-providers
GET  /me
POST /investigate
POST /action/:name
POST /mcp
GET  /.well-known/mcp.json
GET  /llms.txt
GET  /robots.txt
GET  /sitemap.xml
GET  /report/:id?format=pdf|json|md|html
```

The Hugging Face Space adds OAuth based hosted-demo controls around analysis/report endpoints.

## Health

```bash
curl http://127.0.0.1:8787/health
```

The response includes runtime status, action count, Remote MCP metadata and release attribution. A correct v1.3.0 deployment must report version `1.3.0` through the attribution object.

## Action catalog

```bash
curl http://127.0.0.1:8787/actions
```

The open source runtime exposes 36 actions. The hosted demo exposes a smaller allowlisted subset.

## Full investigation

```bash
curl -X POST http://127.0.0.1:8787/investigate \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://example.com",
    "externalResearch": false
  }'
```

Important v1.2 fields in the returned result:

```text
result.provenance.schemaVersion
result.provenance.representations
result.provenance.observations
result.provenance.claims
result.provenance.summary
```

Existing flattened fields such as `entity`, `seo`, `security`, `trust`, `pages`, `technologies`, `brand`, `rag`, `contradictions` and `warnings` remain available for v1.x compatibility.

## Inspect provenance

```bash
curl -X POST http://127.0.0.1:8787/action/inspect_provenance \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://example.com",
    "predicate": "pages_indexed",
    "limit": 100,
    "format": "json"
  }'
```

Set `format` to `prov` to include the interoperable W3C PROV shaped export.

Typical claim state:

```json
{
  "status": "drift",
  "flags": [
    "representation_drift",
    "precision_difference",
    "freshness_divergence",
    "stale_metadata_suspected"
  ]
}
```

## Verify a claim

```bash
curl -X POST http://127.0.0.1:8787/action/verify_claim \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://example.com",
    "predicate": "pages_indexed",
    "value": 100502
  }'
```

Verification status can be:

```text
supported
compatible
contradicted
not_found
```

`compatible` is important when values are different representations of a logically compatible statement such as `80,000+` and `100,502`.

## Crawl controls

Actions that accept crawl settings can receive:

```json
{
  "url": "https://example.com",
  "crawl": {
    "maxPages": 30,
    "maxDepth": 3,
    "concurrency": 4,
    "sameOrigin": true,
    "obeyRobots": true,
    "allowPatterns": [],
    "denyPatterns": [],
    "renderMode": "auto"
  }
}
```

`renderMode`:

```text
off
auto
always
playwright
```

Browser rendering requires a configured remote renderer or Playwright installation and should be deployed with an appropriate network isolation model.

## Search providers

```bash
curl http://127.0.0.1:8787/search-providers
```

External corroboration can use configured providers including Google CSE, SearXNG, Brave Search, Serper, Tavily or the built in fallback when available.

External corroboration remains separate from first party extraction/provenance confidence.

## API token

For self hosted deployments:

```env
URL_AGENT_API_TOKEN=replace-with-a-strong-secret
```

Then call:

```bash
curl -H 'authorization: Bearer replace-with-a-strong-secret' \
  http://127.0.0.1:8787/actions
```

Do not commit production tokens.

## CORS

Optional:

```env
URL_AGENT_CORS_ORIGIN=https://your-app.example
```

If not needed, leave CORS disabled.

## Core rate limit

The HTTP server has a basic request bucket controlled by:

```env
URL_AGENT_API_RATE_LIMIT=120
```

The Hugging Face hosted demo additionally applies account/IP based anti abuse policies that are intentionally separate from the self hosted API.

## Hosted Hugging Face authentication

The official Space uses Hugging Face OAuth for web analysis/report access.

Hosted web policy:

```text
1 analysis request per signed in account / 24h
owner account exempt
```

The Remote MCP demo uses its own bounded policy.

Self hosted deployments are not subject to the Hugging Face demo allowance unless you reproduce it intentionally.

## Reports

Hosted signed in analyses create a short lived report record with export links for:

```text
PDF
JSON
Markdown
HTML
```

The JSON export preserves the complete result including provenance.

Reports include URL Intelligence Agent, repository, Hugging Face, creator and HRN Innovation Technologies Ltd attribution.

## Remote MCP

The same HTTP process serves Remote MCP at:

```text
/mcp
```

Discovery:

```text
/.well-known/mcp.json
```

v1.2.0 supports MCP protocol revisions:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

See `docs/MCP.md` and `docs/REMOTE_MCP.md`.

## Error behavior

Typical status codes:

```text
200 successful request or JSON-RPC response
400 invalid input / unsupported option
401 authentication required
403 action not available on hosted demo / invalid MCP origin
404 route, report or MCP session/task not found
429 hosted or API rate limit reached
```

Some MCP protocol errors are represented inside JSON-RPC responses with HTTP 200 as required by the protocol path.

## Security

All public URL collection through the core transport passes the guarded network boundary documented in `docs/NETWORK_SECURITY.md`.

The API does not intentionally bypass authentication, CAPTCHAs or access controls on target sites.

Browser rendering is a separate trust boundary. Do not equate application level browser request filtering with infrastructure egress isolation.
