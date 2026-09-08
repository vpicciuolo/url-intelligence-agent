# Action Reference

URL Intelligence Agent v1.2.0 exposes the same action registry through the library `runAction()`, CLI, HTTP API and MCP tool surface.

Current machine callable action count: **36**.

## Provenance actions added in v1.2

### `inspect_provenance`

Inspect claim level provenance for a public URL.

Inputs:

```json
{
  "url": "https://example.com",
  "profile": "full-intelligence",
  "force": false,
  "predicate": "pages_indexed",
  "limit": 100,
  "format": "json",
  "crawl": {
    "maxPages": 30,
    "maxDepth": 3,
    "renderMode": "auto"
  }
}
```

`format` may be `json` or `prov`.

Output includes:

```text
provenance.schemaVersion
provenance.summary
provenance.claims
provenance.observations
provenance.warnings
prov  (when requested)
```

Use this when a caller needs to understand which layer/representation produced each value, why a claim was resolved a certain way, or whether metadata/structured/visible representations disagree.

### `verify_claim`

Verify a supplied value against the collected normalized evidence.

Inputs:

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "value": 100502
}
```

Output status:

```text
supported
compatible
contradicted
not_found
```

`compatible` is intentionally distinct from `supported`. For example, `80,000+` is compatible with `100,502` because the exact value satisfies the lower bound.

## Complete action registry

| Action | Main inputs | Purpose |
| --- | --- | --- |
| `investigate_url` | `url`, optional `profile`, `crawl`, `force`, `externalResearch`, `searchProvider` | Complete evidence first investigation including provenance, entity resolution, audits and optional external corroboration |
| `inspect_provenance` | `url`, optional `predicate`, `limit`, `format`, `crawl` | Inspect observations, resolved claims, conflicts/drift and optional PROV export |
| `verify_claim` | `url`, `predicate`, `value`, optional `crawl` | Compare a supplied value with normalized collected evidence |
| `probe_url` | `url` | Safe public URL/status probe |
| `domain_intelligence` | `url` | DNS, mail and TLS/domain signals |
| `render_page` | `url`, optional `includeHtml`, `captureNetwork` | Render JavaScript heavy public page through configured renderer |
| `map_site` | `url`, optional `crawl` | Map important pages, sitemap URLs and page signals |
| `deep_crawl` | `url`, optional `crawl` | Bounded multi page crawl with representation preservation |
| `resolve_entity` | `url`, optional `externalResearch` | Resolve entity name/type, confidence and graph |
| `find_social_profiles` | `url` | Discover normalized public social/profile URLs |
| `find_contacts` | `url` | Discover public email, phone, contact page and people signals |
| `detect_technologies` | `url` | Deterministic technology fingerprinting |
| `brand_intelligence` | `url` | Logo, favicon, color, handle and tagline candidates |
| `audit_seo` | `url` | SEO/discoverability checks |
| `audit_security` | `url` | Observable HTTP security header posture |
| `audit_quality` | `url` | Basic content/quality/performance signals |
| `audit_trust` | `url` | Explainable public trust/transparency signals |
| `entity_graph` | `url` | Evidence linked relationship graph |
| `competitor_intelligence` | `url` | Public comparison/alternative candidates |
| `generate_listing` | `url` | Ready to review listing/profile object |
| `rag_export` | `url` | Citation friendly RAG documents |
| `structured_data` | `url` | JSON LD inventory plus provenance aware structured observations |
| `api_discovery` | `url` | Public API/OpenAPI/GraphQL/developer surface discovery |
| `compliance_signals` | `url` | Public privacy/compliance policy signals |
| `people_team` | `url` | Public people/team extraction |
| `commerce_intelligence` | `url` | Pricing/commerce/subscription signals with provenance context |
| `content_freshness` | `url` | Publication/modification and temporal signals |
| `link_intelligence` | `url` | Internal/external link classification |
| `check_links` | `url`, optional `limit`, `concurrency`, `external` | Bounded link health checking |
| `knowledge_export` | `url` | Provenance aware knowledge facts/export |
| `compare_urls` | `url`, `url2` | Compare two intelligence results |
| `batch_investigate` | `urls`, optional `concurrency` | Investigate multiple URLs with bounded workers |
| `create_snapshot` | `url` | Persist monitoring snapshot including claim values/statuses and validators |
| `diff_snapshot` | `url`, optional `snapshot`, `webhook` | Compare current state with previous snapshot |
| `ai_reason` | `url`, optional `instruction` | Optional OpenAI compatible reasoning over collected evidence |
| `list_plugins` | none | List registered plugins |

## `investigate_url` output

The complete `IntelligenceResult` includes backward compatible flattened intelligence fields plus the new provenance model.

Important top level fields:

```text
meta
inputUrl
finalUrl
profile
entity
confidenceAssessment
webResearch
seo
security
quality
trust
socials
contacts
importantPages
pages
sitemapUrls
technologies
brand
graph
competitors
rag
provenance
contradictions
warnings
fingerprint
contentFingerprint
observedAt
```

`provenance` contains:

```text
schemaVersion
observedAt
representations
observations
claims
summary
warnings
```

## Crawl options

Actions that accept `crawl` can use:

```json
{
  "maxPages": 30,
  "maxDepth": 3,
  "concurrency": 4,
  "sameOrigin": true,
  "obeyRobots": true,
  "allowPatterns": [],
  "denyPatterns": [],
  "renderMode": "auto"
}
```

`renderMode` values:

```text
off
auto
always
playwright
```

The per request `renderMode` is honored by the v1.2 crawl policy.

## Provenance status semantics

Resolved claims can be:

| Status | Meaning |
| --- | --- |
| `consensus` | Normalized observations agree |
| `compatible_variation` | Different representations are logically compatible |
| `drift` | A meaningful representation/freshness difference exists without a hard logical contradiction |
| `conflict` | High quality observations are incompatible for the field semantics |
| `insufficient_evidence` | Evidence is not sufficient for a strong resolution |

Notable flags:

```text
representation_drift
precision_difference
freshness_divergence
stale_metadata_suspected
metadata_vs_visible_mismatch
structured_vs_visible_mismatch
```

## Hosted Hugging Face action subset

The public hosted web/MCP demo intentionally exposes a bounded subset:

```text
investigate_url
inspect_provenance
verify_claim
audit_seo
audit_security
audit_trust
find_social_profiles
detect_technologies
brand_intelligence
domain_intelligence
structured_data
```

The full open source/self hosted runtime exposes all 36 actions.

## MCP schemas

v1.2 generates action specific MCP input schemas rather than one generic schema for every action.

Examples:

- `verify_claim` requires `url`, `predicate` and `value`;
- `compare_urls` requires `url` and `url2`;
- `batch_investigate` requires `urls`;
- `render_page` supports `includeHtml` and `captureNetwork`;
- `inspect_provenance` supports `predicate`, `limit` and `format`.

The provenance tools also advertise structured output schemas.

## Long running MCP actions

When a modern MCP 2026-07-28 client advertises the Tasks extension, these actions can return an asynchronous task unless `sync: true` is requested:

```text
investigate_url
deep_crawl
compare_urls
batch_investigate
```

See `docs/MCP.md`.

## External research

`investigate_url` and `resolve_entity` can perform external research when enabled.

External corroboration is reported separately from target side extraction. A page repeating a claim on the same domain does not become independent corroboration simply because it appears more than once.

## AI reasoning

`ai_reason` is optional. The main intelligence and provenance pipeline is deterministic and does not require an LLM.

AI output should be treated as a reasoning layer over collected evidence, not as the evidence itself.
