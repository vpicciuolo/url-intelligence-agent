---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first URL intelligence, reports and Remote MCP.
thumbnail: https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-2
pinned: false
hf_oauth: true
hf_oauth_expiration_minutes: 1440
tags:
  - mcp
  - remote-mcp
  - url-intelligence
  - web-intelligence
  - web-research
  - external-evidence
  - source-provenance
  - backlink-discovery
  - seo
  - security
  - entity-resolution
  - rag
  - open-source
  - typescript
  - docker
  - ai-agent
  - web-crawler
  - source-verification
  - due-diligence
  - open-graph
  - social-discovery
  - competitive-intelligence
  - website-monitoring
---

# URL Intelligence Agent

**URL in. Evidence, provenance and intelligence out.**

Open-source evidence-first URL and web intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

## Try it live

- **Live web app:** https://vpicciuolo-url-intelligence-agent.hf.space/
- **Hugging Face Space:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
- **GitHub source:** https://github.com/vpicciuolo/url-intelligence-agent
- **Public Remote MCP:** https://vpicciuolo-url-intelligence-agent.hf.space/mcp
- **MCP discovery:** https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json

The hosted Docker Space runs the real URL Intelligence Agent service plus a full web interface. Sign in with Hugging Face to use the hosted analysis UI.

The public demo is limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse. The owner account **vpicciuolo** is exempt from this hosted-demo limit. Clone or self-host the MIT-licensed project for unrestricted usage under your own infrastructure limits.

## What it does

URL Intelligence Agent performs evidence-first investigation of public URLs and web entities. It combines first-party crawling with external-source discovery and direct verification instead of treating repeated first-party claims as independent confirmation.

Core capabilities include:

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
- HTTP API, CLI, Docker and Remote MCP

## Evidence model

The project separates two evidence layers:

1. **First-party extraction** — crawls the submitted site, sitemaps and prioritized internal pages to understand what the target says about itself.
2. **External corroboration** — crosses the target-domain boundary, expands public outbound links, social/profile URLs and structured-data references, then fetches eligible external sources before they can strengthen corroboration.

**Extraction confidence** and **external corroboration** remain separate. Repetition across one domain is not counted as independent-domain confirmation.

## Hosted web actions

The live interface exposes a safe public subset of the full runtime, including:

- Full investigation
- SEO audit
- Security audit
- Trust signals
- Social-profile discovery
- Technology detection
- Brand intelligence
- Domain intelligence
- Structured-data inventory

The full investigation result can surface first-party evidence, source-linked extracted claims, external research status, search provider and queries, third-party domains, corroboration coverage, verified direct backlink signals, public social/profile verification, source context, contradictions, observation time and complete raw results.

## Reports and exports

Signed-in users can export completed investigations as:

- Branded PDF
- JSON
- Markdown
- HTML

Reports preserve attribution and evidence context and include project branding, repository information, Hugging Face information and creator attribution.

## Web-wide discovery

Direct public external URLs referenced by the target can be researched without a search credential. Broader web discovery can use the built-in public fallback or a configured provider.

Supported providers include:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

No bounded crawler can guarantee every backlink on the public internet. URL Intelligence Agent combines available search-index discovery with direct source fetching and checks fetched third-party pages before treating them as corroborating or backlink evidence.

## Full runtime action catalog

The open-source runtime contains **34 actions**:

`investigate_url`, `probe_url`, `domain_intelligence`, `render_page`, `map_site`, `deep_crawl`, `resolve_entity`, `find_social_profiles`, `find_contacts`, `detect_technologies`, `brand_intelligence`, `audit_seo`, `audit_security`, `audit_quality`, `audit_trust`, `entity_graph`, `competitor_intelligence`, `structured_data`, `api_discovery`, `compliance_signals`, `people_team`, `commerce_intelligence`, `content_freshness`, `link_intelligence`, `check_links`, `generate_listing`, `rag_export`, `knowledge_export`, `compare_urls`, `batch_investigate`, `create_snapshot`, `diff_snapshot`, `ai_reason`, `list_plugins`.

## Remote MCP

Public Streamable HTTP MCP endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine-readable discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

Compatible clients that support Remote MCP / Streamable HTTP custom servers can connect directly. The repository also includes local stdio MCP for self-hosted use.

## Main HTTP endpoints

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

## Built inside HORNO Network. Now open source.

URL Intelligence Agent was developed, tested and refined inside the **HORNO Network ecosystem**, where its URL intelligence, evidence collection and enrichment workflows have been used in production-oriented scenarios.

After proving the technology in a live ecosystem, **HORNO Network founder Vincenzo Picciuolo** released the project as open source so developers, AI builders, researchers and companies can inspect it, self-host it, extend it and build on it.

Related projects and ecosystem links:

- **URL Metadata & Social Profile Fetcher:** https://github.com/vpicciuolo/url-metadata-social-fetcher
- **HORNO Network:** https://horno.net/
- **HORNO Space:** https://space.horno.net/

## Documentation

- GitHub repository: https://github.com/vpicciuolo/url-intelligence-agent
- Action reference: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md
- Web research architecture: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md
- MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md
- Remote MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md

## Evidence and uncertainty FAQ

**Why are extraction confidence and external corroboration separate?**  
Extraction confidence describes how strongly observable target content supports an extracted field. External corroboration measures coverage across fetched third-party domains. They answer different questions and are not combined into a fake probability of truth.

**What if the same claim appears on many pages of one website?**  
It remains first-party evidence from one domain. It may strengthen extraction reliability, but it does not create independent sources.

**Does Full Investigation go beyond the target website?**  
Yes. It can expand public external references, search the wider web, fetch independent sources and check whether third-party pages mention or link back to the target.

**Does it find every backlink?**  
No. Complete reverse-link discovery requires a global backlink/search index. Coverage depends on what is publicly discoverable and on the available provider.

**What if sources disagree?**  
Contradictions can remain explicit in the result instead of being silently collapsed into one answer.

**Can sources be inspected?**  
Yes. Public source URLs remain attached to evidence and research results.

**Are SEO, security, trust or compliance outputs definitive?**  
No. They are explainable observations of public signals. Security audit is not penetration testing, and compliance/trust outputs are not legal or financial determinations.

## Creator

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**

- GitHub: https://github.com/vpicciuolo
- Hugging Face: https://huggingface.co/vpicciuolo
- X: https://x.com/vpicciuolo
- LinkedIn: https://www.linkedin.com/in/vpicciuolo/
