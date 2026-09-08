---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: URL intelligence, provenance and Remote MCP.
thumbnail: https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-2
pinned: true
fullWidth: true
hf_oauth: true
hf_oauth_expiration_minutes: 1440
datasets:
  - vpicciuolo/url-intelligence-benchmark
tags:
  - mcp
  - remote-mcp
  - url-intelligence
  - web-intelligence
  - claim-verification
  - field-level-provenance
  - source-provenance
  - representation-drift
  - temporal-consistency
  - structured-data
  - web-research
  - seo
  - security
  - entity-resolution
  - rag
  - open-source
  - typescript
  - ai-agent
  - web-crawler
  - source-verification
  - due-diligence
  - open-graph
  - social-discovery
  - competitive-intelligence
  - website-monitoring
---

<p align="center">
  <img src="https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-2" alt="URL Intelligence Agent — evidence-first URL and web intelligence" width="100%">
</p>

# 🧠 URL Intelligence Agent v1.3.0

### Public URL in. Evidence, provenance, consistency and intelligence out.

Open-source URL and web intelligence agent created by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd** and developed inside the **HORNO Network** ecosystem.

v1.3.0 introduces the **Claim Provenance & Temporal Consistency Engine**. The agent preserves where values came from, normalizes field values, compares metadata/structured/visible representations, separates compatible variation from real contradiction, detects drift and explains why a preferred value was selected.

<p align="center">
  <img src="https://img.shields.io/badge/release-v1.3.0-00c853?style=for-the-badge" alt="v1.3.0">
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/"><img src="https://img.shields.io/badge/TRY%20LIVE-Evidence%20Inspector-2563EB?style=for-the-badge" alt="Try live"></a>
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/mcp"><img src="https://img.shields.io/badge/REMOTE%20MCP-2026--07--28-7C3AED?style=for-the-badge" alt="Remote MCP"></a>
  <a href="https://github.com/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/GITHUB-Open%20Source-111827?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

## Semantic conflict intelligence

The v1.3 resolver distinguishes semantic equivalence and wording variation from factual disagreement and explicit logical contradiction, reducing false-positive conflicts in metadata while preserving provenance and source-level evidence.


## 🔬 Claim provenance instead of one flattened answer

Example:

```text
Open Graph description:  80,000+ pages indexed
Rendered content:       100,502 pages indexed
```

`80,000+` is a lower bound. `100,502` satisfies it, so the two statements are logically compatible even though the page representations have drifted.

URL Intelligence Agent can report:

```text
logical conflict          NO
precision difference      YES
representation drift      YES
freshness divergence      YES
stale metadata suspected  YES
preferred exact value     100502
```

That distinction is useful for AI agents, RAG, monitoring, search/SEO intelligence and verification workflows.

## Evidence Inspector

The hosted web app now displays an **Evidence Inspector** with:

- observation count;
- resolved claim count;
- drift/conflict counts;
- suspected stale metadata;
- source representations;
- evidence layers;
- claim-level flags;
- resolution confidence and explanations.

## Evidence model

Each observation can preserve:

```text
raw value
normalized value
page URL / final URL
representation
source layer
property / locator
JSON Pointer
source positions
timestamp
request variant
document SHA-256
observation SHA-256
extraction confidence
source authority
freshness confidence
```

Claim states:

```text
consensus
compatible_variation
drift
conflict
insufficient_evidence
```

Evidence layers include:

```text
HTTP headers
source HTML
meta
Open Graph
Twitter Cards
JSON-LD
Microdata
RDFa
visible content
optional rendered DOM
bounded same-origin runtime JSON
```

## Investigation pipeline

```text
Public URL
   ↓
Guarded HTTP collection
   ↓
Source HTML representation
   ├─ headers / validators
   ├─ meta / Open Graph / Twitter
   ├─ JSON-LD / Microdata / RDFa
   └─ visible claims
   ↓
Optional browser representation
   ├─ rendered DOM
   └─ bounded same-origin JSON evidence
   ↓
EvidenceObservation records
   ↓
field-aware normalization
   ↓
claim grouping + consistency comparison
   ↓
consensus / compatible variation / drift / conflict
   ↓
resolved claims + explanations + hashes
   ↓
entity / SEO / security / trust / technology / brand / RAG
   ↓
Web UI / API / MCP / reports
```

## Try it live

Live app:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/
```

The hosted web demo requires Hugging Face sign-in.

Public demo policy:

```text
1 analysis request per signed-in Hugging Face account every 24 hours
owner account vpicciuolo is exempt
```

Clone or self-host the MIT-licensed repository for unrestricted use.

## Remote MCP

Endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

Supported protocol revisions:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

v1.2 adds modern stateless MCP behavior, `server/discover`, routing metadata, cache hints, strict per-tool schemas and optional MCP Tasks support while retaining legacy client compatibility.

New provenance tools:

```text
inspect_provenance
verify_claim
```

The hosted Remote MCP uses a bounded anti-abuse policy. The open-source runtime exposes all 36 actions when self-hosted.

## Core capabilities

- claim-level provenance and evidence hashes;
- metadata vs visible-content consistency;
- source HTML vs rendered-DOM drift analysis;
- exact/range/lower-bound/approximate numeric semantics;
- JSON-LD, Microdata and RDFa evidence extraction;
- Open Graph, Twitter Card, standard meta and HTTP evidence;
- claim verification: `supported`, `compatible`, `contradicted`, `not_found`;
- W3C PROV-shaped export;
- provenance-aware temporal snapshots and claim diffs;
- ETag / Last-Modified support;
- full URL investigation and bounded deep crawl;
- entity resolution;
- social/contact discovery;
- technology and brand intelligence;
- domain intelligence;
- SEO/security/quality/trust audits;
- external public corroboration;
- competitor/commerce/content freshness intelligence;
- RAG and knowledge export;
- branded PDF, JSON, Markdown and HTML reports;
- CLI, HTTP API, Docker, stdio MCP and Remote MCP.

## Security model

Core HTTP collection uses:

- public HTTP/HTTPS validation;
- preflight DNS validation;
- connect-time DNS validation inside the actual Undici socket resolver;
- private/reserved address blocking;
- mixed public/private DNS answer rejection;
- redirect revalidation;
- bounded time/bytes/redirects;
- charset-aware decoding.

Optional browser rendering is a **separate network trust boundary**. v1.2 adds browser request filtering/bounds and same-origin runtime evidence capture, but security-sensitive self-hosters should still isolate browser egress at the infrastructure level.

Security output is observational auditing, not penetration testing. Trust/compliance signals are not legal or financial determinations.

## Benchmark

Dataset:

```text
https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
```

Leaderboard:

```text
https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
```

v1.2 adds deterministic provenance consistency fixtures covering lower-bound compatibility, exact conflicts, URL/date normalization and duplicate metadata preservation.

Published benchmark scores describe the benchmark scope; they are not a claim of perfect performance on every website.

## Reports

Signed-in hosted investigations can be exported as:

```text
PDF
JSON
Markdown
HTML
```

The JSON result contains the full provenance model. Reports include project, GitHub, Hugging Face, creator and company attribution.

## Open source

Repository:

```text
https://github.com/vpicciuolo/url-intelligence-agent
```

Lightweight standalone metadata fetcher:

```text
https://github.com/vpicciuolo/url-metadata-social-fetcher
```

## HORNO Network

```text
https://horno.net
https://space.horno.net
https://easy.horno.net
```

## Creator

**Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**

GitHub: https://github.com/vpicciuolo  
Hugging Face: https://huggingface.co/vpicciuolo  
X: https://x.com/vpicciuolo
