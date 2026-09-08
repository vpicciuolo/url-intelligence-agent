---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first URL intelligence + claim provenance + Remote MCP.
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
  <img src="https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-2" alt="URL Intelligence Agent — evidence-first web intelligence" width="100%">
</p>

# 🧠 URL Intelligence Agent

### Public URL in. Evidence, provenance, consistency and intelligence out.

Open-source URL and web-intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**. v1.2.0 adds a **Claim Provenance & Temporal Consistency Engine** that preserves where values came from, normalizes them, compares metadata/structured/visible representations, distinguishes compatible variation from real contradiction, and exposes the result through the web app, API and Remote MCP.

<p align="center">
  <img src="https://img.shields.io/badge/release-v1.2.0-00c853?style=for-the-badge" alt="v1.2.0">
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/"><img src="https://img.shields.io/badge/TRY%20LIVE-Evidence%20Inspector-2563EB?style=for-the-badge" alt="Try live"></a>
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/mcp"><img src="https://img.shields.io/badge/REMOTE%20MCP-2026--07--28-7C3AED?style=for-the-badge" alt="Remote MCP"></a>
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard"><img src="https://img.shields.io/badge/LEADERBOARD-Independent%20Baselines-059669?style=for-the-badge" alt="Independent benchmark leaderboard"></a>
  <a href="https://github.com/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/GITHUB-Open%20Source-111827?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

## 🔬 What v1.2.0 changes

Most URL extractors flatten a page into one title, one description and a few metadata values. URL Intelligence Agent now preserves a deeper evidence model.

For each claim it can retain:

- raw value and normalized value;
- page URL and final URL;
- source representation (`source_html`, optional `rendered_dom`, HTTP/runtime evidence);
- source layer (meta, Open Graph, Twitter Card, JSON-LD, Microdata, RDFa, visible content, HTTP headers, runtime API);
- property/locator, JSON Pointer and source positions when available;
- observed time and HTTP validators;
- document and observation SHA-256 hashes;
- extraction, source-authority and freshness confidence dimensions;
- conflict/drift status and an explainable resolution policy.

### Example: not every difference is a contradiction

```text
Open Graph description:  80,000+ pages indexed
Rendered content:       100,502 pages indexed
```

`80,000+` means **at least 80,000**, so `100,502` is logically compatible. The useful result is instead:

```text
logical conflict         NO
precision difference     YES
representation drift     YES
freshness divergence     YES
stale metadata suspected YES
preferred exact value    100,502
```

That distinction is designed for AI agents, RAG systems, monitoring, research and verification workflows.

## ⚡ Investigation pipeline

```text
Public URL
   ↓
Guarded HTTP collection + redirects + charset decoding
   ↓
Source HTML representation
   ├─ HTTP headers / validators
   ├─ meta / Open Graph / Twitter Cards
   ├─ JSON-LD / Microdata / RDFa
   └─ visible content claims
   ↓
Optional isolated browser representation
   ├─ rendered DOM
   └─ bounded same-origin runtime JSON evidence
   ↓
EvidenceObservation records
   ↓
Field-aware normalization + claim grouping
   ↓
Consensus / compatible variation / drift / conflict
   ↓
Preferred value + explanation + hashes + provenance graph
   ↓
External public corroboration (Full Investigation)
   ↓
Web Evidence Inspector / JSON / PDF / Markdown / HTML / MCP / RAG
```

## 🧪 Reproducible benchmark + independent baselines

The project is continuously tested against the public **URL Intelligence Benchmark** on Hugging Face. Independent pinned open-source tools are also run against the core track; raw predictions and scorer outputs are published.

| Tool | Type | Core score | Safety | Status | Redirects | Content | Full agent |
|---|---|---:|---:|---:|---:|---:|---:|
| **URL Intelligence Agent** | Full agent / MCP | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **6/6 — 100%** |
| **url-metadata 5.12.0** | Independent metadata/network library | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | N/A |
| **link-preview-js 5.0.0** | Independent link-preview library | **71.67%** | **100.00%** | **17.14%** | **75.00%** | **84.62%** | N/A |

The core tie is intentionally transparent: the current core benchmark measures URL/network fundamentals, while URL Intelligence Agent additionally runs a full intelligence path. v1.2.0 adds deterministic provenance fixtures for claim attribution, normalization, false-conflict prevention and drift/conflict handling; these form the basis of the expanding Agent Intelligence track.

**Dataset:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark  
**Leaderboard:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard  
**Technical report:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark/blob/main/TECHNICAL_REPORT.md

Scores describe the published benchmark, not perfect performance on every website.

## 🚀 Try it live

**Web app:** https://vpicciuolo-url-intelligence-agent.hf.space/

The hosted Docker Space runs the real open-source engine. Sign in with Hugging Face to run hosted analysis and export reports.

The hosted web demo is limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse. The owner account `vpicciuolo` is exempt. Clone/self-host the MIT-licensed project for unrestricted use.

The v1.2 UI includes an **Evidence Inspector** showing:

- observation count;
- resolved claims;
- drift count;
- conflict count;
- suspected stale metadata;
- source layers and representations;
- claim-level resolution explanations.

## 🔌 Remote MCP

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine-readable discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

v1.2.0 supports:

- **MCP 2026-07-28** modern stateless HTTP;
- 2025-11-25;
- 2025-06-18;
- 2025-03-26;
- strict input/output schemas;
- modern discovery/routing metadata;
- persisted `io.modelcontextprotocol/tasks` for supported long-running calls;
- legacy initialization/session compatibility.

New evidence-focused tools:

```text
inspect_provenance
verify_claim
```

The public Remote MCP demo exposes a bounded subset of tools and applies a **1 analysis call per IP / 24h** anti-abuse limit. Self-hosting removes this hosted-demo policy.

## 🔎 Core capabilities

- Claim-level source provenance and evidence hashes
- Metadata vs visible-content consistency analysis
- Source HTML vs optional rendered-DOM drift analysis
- Exact/range/lower-bound/approximate numeric semantics
- JSON-LD, Microdata and RDFa evidence extraction
- Open Graph, Twitter Card, standard meta and HTTP evidence
- Claim verification (`supported`, `compatible`, `contradicted`, `not_found`)
- W3C PROV-shaped evidence export
- Provenance-aware temporal snapshots and claim diffs
- ETag / Last-Modified collection and conditional HTTP support
- Full URL investigation and deep crawl
- External article/reference discovery and verification
- Entity resolution and social/contact discovery
- SEO, security, quality and trust audits
- Technology, brand and domain intelligence
- Competitive intelligence and website monitoring
- RAG and knowledge export
- Branded PDF, JSON, Markdown and HTML reports
- HTTP API, CLI, Docker, local MCP and Remote MCP

## 🧠 Evidence-first architecture

The project deliberately separates evidence dimensions:

1. **Target-side extraction** — what the submitted site and its first-party representations say.
2. **Claim provenance** — exactly which layer/representation produced each value and how it was normalized/resolved.
3. **External corroboration** — independent/public-platform evidence fetched outside the target domain.

Extraction confidence, resolution confidence and external corroboration are separate. None is presented as a universal probability that a real-world claim is true.

## 🛡️ Safety model — v1.2.0

The core HTTP collector retains the v1.1.0 two-stage SSRF boundary:

- validates HTTP/HTTPS URLs, credentials, hostnames and DNS answers before collection;
- blocks loopback, private, link-local, cloud-metadata, mapped/translation, selected tunnel/transition and reserved address classes;
- rejects mixed DNS answers if any returned address is non-public;
- validates DNS again inside the guarded Undici socket resolver, closing the normal DNS-rebinding/TOCTOU gap for core HTTP collection;
- manually revalidates every redirect target;
- bounds request time, response bytes and redirect count.

v1.2 additionally adds charset-aware decoding and conditional HTTP validators.

Optional Playwright rendering is a **separate browser network trust boundary**. The implementation adds public-address request interception, request bounds, service-worker/download blocking and bounded same-origin runtime JSON capture. Browser automation is still disabled by default in this public Space unless a separately controlled renderer is configured. Security-sensitive self-hosters should combine browser rendering with infrastructure-level egress isolation.

Technical details: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/NETWORK_SECURITY.md

Security output is observational auditing, not penetration testing; trust/compliance output is not a legal or financial determination.

## 📄 Reports and exports

Signed-in users can export completed investigations as:

- Branded PDF
- JSON
- Markdown
- HTML

The full JSON result includes the provenance model. Reports preserve project, repository, Hugging Face and creator attribution.

## 🌐 Web-wide discovery

Direct external URLs referenced by the target can be researched without a search credential. Broader discovery can use:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

No bounded crawler can guarantee every backlink on the public internet. External corroboration only strengthens after eligible sources are fetched/verified.

## 🧰 Full runtime action catalog

The open-source runtime contains **36 actions**:

`investigate_url`, `inspect_provenance`, `verify_claim`, `probe_url`, `domain_intelligence`, `render_page`, `map_site`, `deep_crawl`, `resolve_entity`, `find_social_profiles`, `find_contacts`, `detect_technologies`, `brand_intelligence`, `audit_seo`, `audit_security`, `audit_quality`, `audit_trust`, `entity_graph`, `competitor_intelligence`, `generate_listing`, `rag_export`, `structured_data`, `api_discovery`, `compliance_signals`, `people_team`, `commerce_intelligence`, `content_freshness`, `link_intelligence`, `check_links`, `knowledge_export`, `compare_urls`, `batch_investigate`, `create_snapshot`, `diff_snapshot`, `ai_reason`, `list_plugins`.

## 🔗 Main endpoints

```text
/health
/me
/actions
/investigate
/action/:name
/mcp
/.well-known/mcp.json
/llms.txt
/robots.txt
/sitemap.xml
```

## 🔥 Built inside HORNO Network. Now open source.

URL Intelligence Agent was developed and refined inside the **HORNO Network ecosystem** for production-oriented web intelligence and evidence workflows. **HORNO Network founder Vincenzo Picciuolo** released the project as open source so developers, researchers and companies can inspect, self-host, extend and build on it.

Related:

- URL Metadata & Social Profile Fetcher: https://github.com/vpicciuolo/url-metadata-social-fetcher
- HORNO Network: https://horno.net/
- HORNO Space: https://space.horno.net/

## 📚 Documentation

- GitHub: https://github.com/vpicciuolo/url-intelligence-agent
- Claim provenance: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/PROVENANCE.md
- Versioning: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/VERSIONING.md
- Network security: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/NETWORK_SECURITY.md
- Security policy: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/SECURITY.md
- Actions: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md
- Web research: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md
- MCP: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md
- Remote MCP: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md

## 👤 Creator

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**

- Hugging Face: https://huggingface.co/vpicciuolo
- GitHub: https://github.com/vpicciuolo
- X: https://x.com/vpicciuolo
- LinkedIn: https://www.linkedin.com/in/vpicciuolo/
