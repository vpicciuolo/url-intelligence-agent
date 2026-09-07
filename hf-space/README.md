---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first URL intelligence agent + Remote MCP.
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
  - web-research
  - source-provenance
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

### Paste any public URL. Get evidence-backed web intelligence.

**URL in. Identity, evidence, provenance and intelligence out.**

Open-source URL and web-intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**. It crawls public web sources, resolves entities, verifies evidence, audits SEO/security/trust, discovers social and technology signals, exports branded reports, and exposes the same engine through **Remote MCP**.

<p align="center">
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/"><img src="https://img.shields.io/badge/TRY%20LIVE-Open%20Web%20Demo-2563EB?style=for-the-badge" alt="Try live"></a>
  <a href="https://vpicciuolo-url-intelligence-agent.hf.space/mcp"><img src="https://img.shields.io/badge/REMOTE%20MCP-Connect-7C3AED?style=for-the-badge" alt="Remote MCP"></a>
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard"><img src="https://img.shields.io/badge/LEADERBOARD-3%20Verified%20Tools-059669?style=for-the-badge" alt="Independent benchmark leaderboard"></a>
  <a href="https://github.com/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/GITHUB-Open%20Source-111827?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

## ⚡ What happens after you paste a URL

```text
Public URL
   ↓
Safe fetch + SSRF protection
   ↓
Deep crawl + metadata + structured data
   ↓
Entity resolution + technology + social discovery
   ↓
SEO + security + quality + trust audits
   ↓
External evidence + source verification + contradictions
   ↓
PDF / JSON / Markdown / HTML / MCP
```

## 🧪 Reproducible benchmark + independent baselines

The project is continuously tested against the public **URL Intelligence Benchmark** on Hugging Face. The same core suite is also run against pinned independent open-source tools; raw predictions and scorer outputs are published with the Dataset.

| Tool | Type | Core score | Safety | Status | Redirects | Content | Full agent |
|---|---|---:|---:|---:|---:|---:|---:|
| **URL Intelligence Agent** | Full agent / MCP | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **6/6 — 100%** |
| **url-metadata 5.12.0** | Independent metadata/network library | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | N/A |
| **link-preview-js 5.0.0** | Independent link-preview library | **71.67%** | **100.00%** | **17.14%** | **75.00%** | **84.62%** | N/A |

The #1 core-score tie with `url-metadata` is deliberate to show transparently: **v0.1 measures URL/network fundamentals and safety, not the complete intelligence depth of an agent.** URL Intelligence Agent additionally completes the selected full `investigate()` track, while library baselines do not implement that pipeline. Future benchmark versions will add a separate Agent Intelligence track for entity resolution, evidence provenance, external corroboration, social verification, structured-data accuracy, technology detection and related semantic capabilities.

**Dataset:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark  
**Leaderboard:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard  
**Technical report:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark/blob/main/TECHNICAL_REPORT.md

The scores refer to the current published benchmark version, not a claim of perfect performance on every website on the internet.

## 🚀 Try it live

**Web app:** https://vpicciuolo-url-intelligence-agent.hf.space/

The hosted Docker Space runs the real open-source engine. Sign in with Hugging Face to use the hosted analysis interface.

The public demo is rate-limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse. The owner account `vpicciuolo` is exempt. For unrestricted usage, clone or self-host the MIT-licensed project.

## 🔌 Remote MCP

Use the live service from compatible MCP clients and AI agent frameworks.

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine-readable MCP discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

The repository also includes local stdio MCP for self-hosted workflows.

## 🔎 Core capabilities

- Full URL investigation and deep crawl
- External article and backlink-style source discovery
- Direct verification of third-party links and public profiles
- Source provenance and evidence-linked claims
- Explicit contradiction reporting
- Entity resolution and social-profile discovery
- SEO, security, quality and trust audits
- Technology and brand intelligence
- Domain intelligence and structured-data extraction
- Competitive intelligence and website monitoring
- RAG and knowledge export
- Branded PDF, JSON, Markdown and HTML reports
- HTTP API, CLI, Docker, local MCP and Remote MCP

## 🧠 Evidence-first architecture

The project deliberately separates two evidence layers:

1. **First-party extraction** — crawls the submitted site, sitemaps and prioritized internal pages to understand what the target says about itself.
2. **External corroboration** — crosses the target-domain boundary, expands public references, social/profile URLs and structured-data relationships, then fetches eligible external sources before they can strengthen corroboration.

**Extraction confidence** and **external corroboration** remain separate. Repetition across one domain is not treated as independent confirmation.

## 🛡️ Safety model

Outbound requests pass through URL validation and SSRF protections before fetching. The benchmark includes malformed URLs, unsupported schemes, loopback, private-network, link-local, cloud-metadata and obfuscated-address cases.

This is public-web intelligence software. Security output is observational auditing, not penetration testing; trust/compliance output is not a legal or financial determination.

## 📄 Reports and exports

Signed-in users can export completed investigations as:

- Branded PDF
- JSON
- Markdown
- HTML

Reports preserve evidence context and include project, repository, Hugging Face and creator attribution.

## 🌐 Web-wide discovery

Direct external URLs referenced by the target can be researched without a search credential. Broader discovery can use the built-in public fallback or a configured provider:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

No bounded crawler can guarantee every backlink on the public internet. The agent combines available search-index discovery with direct source fetching before treating third-party pages as corroborating evidence.

## 🧰 Full runtime action catalog

The open-source runtime contains **34 actions**:

`investigate_url`, `probe_url`, `domain_intelligence`, `render_page`, `map_site`, `deep_crawl`, `resolve_entity`, `find_social_profiles`, `find_contacts`, `detect_technologies`, `brand_intelligence`, `audit_seo`, `audit_security`, `audit_quality`, `audit_trust`, `entity_graph`, `competitor_intelligence`, `structured_data`, `api_discovery`, `compliance_signals`, `people_team`, `commerce_intelligence`, `content_freshness`, `link_intelligence`, `check_links`, `generate_listing`, `rag_export`, `knowledge_export`, `compare_urls`, `batch_investigate`, `create_snapshot`, `diff_snapshot`, `ai_reason`, `list_plugins`.

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

URL Intelligence Agent was developed and refined inside the **HORNO Network ecosystem** for production-oriented URL intelligence, evidence collection and enrichment workflows. **HORNO Network founder Vincenzo Picciuolo** released the project as open source so developers, researchers and companies can inspect, self-host, extend and build on it.

Related:

- URL Metadata & Social Profile Fetcher: https://github.com/vpicciuolo/url-metadata-social-fetcher
- HORNO Network: https://horno.net/
- HORNO Space: https://space.horno.net/

## 📚 Documentation

- GitHub: https://github.com/vpicciuolo/url-intelligence-agent
- Actions: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md
- Web research architecture: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md
- MCP: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md
- Remote MCP: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md

## 👤 Creator

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**

- Hugging Face: https://huggingface.co/vpicciuolo
- GitHub: https://github.com/vpicciuolo
- X: https://x.com/vpicciuolo
- LinkedIn: https://www.linkedin.com/in/vpicciuolo/
