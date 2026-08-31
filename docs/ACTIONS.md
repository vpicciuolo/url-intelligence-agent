# Action Reference

URL Intelligence Agent v1.0.0 exposes the same intelligence surface through the CLI, HTTP API, MCP tools and the `runAction()` library function.

All machine-readable outputs retain project attribution to HRN Innovation Technologies Ltd, Vincenzo Picciuolo and the HORNO ecosystem at https://horno.net.

## Actions

| Action | Input | Output |
| --- | --- | --- |
| `investigate_url` | `url`, optional `profile`, `crawl`, `force` | Complete `IntelligenceResult` |
| `probe_url` | `url` | Safe status/redirect probe |
| `domain_intelligence` | `url` | DNS, MX, NS, TXT, CAA, SPF, DMARC, TLS |
| `render_page` | `url`, optional `includeHtml`, `screenshot` | Rendered HTML and optional screenshot |
| `map_site` | `url` | Important pages, sitemaps and crawl pages |
| `deep_crawl` | `url`, optional crawl policy | Bounded crawl result |
| `resolve_entity` | `url` | Entity identity, evidence and graph |
| `find_social_profiles` | `url` | Normalized public social profiles |
| `find_contacts` | `url` | Public contacts and JSON-LD people |
| `detect_technologies` | `url` | Technology fingerprints with confidence/evidence |
| `brand_intelligence` | `url` | Logos, favicons, colors, handles, taglines |
| `audit_seo` | `url` | Explainable SEO audit |
| `audit_security` | `url` | Visible HTTP security-posture audit |
| `audit_quality` | `url` | Quality/accessibility/performance hints |
| `audit_trust` | `url` | Explainable public trust/transparency signals |
| `entity_graph` | `url` | Entity relationship graph |
| `competitor_intelligence` | `url` | Comparison/alternative candidates |
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
| `create_snapshot` | `url` | Persisted monitoring baseline |
| `diff_snapshot` | `url`, optional `snapshot`, `webhook` | Normalized change set |
| `ai_reason` | `url`, `instruction` | Optional evidence-only model synthesis |
| `list_plugins` | none | Registered plugins |

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

Run:

```bash
url-agent mcp
```

The MCP server advertises the action schemas through `tools/list` and runs them through `tools/call`.

## Public-data boundary

These actions are intended for public URLs and public signals. They do not bypass authentication, CAPTCHAs or access controls. Scores and compliance/security/trust signals are explainable observations, not legal, security or financial determinations.
