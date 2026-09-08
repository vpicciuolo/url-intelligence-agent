# URL Intelligence Agent — MCP integration

URL Intelligence Agent v1.2.0 exposes the evidence engine through local stdio MCP and Remote MCP.

Repository: https://github.com/vpicciuolo/url-intelligence-agent  
Remote MCP: https://vpicciuolo-url-intelligence-agent.hf.space/mcp

## Protocol compatibility

Supported protocol versions:

- `2026-07-28` — current modern stateless transport;
- `2025-11-25`;
- `2025-06-18`;
- `2025-03-26`.

The 2026-07-28 path uses per-request/stateless behavior and modern discovery/routing metadata. Legacy protocol clients retain initialize/session compatibility.

The server exposes `server/discover`, `ping`, `tools/list`, `tools/call`, `resources/list` and `resources/read`. Legacy clients also use `initialize` and `notifications/initialized`.

## v1.2 provenance tools

### `inspect_provenance`

Returns resolved claims and their underlying observations, including source representation/layer, raw and normalized values, source locator/JSON Pointer, timestamps, hashes and consistency status.

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "limit": 100,
  "format": "json"
}
```

Set `format` to `prov` to include a W3C PROV-shaped interoperability export.

### `verify_claim`

Compares a supplied value against normalized collected evidence.

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "value": 100502
}
```

Possible statuses are `supported`, `compatible`, `contradicted` and `not_found`.

`compatible` matters for statements such as `80,000+` vs `100,502`: the exact value satisfies the lower bound even though the representations differ.

## Strict tool schemas

v1.2 advertises per-tool input and output schemas rather than giving every action the same generic argument shape. This improves autonomous tool selection and allows clients to validate structured results.

The normal tool result contains both text content and `structuredContent`.

## MCP Tasks extension

Modern clients can advertise the `io.modelcontextprotocol/tasks` extension. Long-running tools such as full investigations, deep crawls, comparisons and batch investigations may return a task handle instead of keeping one request open.

Supported task methods:

```text
tasks/get
tasks/update
tasks/cancel
```

Task metadata is persisted through the configured URL Intelligence Agent persistence adapter. The default memory/file deployment model is suitable for a single runtime; distributed production deployments should use a shared persistence backend.

Set `sync: true` on task-capable tool calls when the client explicitly needs a synchronous result.

## Modern Remote MCP routing

For `2026-07-28`, the hosted HTTP endpoint expects the modern protocol version and routing headers. The JSON-RPC method and routing headers must agree.

Example tool call conceptually routes as:

```text
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: inspect_provenance
```

The request body remains JSON-RPC.

Machine-readable deployment metadata:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

## Local stdio

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
npm run mcp
```

Or install globally:

```bash
npm install -g github:vpicciuolo/url-intelligence-agent
url-agent mcp
```

Generic stdio client configuration:

```json
{
  "mcpServers": {
    "url-intelligence-agent": {
      "command": "url-agent",
      "args": ["mcp"],
      "env": {
        "URL_AGENT_MAX_PAGES": "30",
        "URL_AGENT_MAX_DEPTH": "3",
        "URL_AGENT_OBEY_ROBOTS": "true"
      }
    }
  }
}
```

## Important tools

| Tool | Purpose |
| --- | --- |
| `investigate_url` | Complete evidence-first investigation + provenance |
| `inspect_provenance` | Inspect field-level observations, claims and drift/conflicts |
| `verify_claim` | Verify a supplied predicate/value against collected evidence |
| `probe_url` | Safe public URL/status/redirect probe |
| `domain_intelligence` | DNS, mail and TLS intelligence |
| `map_site` | Map pages and sitemap URLs |
| `deep_crawl` | Bounded multi-page crawl |
| `render_page` | Optional JavaScript rendering/runtime evidence |
| `resolve_entity` | Entity identity/type + evidence |
| `find_social_profiles` | Public social-profile discovery |
| `find_contacts` | Public contact discovery |
| `detect_technologies` | Technology fingerprinting |
| `brand_intelligence` | Brand/logo/favicon/tagline signals |
| `audit_seo` | SEO/discoverability + metadata provenance |
| `audit_security` | Public HTTP security-header posture |
| `audit_quality` | Quality/accessibility/performance hints |
| `audit_trust` | Explainable public trust signals |
| `structured_data` | JSON-LD/Microdata/RDFa inventory + claims |
| `api_discovery` | API surfaces + optional runtime JSON evidence |
| `commerce_intelligence` | Pricing/commerce claims |
| `content_freshness` | Date/freshness/metric provenance |
| `knowledge_export` | Knowledge facts + PROV-shaped lineage |
| `compare_urls` | Compare two intelligence/claim sets |
| `batch_investigate` | Bounded multi-URL processing |
| `create_snapshot` | Persist provenance-aware monitoring snapshot |
| `diff_snapshot` | Diff claims and other state over time |
| `ai_reason` | Optional evidence-only model reasoning |

Run `url-agent actions` to inspect the current action registry.

## Resources

The MCP server exposes:

```text
url-intelligence://about
url-intelligence://provenance-schema
```

The provenance-schema resource documents claim statuses and notable drift flags for machine consumers.

## Rendering

Browser rendering is optional. Install Playwright when self-hosting if needed:

```bash
npm install playwright
npx playwright install chromium
```

Then:

```env
URL_AGENT_RENDER_MODE=auto
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

Rendering can preserve a separate `rendered_dom` representation and capture bounded same-origin public JSON from XHR/fetch. Browser networking is a separate security boundary from guarded `safeFetch()`: production deployments should isolate the renderer and enforce infrastructure-level egress policy.

## Hosted demo limits

The public Remote MCP endpoint is deliberately abuse-limited. v1.2 additionally enforces the analysis limit by IP so creating a new legacy MCP session does not reset the allowance. Clone/self-host for unrestricted use.

## Security

URL Intelligence Agent is for public web intelligence. It does not intentionally bypass authentication, CAPTCHAs or access controls. Core HTTP collection uses preflight and connect-time DNS validation; browser rendering remains a separately documented trust boundary.

See:

- `docs/PROVENANCE.md`
- `docs/NETWORK_SECURITY.md`
- `SECURITY.md`
- `VERSIONING.md`

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**  
HORNO Network: https://horno.net
