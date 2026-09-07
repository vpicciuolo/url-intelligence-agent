---
title: URL Intelligence Agent
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first URL intelligence, reports and Remote MCP.
thumbnail: https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-1
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

[![URL Intelligence Agent — Evidence-first web intelligence](https://vpicciuolo-url-intelligence-agent.hf.space/assets/og.jpg?v=20260908-1)](https://vpicciuolo-url-intelligence-agent.hf.space/)

**URL in. Evidence, provenance and intelligence out.**

Open-source evidence-first URL and web intelligence agent created by **Vincenzo Picciuolo** and developed by **HRN Innovation Technologies Ltd**, with technology developed and production-tested inside the **HORNO Network ecosystem**.

URL Intelligence Agent crawls a target, extracts observable facts, expands beyond the target domain, fetches public external sources, preserves provenance, reports contradictions, performs technical audits and exposes the same intelligence engine through a web UI, HTTP API, CLI and MCP.

## Try it live

| Resource | URL |
| --- | --- |
| **Live web app** | https://vpicciuolo-url-intelligence-agent.hf.space/ |
| **Hugging Face Space** | https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent |
| **Public Remote MCP** | https://vpicciuolo-url-intelligence-agent.hf.space/mcp |
| **MCP discovery** | https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json |
| **GitHub source** | https://github.com/vpicciuolo/url-intelligence-agent |
| **Documentation** | https://github.com/vpicciuolo/url-intelligence-agent/tree/main/docs |

The Hugging Face Space runs the real Dockerized URL Intelligence Agent service, not a mocked showcase.

### Hosted demo rules

- **Hugging Face sign-in is required** for hosted web investigations.
- The public hosted demo is limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse.
- The project owner account `vpicciuolo` is exempt from the public demo allowance.
- Hosted report exports are tied to completed authenticated analyses.
- The public Remote MCP exposes a bounded hosted tool subset. Clone or self-host the MIT-licensed project for unrestricted usage under your own infrastructure limits.

## What you can test in the hosted app

The live web interface currently exposes:

- **Full URL investigation** with first-party crawling and external evidence expansion
- **SEO audit**
- **Security audit**
- **Trust-signal analysis**
- **Social profile discovery and verification**
- **Technology detection**
- **Brand intelligence**
- **Domain intelligence**
- **Structured-data inventory**

A full investigation can surface:

- First-party evidence pages
- Evidence-linked extracted claims
- Extraction confidence and extraction method
- External web-research status
- Search provider used
- Search queries used
- Third-party sources and independent domains
- Independent-domain corroboration coverage
- Verified direct backlink signals from fetched sources
- Direct external-reference verification counts
- Public social/profile verification status
- Parsed external content samples and source context
- External article/source URLs
- Explicit contradictions and disputed evidence
- Observation time
- Complete raw response
- Branded **PDF, JSON, Markdown and HTML** report exports

## Evidence-first architecture

The project is designed around a simple principle: **confidence should come from observable evidence, not from an AI merely sounding confident**.

A website is also not allowed to confirm its own claims simply by repeating them across many pages.

Full investigation therefore keeps two evidence layers separate:

1. **First-party extraction** — crawl the submitted site, sitemaps and prioritized internal pages to understand what the target says about itself.
2. **External corroboration** — cross the target-domain boundary, expand public outbound links, social/profile URLs and structured-data references, then fetch and read eligible destinations before they can strengthen corroboration. Search-index results can add independent articles and backlink-style sources.

A direct link from the target is treated as a **lead**, not independent proof, until the destination itself has been fetched and evaluated.

The result keeps **extraction confidence** separate from **external corroboration**. Repetition across one domain is not counted as independent-domain confirmation.

## Web-wide evidence discovery

External URLs directly referenced by the target can be researched without a commercial search credential. The runtime can also use public-search fallback behavior for broader entity, article and backlink-style discovery when no configured provider is available.

For higher-volume or more reproducible discovery, configure a supported provider. When present, these can be preferred automatically:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

The external stage is intentionally bounded. It does **not** claim to enumerate the entire public web.

A crawler cannot guarantee every backlink on the internet because complete reverse-link discovery requires a global backlink/search index. URL Intelligence Agent combines available search-index discovery with direct source fetching, then checks fetched third-party pages for links back to the target before treating those pages as backlink evidence.

Full web-research architecture:

https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md

## Public Remote MCP

The Space exposes a public **Streamable HTTP MCP** endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Machine-readable discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

Compatible AI clients that support custom Remote MCP / Streamable HTTP servers can connect to the hosted public tool subset. The full repository also includes a local **stdio MCP** server for self-hosted use.

### Main HTTP endpoints

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

## Complete runtime action catalog

The open-source runtime contains **34 actions** across discovery, crawling, identity, audits, technical intelligence, content, commerce, RAG, monitoring and automation:

`investigate_url`, `probe_url`, `domain_intelligence`, `render_page`, `map_site`, `deep_crawl`, `resolve_entity`, `find_social_profiles`, `find_contacts`, `detect_technologies`, `brand_intelligence`, `audit_seo`, `audit_security`, `audit_quality`, `audit_trust`, `entity_graph`, `competitor_intelligence`, `structured_data`, `api_discovery`, `compliance_signals`, `people_team`, `commerce_intelligence`, `content_freshness`, `link_intelligence`, `check_links`, `generate_listing`, `rag_export`, `knowledge_export`, `compare_urls`, `batch_investigate`, `create_snapshot`, `diff_snapshot`, `ai_reason`, `list_plugins`.

The hosted web page includes descriptions of the available actions, their inputs and their output intent.

## Reports and exports

Completed hosted analyses can be exported in multiple formats:

- **PDF** — branded due-diligence style report
- **JSON** — structured machine-readable result
- **Markdown** — portable human-readable report
- **HTML** — standalone web report

The export layer preserves project attribution and source information so generated reports retain context about where the intelligence came from.

## Built inside HORNO Network. Released as open source.

URL Intelligence Agent was not created only as a standalone demo. It was developed, tested and refined inside the **HORNO Network ecosystem**, where URL intelligence, evidence collection and enrichment workflows are used in production-oriented use cases.

After proving the technology inside a live ecosystem, **HORNO Network founder Vincenzo Picciuolo** released the project as open source so developers, AI builders, researchers and companies can inspect it, self-host it, extend it and build with it.

Related projects and ecosystem links:

- **URL Metadata & Social Profile Fetcher** — lightweight deterministic companion for URL metadata, Open Graph, canonical URLs, images and social/profile discovery: https://github.com/vpicciuolo/url-metadata-social-fetcher?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent
- **HORNO Network** — ecosystem where the intelligence technology has been developed and tested: https://horno.net/?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent
- **HORNO Space** — digital identity and smart-link product connected to URL enrichment and public-profile intelligence: https://space.horno.net/?utm_source=huggingface&utm_medium=referral&utm_campaign=url_intelligence_agent

## Evidence and uncertainty FAQ

**Why are extraction confidence and external corroboration separate?**  
Extraction confidence describes how strongly the target's observable metadata/content supports an extracted field. External corroboration describes coverage across fetched third-party domains. They answer different questions and are not combined into a fake probability of truth.

**What if the same claim appears on 30 pages of one website?**  
That is still first-party evidence from one domain. It may strengthen extraction reliability, but it does not create 30 independent sources.

**Does Full Investigation go beyond the target website?**  
Yes. The first stage crawls the target. The second stage crosses the domain boundary, expands public external references, searches the web where configured, fetches independent sources and checks whether third-party pages mention or directly link back to the target.

**Does it find every backlink?**  
No. No bounded live crawler has a complete reverse-link map of the internet. Coverage depends on what is publicly discoverable and on the search/backlink index available to the runtime.

**What if sources disagree?**  
Full investigations can return explicit contradictions. The web UI keeps disputed evidence visible instead of silently collapsing disagreement into one answer.

**Does “no contradiction” mean full consensus?**  
No. It only means the current analysis did not report an explicit contradiction.

**Can sources be inspected?**  
Yes. Public source URLs remain attached to evidence and external research sources are surfaced as openable links.

**How current is the result?**  
Where available, `observedAt` is shown. Public web intelligence is point-in-time evidence and can change later.

**Are SEO, security, trust or compliance outputs definitive?**  
No. They are explainable observations of public signals. Security audit is not penetration testing and compliance/trust outputs are not legal, financial or regulatory determinations.

## Self-host and build with it

The project is MIT licensed and designed to run locally or on your own infrastructure.

Source:

```text
https://github.com/vpicciuolo/url-intelligence-agent
```

The repository includes the TypeScript runtime, CLI, HTTP service, local MCP server, Docker support, tests and detailed documentation.

## Documentation

- **GitHub:** https://github.com/vpicciuolo/url-intelligence-agent
- **Action reference:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md
- **Web research:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md
- **MCP guide:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md
- **Remote MCP guide:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md
- **Security policy:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/SECURITY.md
- **License:** https://github.com/vpicciuolo/url-intelligence-agent/blob/main/LICENSE

## Creator

**Vincenzo Picciuolo**  
Founder, HORNO Network  
HRN Innovation Technologies Ltd

- X: https://x.com/vpicciuolo?utm_source=huggingface&utm_medium=social&utm_campaign=url_intelligence_agent
- LinkedIn: https://www.linkedin.com/in/vpicciuolo/?utm_source=huggingface&utm_medium=social&utm_campaign=url_intelligence_agent
- GitHub: https://github.com/vpicciuolo
- Hugging Face: https://huggingface.co/vpicciuolo

---

**Open source. Evidence first. Built for agents, developers and serious web intelligence workflows.**
