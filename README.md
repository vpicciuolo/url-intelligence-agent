# 🧠 URL Intelligence Agent

<p align="center">
  <strong>Public URL in. Evidence, provenance, consistency and intelligence out.</strong>
</p>

<p align="center">
  Evidence first public web intelligence for developers, AI agents, research, RAG, monitoring, due diligence and automation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/release-v1.2.0-00c853?style=for-the-badge" alt="v1.2.0">
  <img src="https://img.shields.io/badge/provenance_schema-1.0-0ea5e9?style=for-the-badge" alt="Provenance schema 1.0">
  <img src="https://img.shields.io/badge/MCP-2026--07--28-7c3aed?style=for-the-badge" alt="MCP 2026-07-28">
  <img src="https://img.shields.io/badge/TypeScript-first-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node-18.17%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 18.17+">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT">
</p>

<p align="center">
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/TRY%20LIVE-Hugging%20Face-FFD21E?style=for-the-badge" alt="Try live on Hugging Face"></a>
  <a href="docs/MCP.md"><img src="https://img.shields.io/badge/CONNECT-MCP-7c3aed?style=for-the-badge" alt="MCP"></a>
  <a href="docs/PROVENANCE.md"><img src="https://img.shields.io/badge/READ-Provenance-0ea5e9?style=for-the-badge" alt="Provenance"></a>
  <a href="https://hrn.ae/githubsupport"><img src="https://img.shields.io/badge/SUPPORT-Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Support"></a>
</p>

URL Intelligence Agent is an open source URL and web intelligence engine created by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd** and developed inside the **HORNO Network** ecosystem.

Version **1.2.0** introduces the **Claim Provenance & Temporal Consistency Engine**. The agent no longer treats extraction as only “pick one value.” It preserves observations, identifies which representation and layer produced each value, normalizes values by field type, detects real conflicts separately from compatible variation, tracks drift, and explains why a preferred value was selected.

## Why claim provenance matters

A normal extractor may see:

```text
Open Graph description:  80,000+ pages indexed
Rendered page:           100,502 pages indexed
```

A naive system may report a contradiction. URL Intelligence Agent v1.2 understands that `80,000+` is a lower bound, so `100,502` is logically compatible.

The useful signal is:

```text
logical conflict          no
precision difference      yes
representation drift      yes
freshness divergence      yes
stale metadata suspected  yes
preferred exact value     100502
```

That distinction is designed for AI agents, MCP clients, RAG pipelines, web monitoring, SEO intelligence, research and verification systems.

## Provenance model

Each observation can preserve:

```json
{
  "subject": "https://example.com/",
  "predicate": "metric:pages_indexed",
  "rawValue": "80,000+",
  "normalizedValue": {
    "kind": "number",
    "value": 80000,
    "exact": false,
    "min": 80000,
    "max": null,
    "comparator": "gte"
  },
  "source": {
    "representation": "source_html",
    "layer": "open_graph",
    "property": "og:description",
    "locator": "meta[og:description]"
  },
  "temporal": {
    "observedAt": "2026-09-08T00:00:00.000Z"
  },
  "integrity": {
    "documentHash": "sha256...",
    "observationHash": "sha256..."
  },
  "quality": {
    "extractionConfidence": 0.9,
    "sourceAuthority": 0.82,
    "freshnessConfidence": 0.78
  }
}
```

Resolved claims use one of these states:

```text
consensus
compatible_variation
drift
conflict
insufficient_evidence
```

Important flags include:

```text
representation_drift
precision_difference
freshness_divergence
stale_metadata_suspected
metadata_vs_visible_mismatch
structured_vs_visible_mismatch
```

## Evidence layers

The provenance engine can extract observations from:

- HTTP headers and validators
- source HTML
- standard meta tags
- Open Graph
- Twitter Cards
- JSON LD
- Microdata
- RDFa
- canonical and feed links
- `<time>` and `<data>` elements
- visible page content
- optional rendered DOM
- bounded same origin runtime JSON evidence when browser rendering is enabled

Duplicate metadata observations are preserved instead of being silently overwritten in the provenance layer.

## Field aware normalization

The resolver understands more than string equality.

### Numbers

```text
80K
80,000
80,000+
>80,000
about 80k
100,502
```

### Money

```text
$29
29 USD
USD 29.00
$29/month
```

### Dates

Date values are normalized before comparison, with precision retained where possible.

### URLs

Canonical comparison removes fragments and common tracking parameters and normalizes standard URL forms.

### Strings

Unicode normalization, whitespace normalization and folded comparison are used before declaring a difference.

## Architecture

```text
Public URL
   │
   ├─ guarded HTTP collector
   │    ├─ URL validation
   │    ├─ preflight DNS validation
   │    ├─ connect time DNS validation
   │    ├─ redirect revalidation
   │    ├─ charset aware decoding
   │    └─ ETag / Last Modified capture
   │
   ├─ source HTML representation
   │    ├─ metadata
   │    ├─ structured data
   │    └─ visible claims
   │
   └─ optional browser representation
        ├─ rendered DOM
        └─ bounded same origin runtime JSON
              │
              ▼
       EvidenceObservation records
              │
              ▼
       normalization + grouping
              │
              ▼
       conflict / drift engine
              │
              ▼
       resolved claims + explanations
              │
        ┌─────┼─────┬──────┬─────┐
        ▼     ▼     ▼      ▼     ▼
       CLI   API   MCP   RAG   reports
```

See [docs/PROVENANCE.md](docs/PROVENANCE.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Core intelligence capabilities

| Area | Capability |
| --- | --- |
| URL safety | Public HTTP/HTTPS validation, SSRF controls, DNS rebinding defense, redirect validation, bounded collection |
| Provenance | Field level observations, hashes, locators, normalized values, source layers and representations |
| Consistency | Consensus, compatible variation, drift, conflict and stale metadata signals |
| Crawl | robots.txt, sitemap discovery, bounded same origin crawl and important page classification |
| Rendering | Optional Playwright or remote renderer for JavaScript heavy pages |
| Entity | Entity name/type resolution with evidence and confidence |
| Social | Public social profile discovery and normalization |
| Contacts | Public email, phone and contact page signals |
| Structured data | JSON LD plus provenance aware Microdata and RDFa extraction |
| Domain | DNS, mail and TLS intelligence |
| Technology | Framework, CMS, ecommerce, analytics, payments, CDN and hosting detection |
| Brand | Logos, favicons, colors, handles and tagline signals |
| SEO | Title, description, canonical, Open Graph, sitemap, structured data and indexability audit |
| Security | Observable HTTP security header posture |
| Trust | Explainable public transparency signals, not a fraud/legal determination |
| Monitoring | Claim aware snapshots, diffs, validators and history |
| RAG | Citation friendly documents and knowledge export |
| External research | Optional public web corroboration kept separate from first party extraction |
| Reports | PDF, JSON, Markdown and HTML |
| Interfaces | TypeScript library, CLI, HTTP API, Docker, stdio MCP and Remote MCP |

## Quick start

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
```

Requires Node.js **18.17+**.

Investigate a URL:

```bash
node dist/src/cli.js investigate https://example.com
```

Run the interactive CLI:

```bash
npm run dev
```

Run the HTTP server:

```bash
npm run serve
```

Run local stdio MCP:

```bash
npm run mcp
```

## Live Hugging Face Space

Space:

```text
https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
```

Live app:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/
```

Remote MCP:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine readable MCP discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

The hosted web demo requires Hugging Face sign in and is limited to **1 analysis request per signed in account every 24 hours**. The project owner account is exempt. The public Remote MCP applies a separate anti abuse policy. Clone or self host for unrestricted local usage.

The hosted UI includes an **Evidence Inspector** for claim counts, observations, conflicts, drift, stale metadata signals, source layers and resolution explanations.

## MCP 2026-07-28

v1.2.0 supports:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

The current protocol path supports stateless HTTP behavior, server discovery, routing metadata, cache hints, strict per tool input/output schemas and the MCP Tasks extension for selected long running tools while preserving legacy initialization/session compatibility.

New evidence focused tools:

```text
inspect_provenance
verify_claim
```

Example `verify_claim` arguments:

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "value": 100502
}
```

Possible verification statuses:

```text
supported
compatible
contradicted
not_found
```

See [docs/MCP.md](docs/MCP.md) and [docs/REMOTE_MCP.md](docs/REMOTE_MCP.md).

## Runtime actions

The v1.2 action registry exposes **36 machine callable actions**:

```text
investigate_url
inspect_provenance
verify_claim
probe_url
domain_intelligence
render_page
map_site
deep_crawl
resolve_entity
find_social_profiles
find_contacts
detect_technologies
brand_intelligence
audit_seo
audit_security
audit_quality
audit_trust
entity_graph
competitor_intelligence
generate_listing
rag_export
structured_data
api_discovery
compliance_signals
people_team
commerce_intelligence
content_freshness
link_intelligence
check_links
knowledge_export
compare_urls
batch_investigate
create_snapshot
diff_snapshot
ai_reason
list_plugins
```

See [docs/ACTIONS.md](docs/ACTIONS.md).

## HTTP API

Main endpoints:

```text
/health
/me
/actions
/search-providers
/investigate
/action/:name
/mcp
/.well-known/mcp.json
/llms.txt
/robots.txt
/sitemap.xml
```

See [docs/API.md](docs/API.md).

## Monitoring and temporal consistency

Snapshots now include:

- content fingerprint
- provenance fingerprint
- resolved claim values
- resolved claim statuses
- HTTP validators
- observation time

Snapshot history is persisted separately so repeated observations can be compared over time.

This allows the agent to distinguish a single page disagreement from a repeated pattern such as metadata remaining static while a rendered metric changes across observations.

## Security model

The core HTTP transport uses two layers of destination validation:

1. preflight URL and DNS validation;
2. connect time DNS validation in the dedicated Undici resolver used by the actual outbound socket.

Private, local, link local, cloud metadata, reserved, mapped/translation and selected transition address ranges are blocked. Mixed public/private DNS answers are rejected. Redirect destinations are revalidated.

Browser rendering is intentionally treated as a **separate network trust boundary**. v1.2 adds request interception, public address checks, subresource limits, service worker and download blocking, optional media/font blocking and bounded same origin runtime JSON capture. Security sensitive production deployments should still place browser rendering behind infrastructure level egress controls.

See [SECURITY.md](SECURITY.md) and [docs/NETWORK_SECURITY.md](docs/NETWORK_SECURITY.md).

## Reproducible benchmark

The repository includes the public URL Intelligence Benchmark and independent baseline workflows.

Current published core benchmark results are tracked in the Hugging Face dataset:

```text
https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
```

v1.2 adds a deterministic **provenance consistency fixture track** covering:

- lower bound vs exact value compatibility
- exact price conflicts
- normalized URL equivalence
- date normalization
- duplicate metadata preservation

The core benchmark score is not a claim of perfect performance on every website. Benchmark scope and limitations are documented in the dataset technical report.

## Reports and exports

Hosted signed in investigations can be exported as:

```text
PDF
JSON
Markdown
HTML
```

The JSON output contains the complete provenance model. Branded reports preserve project, repository, Hugging Face and creator attribution.

## TypeScript library

```ts
import { investigate, runAction, verifyClaim, exportProvJson } from "url-intelligence-agent";

const result = await investigate("https://example.com", {
  externalResearch: false
});

console.log(result.provenance.summary);

const verification = verifyClaim(
  result.provenance,
  "pages_indexed",
  100502
);

console.log(verification.status);
```

## Optional dependencies

Core deterministic extraction does not require an LLM.

Optional peer integrations:

```text
playwright  browser rendering
redis       shared cache
pg          PostgreSQL persistence
```

Optional OpenAI compatible reasoning can be configured separately. AI reasoning is an enhancement layer and should not replace deterministic evidence collection.

## Versioning

Application version: **1.2.0**  
Provenance schema: **1.0**

The application follows Semantic Versioning while machine readable provenance and protocol compatibility are tracked explicitly.

See [VERSIONING.md](VERSIONING.md) and [CHANGELOG.md](CHANGELOG.md).

## Safety and scope

URL Intelligence Agent is built for public web intelligence. It does not intentionally bypass authentication, CAPTCHAs or access controls.

Security results describe observable web security posture and are not penetration testing. Trust/compliance outputs are signals for review, not legal, financial or fraud determinations.

## Documentation

- [Provenance and consistency](docs/PROVENANCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Actions](docs/ACTIONS.md)
- [API](docs/API.md)
- [MCP](docs/MCP.md)
- [Remote MCP](docs/REMOTE_MCP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Network security](docs/NETWORK_SECURITY.md)
- [Web research](docs/WEB_RESEARCH.md)
- [Usage](docs/USAGE.md)
- [Versioning](VERSIONING.md)
- [Security policy](SECURITY.md)

## HORNO Network

URL Intelligence Agent was developed and refined inside the **HORNO Network** ecosystem and released open source so developers, researchers and companies can inspect, self host, extend and build on the evidence first approach.

Related projects and ecosystem links:

```text
HORNO Network          https://horno.net
HORNO Space            https://space.horno.net
Easy HORNO             https://easy.horno.net
Lightweight fetcher    https://github.com/vpicciuolo/url-metadata-social-fetcher
```

## Creator

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**

GitHub: https://github.com/vpicciuolo  
Hugging Face: https://huggingface.co/vpicciuolo  
X: https://x.com/vpicciuolo

## License

MIT. See [LICENSE](LICENSE).
