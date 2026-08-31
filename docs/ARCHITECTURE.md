# Architecture

URL Intelligence Agent v1.0.0 is designed as a layered, evidence-first public-web intelligence system. Deterministic collection and analysis form the core; rendering, databases and AI are optional adapters.

## Pipeline

1. Normalize and validate a public HTTP/HTTPS URL.
2. Resolve DNS and block localhost/private/reserved destinations.
3. Fetch with explicit redirect, byte and timeout limits.
4. Read robots.txt and discover sitemap URLs.
5. Prioritize important internal pages and crawl with bounded depth/concurrency.
6. Optionally render JavaScript-heavy pages through a remote renderer or Playwright.
7. Extract metadata, JSON-LD, headings, links, images, contacts and social profiles.
8. Resolve entity type/name from multiple sources.
9. Detect technologies, brand signals, API surfaces, commerce signals and policy pages.
10. Score SEO, security posture, quality and trust with explainable checks.
11. Build provenance-aware relationship graphs, RAG documents and knowledge facts.
12. Persist snapshots and compare future states.
13. Optionally send change webhooks.
14. Optionally run evidence-only AI synthesis through an OpenAI-compatible endpoint.
15. Expose results through the library, CLI, HTTP API, MCP server, JSON, Markdown and HTML reports.

## Modules

- `src/net.ts` — URL guard, SSRF boundary, bounded fetching and probing.
- `src/extract.ts` — deterministic HTML/meta/JSON-LD/contact/social extraction.
- `src/crawler.ts` — robots-aware crawl, sitemap ingestion and page prioritization.
- `src/render.ts` — remote/Playwright render and screenshot adapter.
- `src/domain.ts` — DNS, mail and TLS intelligence.
- `src/analyzers.ts` — technology, brand, SEO, security, quality, trust, graph, competitor and RAG analysis.
- `src/extensions.ts` — structured data, API discovery, compliance, people, commerce, freshness, links and fact export.
- `src/agent.ts` — orchestration and unified action registry.
- `src/adapters.ts` — cache, persistence and worker adapters.
- `src/monitor.ts` / `src/watch.ts` — snapshot, diff, webhook and scheduled monitoring.
- `src/plugins.ts` — extension SDK.
- `src/ai.ts` — optional OpenAI-compatible evidence reasoning.
- `src/report.ts` — terminal, Markdown and standalone HTML rendering.
- `src/server.ts` — HTTP API.
- `src/mcp.ts` — MCP JSON-RPC server.
- `src/benchmark.ts` — transparent benchmark runner.
- `src/cli.ts` — interactive and command-line interface.

## Core design principles

- deterministic first
- public web data only
- SSRF-aware network boundaries
- robots-aware crawling by default
- bounded requests and crawl breadth
- fail-soft workflows
- evidence and provenance
- explicit uncertainty
- explainable scoring
- optional AI
- optional persistence/render adapters
- stable machine outputs
- embedded project attribution

## Optional infrastructure

The default install runs with memory/file adapters. Optional packages activate additional capabilities:

- `redis` — Redis/Valkey cache
- `pg` — PostgreSQL persistence
- `playwright` — local browser rendering/screenshots

Remote rendering and OpenAI-compatible AI endpoints require no additional Node package.

## HORNO attribution

Visible output surfaces import attribution from `src/credits.ts`. This keeps identity consistent across the CLI, action menu, reports, HTTP API and MCP responses.

HORNO Network: https://horno.net
