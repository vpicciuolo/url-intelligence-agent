# Action Reference

URL Intelligence Agent v1.1.0 exposes the same intelligence surface through the CLI, HTTP API, MCP tools and the `runAction()` library function.

All machine-readable outputs retain project attribution to HRN Innovation Technologies Ltd, Vincenzo Picciuolo and the HORNO Network ecosystem at https://horno.net.

## How to interpret results

The project is evidence-first. Where an action returns evidence-linked fields, read the pieces together:

- `value` — the extracted claim/value.
- `confidence` — extraction confidence derived from the observable extraction/evidence path, not a statement that an AI model “feels confident.”
- `method` — how the value was obtained.
- `sources` — public source URLs supporting the field.
- `evidence` — deterministic/public signals that triggered a technology, graph or competitor signal.
- `contradictions` — explicit conflicts reported by a full investigation. A contradiction should remain visible rather than being silently collapsed into one clean answer.
- `observedAt` — the point in time at which the public-web evidence was observed.

Full investigations also return:

- `confidenceAssessment.extractionConfidence` — how strongly the target's observable metadata/content supports the extracted identity fields.
- `confidenceAssessment.externalCorroboration` — independent-domain source coverage from fetched third-party evidence.
- `webResearch` — search-provider status, search queries, discovered external URLs, fetched third-party sources, domains, coverage score, discovery method and limitations.

A website repeating the same statement across many pages is **not** treated as many independent sources. Extraction confidence and third-party corroboration are deliberately kept separate.

Important: an empty `contradictions` list means no explicit contradiction was reported by that run. It does **not** prove universal source consensus. External corroboration is also not a mathematical probability that every claim is true.

The hosted web interface surfaces these fields in a human-readable evidence summary, keeps public sources openable, marks disputed results and preserves the complete raw JSON.

External research architecture and provider configuration: [WEB_RESEARCH.md](WEB_RESEARCH.md)  
Network/SSRF architecture: [NETWORK_SECURITY.md](NETWORK_SECURITY.md)

Live demo: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent  
Remote MCP: https://vpicciuolo-url-intelligence-agent.hf.space/mcp

## Actions

| Action | Input | Output |
| --- | --- | --- |
| `investigate_url` | `url`, optional `profile`, `crawl`, `force`, `externalResearch` | Complete `IntelligenceResult`, including first-party evidence, `confidenceAssessment`, `webResearch`, contradictions, warnings and `observedAt` |
| `probe_url` | `url` | Safe status/redirect probe |
| `domain_intelligence` | `url` | DNS, MX, NS, TXT, CAA, SPF, DMARC, TLS |
| `render_page` | `url`, optional `includeHtml`, `screenshot` | Rendered HTML and optional screenshot |
| `map_site` | `url` | Important pages, sitemaps and crawl pages |
| `deep_crawl` | `url`, optional crawl policy | Bounded crawl result |
| `resolve_entity` | `url` | Entity identity, extraction confidence, external corroboration, evidence and graph |
| `find_social_profiles` | `url` | Normalized public social profiles |
| `find_contacts` | `url` | Public contacts and JSON-LD people |
| `detect_technologies` | `url` | Technology fingerprints with confidence/evidence |
| `brand_intelligence` | `url` | Logos, favicons, colors, handles, taglines |
| `audit_seo` | `url` | Explainable SEO audit |
| `audit_security` | `url` | Visible HTTP security-posture audit |
| `audit_quality` | `url` | Quality/accessibility/performance hints |
| `audit_trust` | `url` | Explainable public trust/transparency signals |
| `entity_graph` | `url` | Entity relationship graph with confidence/evidence on edges |
| `competitor_intelligence` | `url` | Comparison/alternative candidates with confidence/reason/evidence |
| `structured_data` | `url` | JSON-LD inventory |
| `api_discovery` | `url` | OpenAPI/Swagger/GraphQL/API/doc hints |
| `compliance_signals` | `url` | Public privacy/terms/consent signals |
| `people_team` | `url` | Public JSON-LD Person records |
| `commerce_intelligence` | `url` | Pricing/ecommerce/subscription signals |
| `content_freshness` | `url` | Publication/modified date signals |
| `link_intelligence` | `url` | Internal/external link graph summary |
| `check_links` | `url`, optional `limit`, `concurrency` | Bounded link-health results |
| `generate_listing` | `url` | Ready-to-review listing/profile object |
| `rag_export` | `url` | Clean, checksum-addressed RAG documents |
| `knowledge_export` | `url` | Provenance-aware fact triples |
| `compare_urls` | `url`, `url2` | URL/entity comparison |
| `batch_investigate` | `urls`, optional `concurrency` | Worker job results |
| `create_snapshot` | `url` | Persisted monitoring baseline with `observedAt` |
| `diff_snapshot` | `url`, optional `snapshot`, `webhook` | Normalized change set with before/after values |
| `ai_reason` | `url`, `instruction` | Optional evidence-only model synthesis |
| `list_plugins` | none | Registered plugins |

## Hosted demo vs full runtime

The public hosted web demo intentionally exposes a controlled read-only subset for testing:

- `investigate_url`
- `audit_seo`
- `audit_security`
- `audit_trust`
- `find_social_profiles`
- `detect_technologies`
- `brand_intelligence`
- `domain_intelligence`
- `structured_data`

`investigate_url` enables external web research by default. Other actions avoid the extra external-research cost unless the action specifically needs it or `externalResearch` is explicitly requested by the caller.

The complete action registry is available when the project is cloned or self-hosted through the CLI, HTTP API or local MCP server.

## Library example

```ts
import { runAction } from "url-intelligence-agent";

const result = await runAction("domain_intelligence", {
  url: "https://example.com"
});
```

## API example

```bash
curl "http://localhost:8787/action/audit_seo?url=https://example.com"
```

## MCP

Run locally:

```bash
url-agent mcp
```

The MCP server advertises the action schemas through `tools/list` and runs them through `tools/call`.

For the public hosted Remote MCP demo, use:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

## Public-data boundary

These actions are intended for public URLs and public signals. User-controlled/discovered public URLs collected through the core HTTP path use the v1.1.0 guarded `safeFetch()` transport: preflight DNS validation, connect-time DNS validation, rejection of private/reserved/mixed DNS answers and redirect re-validation.

Optional Playwright browser rendering is a separate network boundary and should be isolated with infrastructure-level egress controls when enabled.

The project does not bypass authentication, CAPTCHAs or access controls. Scores and compliance/security/trust signals are explainable observations, not legal, security or financial determinations.
