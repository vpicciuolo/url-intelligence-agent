# Architecture

URL Intelligence Agent v1.1.0 is designed as a layered, evidence-first public-web intelligence system. Deterministic collection and analysis form the core; rendering, databases and AI are optional adapters.

## Pipeline

1. Normalize and validate a public HTTP/HTTPS URL.
2. Resolve all DNS answers during preflight and block localhost/private/reserved destinations.
3. Connect through a guarded Undici resolver that validates the DNS answer used by the outbound socket again, preventing DNS-rebinding / TOCTOU pivots.
4. Fetch with explicit redirect, byte and timeout limits; every redirect target repeats the public-destination validation path.
5. Read robots.txt and discover sitemap URLs.
6. Prioritize important internal pages and crawl with bounded depth/concurrency.
7. Optionally render JavaScript-heavy pages through a remote renderer or Playwright.
8. Extract metadata, JSON-LD, headings, links, images, contacts and social profiles.
9. Resolve entity type/name from multiple sources.
10. Detect technologies, brand signals, API surfaces, commerce signals and policy pages.
11. Score SEO, security posture, quality and trust with explainable checks.
12. Build provenance-aware relationship graphs, RAG documents and knowledge facts.
13. Persist snapshots and compare future states.
14. Optionally send change webhooks.
15. Optionally run evidence-only AI synthesis through an OpenAI-compatible endpoint.
16. Expose results through the library, CLI, HTTP API, MCP server, JSON, Markdown, HTML and PDF reports.

## Network boundary

`src/net.ts` is the trust boundary for arbitrary public URL collection. It combines two checks:

- a **preflight check** that parses the URL, rejects unsupported/local forms and validates all current DNS answers;
- a **connection-time check** inside the dedicated Undici dispatcher so the resolver used by the actual socket cannot silently switch to a private/link-local/reserved address after preflight.

The implementation is connection-scoped rather than permanent DNS pinning. Hostnames remain intact for TLS SNI, certificates, virtual hosting and CDN/load-balancer behavior. Redirects are manual and re-enter the same validation path.

Detailed threat model: [NETWORK_SECURITY.md](NETWORK_SECURITY.md).

## Modules

- `src/net.ts` — URL guard, CIDR-based SSRF boundary, preflight + socket-time DNS validation, bounded fetching and probing.
- `src/extract.ts` — deterministic HTML/meta/JSON-LD/contact/social extraction.
- `src/crawler.ts` — robots-aware crawl, sitemap ingestion and page prioritization.
- `src/render.ts` — remote/Playwright render and screenshot adapter; browser networking is a separate trust boundary from `safeFetch()`.
- `src/domain.ts` — DNS, mail and TLS intelligence.
- `src/analyzers.ts` — technology, brand, SEO, security, quality, trust, graph, competitor and RAG analysis.
- `src/extensions.ts` — structured data, API discovery, compliance, people, commerce, freshness, links and fact export.
- `src/agent.ts` — orchestration and unified action registry.
- `src/adapters.ts` — cache, persistence and worker adapters.
- `src/monitor.ts` / `src/watch.ts` — snapshot, diff, webhook and scheduled monitoring.
- `src/plugins.ts` — extension SDK.
- `src/ai.ts` — optional OpenAI-compatible evidence reasoning.
- `src/report.ts` / `src/export-report.ts` — terminal and export/report rendering.
- `src/server.ts` — HTTP API, hosted web demo and Remote MCP transport.
- `src/mcp.ts` — MCP protocol/action surface.
- `src/benchmark.ts` — transparent benchmark runner.
- `src/cli.ts` — interactive and command-line interface.

## Core design principles

- deterministic first
- public web data only
- two-stage SSRF / DNS-rebinding network boundary
- reject ambiguous mixed public/private DNS answers
- re-validate redirect destinations
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

## Runtime dependencies and optional infrastructure

The default install runs with memory/file adapters.

Required runtime packages include:

- `undici` — scoped HTTP transport/dispatcher used by the guarded `safeFetch()` network layer.
- `pdfkit` — branded PDF report generation.

Optional packages activate additional capabilities:

- `redis` — Redis/Valkey cache
- `pg` — PostgreSQL persistence
- `playwright` — local browser rendering/screenshots

Remote rendering and OpenAI-compatible AI endpoints require no additional Node package.

### Renderer security note

The optional Playwright browser has its own network stack. `assertPublicUrl()` validates the requested/final document URL, but Chromium subresource traffic is not governed by the Undici dispatcher used by `safeFetch()`. Keep browser rendering off unless needed and use container/VPC/firewall egress isolation when enabling it in production.

## HORNO Network attribution

Visible output surfaces import attribution from `src/credits.ts`. This keeps identity consistent across the CLI, action menu, reports, HTTP API and MCP responses.

HORNO Network: https://horno.net
