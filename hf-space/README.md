---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first web intelligence, source verification, reports & Remote MCP.
thumbnail: https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260907-3
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
---

# URL Intelligence Agent

**URL in. Evidence, provenance and intelligence out.**

Open-source evidence-first URL and web intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

The project is designed around a simple principle: confidence should come from observable evidence, not from an AI merely sounding confident — and a website should not be allowed to confirm its own claims simply by repeating them across many pages.

Full investigation therefore uses two distinct evidence layers:

1. **First-party extraction** — crawl the submitted site, sitemaps and prioritized internal pages to understand what the target says about itself.
2. **External corroboration** — cross the target-domain boundary, expand public outbound links, social/profile URLs and JSON-LD references, then actually fetch/read eligible destinations before they can strengthen confidence. Search-index results add independent articles and backlink-style sources. A direct link from the target is treated only as a lead until the destination itself is verified.

The result keeps **extraction confidence** separate from **external corroboration**. Repetition across one domain is not counted as independent-domain confirmation.

## Live hosted demo

**Live app:** https://vpicciuolo-url-intelligence-agent.hf.space/

**Public Remote MCP:** https://vpicciuolo-url-intelligence-agent.hf.space/mcp

**Hugging Face Space:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent

The Docker Space runs the real URL Intelligence Agent HTTP service and a human-friendly web interface. Sign in with Hugging Face to test the hosted analysis UI.

The public hosted demo is intentionally limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse. Clone or self-host the MIT-licensed project for unrestricted usage under your own infrastructure limits.

Hosted web actions currently include:

- Full URL investigation with external web evidence expansion
- SEO audit
- Security audit
- Trust signals
- Social profile discovery
- Technology detection
- Brand intelligence
- Domain intelligence
- Structured-data inventory

The full investigation result surfaces:

- First-party evidence pages
- Evidence-linked extracted claims
- Extraction confidence and method
- External web research status
- Search provider used
- Search queries used
- Third-party sources and domains
- Independent-domain corroboration coverage
- Verified direct backlink signals from fetched sources
- Direct external-reference verification counts
- Public social/profile verification status
- Parsed external content samples / source context
- External article/source URLs
- Explicit contradictions / disputed evidence
- Observation time
- Complete raw response
- Branded PDF, JSON, Markdown and HTML exports

## Web-wide evidence discovery

External URLs directly referenced by the target are researched without a search credential. The hosted runtime also includes a **built-in public DuckDuckGo search fallback** for broader entity/article/backlink-style discovery when no commercial search provider is configured.

For higher-volume or more reproducible discovery, configure one supported provider. When present, these are preferred automatically:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

The external stage is intentionally bounded. It does not pretend that any crawler can enumerate the entire public web.

A crawler cannot guarantee every backlink on the internet because complete reverse-link discovery requires a global backlink/search index. URL Intelligence Agent combines search-index discovery with direct source fetching, then checks fetched third-party pages for links back to the target before treating those pages as backlink evidence.

Full architecture and configuration:

https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md

## Built inside HORNO Network. Now open source.

URL Intelligence Agent was not created as a standalone demo. It was developed, tested and refined inside the **HORNO Network ecosystem**, where its URL intelligence, evidence collection and enrichment workflows run in real production use cases.

After proving the technology in a live ecosystem, **HORNO Network founder Vincenzo Picciuolo** chose to release the project as open source so developers, AI builders, researchers and companies can inspect it, self-host it, extend it and build with it. The project is developed by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

- **URL Metadata & Social Profile Fetcher** — lightweight deterministic companion for URL metadata, Open Graph, canonical URLs, images and social/profile discovery: https://github.com/vpicciuolo/url-metadata-social-fetcher?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent
- **HORNO Network** — the production ecosystem where the agent has been developed, tested and used: https://horno.net/?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent
- **HORNO Space** — digital identity and smart-link product connected to the URL enrichment and public-profile intelligence layer: https://space.horno.net/?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent

### Follow Vincenzo Picciuolo

- X: https://x.com/vpicciuolo?utm_source=huggingface&utm_medium=social&utm_campaign=url_intelligence_agent
- LinkedIn: https://www.linkedin.com/in/vpicciuolo/?utm_source=huggingface&utm_medium=social&utm_campaign=url_intelligence_agent


## Complete runtime action catalog

The open-source runtime contains **34 actions** across discovery, crawling, identity, audits, technical intelligence, content, commerce, RAG, monitoring and automation:

`investigate_url`, `probe_url`, `domain_intelligence`, `render_page`, `map_site`, `deep_crawl`, `resolve_entity`, `find_social_profiles`, `find_contacts`, `detect_technologies`, `brand_intelligence`, `audit_seo`, `audit_security`, `audit_quality`, `audit_trust`, `entity_graph`, `competitor_intelligence`, `structured_data`, `api_discovery`, `compliance_signals`, `people_team`, `commerce_intelligence`, `content_freshness`, `link_intelligence`, `check_links`, `generate_listing`, `rag_export`, `knowledge_export`, `compare_urls`, `batch_investigate`, `create_snapshot`, `diff_snapshot`, `ai_reason`, `list_plugins`.

The live web page includes a description, input and output explanation for every action.

## Public Remote MCP

The Space exposes a public **Streamable HTTP MCP** endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine-readable discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

Compatible AI clients can discover the hosted public tool subset through MCP. The full repository also includes a local stdio MCP server for unrestricted self-hosted use.

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

## Evidence and uncertainty FAQ

**Why are extraction confidence and external corroboration separate?**  
Extraction confidence describes how strongly the target's observable metadata/content supports an extracted field. External corroboration describes coverage across fetched third-party domains. They answer different questions and are not combined into a fake probability of truth.

**What if the same claim appears on 30 pages of one website?**  
That is still first-party evidence from one domain. It may strengthen extraction reliability, but it does not create 30 independent sources.

**Does Full Investigation go beyond the target website?**  
Yes. The first stage crawls the target. The second stage crosses the domain boundary, expands public external references, searches the web, fetches independent sources and checks whether third-party pages mention or directly link back to the target.

**Does it find every backlink?**  
No. No bounded live crawler has a complete reverse-link map of the internet. Coverage depends on what is publicly discoverable and on the search/backlink index available to the runtime.

**What if sources disagree?**  
Full investigations can return explicit contradictions. The web UI marks disputed evidence and keeps the disagreement visible instead of silently collapsing it into one answer.

**Does “no contradiction” mean full consensus?**  
No. It only means the current analysis did not report an explicit contradiction.

**Can sources be inspected?**  
Yes. Public source URLs remain attached to evidence and external research sources are surfaced as openable links.

**How current is the result?**  
Where available, `observedAt` is shown. Public web intelligence is point-in-time evidence and can change later.

**Are SEO, security, trust or compliance outputs definitive?**  
No. They are explainable observations of public signals. Security audit is not penetration testing and compliance/trust outputs are not legal or financial determinations.

## Source and full documentation

GitHub: https://github.com/vpicciuolo/url-intelligence-agent  
Action reference: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md  
Web research: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md  
MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md  
Remote MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**
