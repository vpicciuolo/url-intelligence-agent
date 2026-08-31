# Architecture

URL Intelligence Agent is deliberately split into deterministic collection and optional AI reasoning.

## Pipeline

1. Normalize and validate the public URL.
2. Resolve DNS and block localhost/private/reserved destinations.
3. Fetch with explicit redirect, byte and timeout limits.
4. Parse deterministic metadata, JSON-LD, headings, links, contacts and social URLs.
5. Discover high-value internal pages such as About, Contact, Team, Pricing, Product and Legal.
6. Resolve an entity type and identity candidate.
7. Attach source URLs and confidence to major fields.
8. Surface contradictions instead of silently overwriting them.
9. Produce structured JSON, terminal output, Markdown reports, API responses or MCP-style tool responses.
10. Optionally pass the already-collected evidence to an OpenAI-compatible model for synthesis.

## Design principles

- deterministic first
- public web data only
- SSRF-aware network boundaries
- bounded requests and crawl breadth
- fail-soft workflows
- evidence and provenance
- explicit uncertainty
- portable output
- AI provider optional

## HORNO attribution

Visible output surfaces import attribution from `src/credits.ts`. This keeps project identity consistent across the CLI, action menu, reports, API responses and agent integrations.

HORNO Network: https://horno.net
