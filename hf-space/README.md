---
title: URL Intelligence Agent
emoji: 🧠
sdk: docker
app_port: 7860
license: mit
short_description: Web-wide evidence-first URL intelligence + Remote MCP.
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
---

# URL Intelligence Agent

**URL in. Evidence, provenance and intelligence out.**

Open-source evidence-first URL and web intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

The project is designed around a simple principle: confidence should come from observable evidence, not from an AI merely sounding confident — and a website should not be allowed to confirm its own claims simply by repeating them across many pages.

Full investigation therefore uses two distinct evidence layers:

1. **First-party extraction** — crawl the submitted site, sitemaps and prioritized internal pages to understand what the target says about itself.
2. **External corroboration** — expand into eligible third-party URLs referenced by the target and, when a search provider is configured, discover additional public articles and backlink-style references from a web search index before fetching selected sources.

The result keeps **extraction confidence** separate from **external corroboration**. Repetition across one domain is not counted as independent-domain confirmation.

## Live hosted demo

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
- Search provider used, when configured
- Search queries used
- Third-party sources and domains
- Independent-domain corroboration coverage
- External article/source URLs
- Explicit contradictions / disputed evidence
- Observation time
- Complete raw response
- Branded PDF, JSON, Markdown and HTML exports

## Web-wide evidence discovery

External URLs directly referenced by the target are researched without a search API.

For broader article and backlink-style discovery, configure one supported search provider:

- SearXNG via `URL_AGENT_SEARCH_ENDPOINT`
- Brave Search via `BRAVE_SEARCH_API_KEY`
- Serper via `SERPER_API_KEY`
- Tavily via `TAVILY_API_KEY`
- Google Custom Search via `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`

The agent records when no search provider is configured rather than pretending the external search was complete.

A crawler cannot enumerate every backlink on the entire internet by itself. Broad reverse-link discovery requires a search/backlink index. The runtime uses bounded search-index discovery plus direct source fetching so selected public pages are verified before being treated as evidence.

Full architecture and configuration:

https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/WEB_RESEARCH.md

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
