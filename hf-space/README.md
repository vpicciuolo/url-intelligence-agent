---
title: URL Intelligence Agent
emoji: 🧠
sdk: docker
app_port: 7860
license: mit
short_description: Evidence-first URL intelligence with Remote MCP.
pinned: false
hf_oauth: true
hf_oauth_expiration_minutes: 1440
tags:
  - mcp
  - remote-mcp
  - url-intelligence
  - web-intelligence
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

Open-source evidence-first URL intelligence agent by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

The project is designed around a simple principle: confidence should come from observable evidence, not from the AI merely sounding confident. Evidence-linked fields retain their value, confidence score, extraction method and source URLs. Full investigations also expose explicit contradictions and an observation timestamp so disagreement and freshness remain visible.

## Live hosted demo

The Docker Space runs the real URL Intelligence Agent HTTP service and a human-friendly web interface. Sign in with Hugging Face to test the hosted analysis UI.

The public hosted demo is intentionally limited to **1 analysis request per signed-in Hugging Face account every 24 hours** to reduce automated abuse. Clone or self-host the MIT-licensed project for unrestricted usage under your own infrastructure limits.

Hosted web actions currently include:

- Full URL investigation
- SEO audit
- Security audit
- Trust signals
- Social profile discovery
- Technology detection
- Brand intelligence
- Domain intelligence
- Structured-data inventory

The result page keeps the complete raw response available while also surfacing:

- Evidence-linked claims and confidence
- Extraction methods
- Openable public source URLs
- Explicit contradictions / disputed evidence
- Observation time when returned
- Human-readable structured sections
- Branded PDF, JSON, Markdown and HTML exports

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

**Where does confidence come from?**  
Evidence fields carry confidence together with the extraction method and sources. It is not presented as the model's personal certainty.

**What if sources disagree?**  
Full investigations can return explicit contradictions. The web UI marks disputed evidence and keeps the disagreement visible instead of silently collapsing it into one answer.

**Does “no contradiction” mean full consensus?**  
No. It only means the current analysis did not report an explicit contradiction.

**Can sources be inspected?**  
Yes. Public source URLs remain attached to evidence and are surfaced as openable links in the result interface.

**How current is the result?**  
Where available, `observedAt` is shown. Public web intelligence is point-in-time evidence and can change later.

**Are SEO, security, trust or compliance outputs definitive?**  
No. They are explainable observations of public signals. Security audit is not penetration testing and compliance/trust outputs are not legal or financial determinations.

## Source and full documentation

GitHub: https://github.com/vpicciuolo/url-intelligence-agent  
Action reference: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/ACTIONS.md  
MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/MCP.md  
Remote MCP guide: https://github.com/vpicciuolo/url-intelligence-agent/blob/main/docs/REMOTE_MCP.md

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**
