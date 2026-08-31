# 🧠 URL Intelligence Agent

<p align="center">
  <strong>URL in. Identity, evidence and intelligence out.</strong>
</p>

<p align="center">
  A production-oriented, evidence-first web intelligence agent for AI systems, developers, marketplaces, directories, research workflows, monitoring and automation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/release-v1.0.0-00c853?style=for-the-badge" alt="v1.0.0">
  <img src="https://img.shields.io/badge/TypeScript-first-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/AI-optional-7c3aed?style=for-the-badge" alt="AI optional">
  <img src="https://img.shields.io/badge/MCP-ready-111827?style=for-the-badge" alt="MCP ready">
  <img src="https://img.shields.io/badge/Node-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 18+">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT">
</p>

---

## Already running inside the HORNO ecosystem — now open source

**URL Intelligence Agent** is one of the intelligence components used inside the **HORNO ecosystem** to understand public URLs, normalize entities, enrich profiles and listings, discover public relationships, evaluate web signals and prepare structured information for product workflows.

The complete agent architecture is now available as open source for developers to inspect, extend and integrate into their own systems.

### Explore the ecosystem behind it

- 🔥 **HORNO Network** — technology ecosystem, decentralized infrastructure and Proof-of-Storage: **https://horno.net**
- ⚡ **Easy HORNO** — streamlined access to HORNO: **https://easy.horno.net**
- 🌐 **HORNO Space** — digital identity, smart links, creator/professional profiles and discovery: **https://space.horno.net**
- 🧩 **URL Metadata & Social Profile Fetcher** — lower-level metadata toolkit: **https://github.com/vpicciuolo/url-metadata-social-fetcher**

Follow development and ecosystem updates:

- [@vpicciuolo](https://x.com/vpicciuolo)
- [@hornonetwork](https://x.com/hornonetwork)
- [@BeHotNow2026](https://x.com/BeHotNow2026)

---

# One complete intelligence release

Version **1.0.0 — Unified Intelligence Release** combines deterministic extraction, deep crawling, entity resolution, browser/render fallback, domain intelligence, technology fingerprinting, provenance graphs, monitoring, batch workers, persistence, reports, MCP, API access and optional AI reasoning in one repository.

There is intentionally **no staged roadmap in this README**. The capabilities documented below are the capabilities implemented by this release. Optional integrations such as Redis, PostgreSQL and Playwright activate when their corresponding package/service is configured.

---

# Why this exists

A metadata parser answers:

> “What title and Open Graph image does this page expose?”

A crawler answers:

> “What pages can I collect?”

URL Intelligence Agent is built to answer a larger question:

> **What is this URL, what entity does it represent, what can I verify from public evidence, what other public identities and systems are related to it, what changed, and what structured action should an application or AI agent take next?**

The focus is **evidence-first URL and entity intelligence** rather than unrestricted scraping or model-only guessing.

---

# Quick start

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
node dist/src/cli.js investigate https://example.com
```

Development mode:

```bash
npm run dev -- investigate https://example.com
```

Interactive mode:

```bash
npm run dev
```

You can also install directly from GitHub:

```bash
npm install github:vpicciuolo/url-intelligence-agent
npx url-agent investigate https://example.com
```

---

# The action menu

Running the CLI without a command opens the full interactive intelligence console:

```text
╭──────────────────────────────────────────────────────────────────╮
│  URL INTELLIGENCE AGENT v1.0.0                                  │
│  URL in. Identity, evidence and intelligence out.               │
│                                                                  │
│  HRN Innovation Technologies Ltd                                 │
│  Founder & Lead Engineer: Vincenzo Picciuolo                     │
│  HORNO ecosystem: https://horno.net                              │
╰──────────────────────────────────────────────────────────────────╯

Actions
  1. Full URL investigation
  2. Safe URL probe / redirects
  3. Domain + DNS + mail + TLS intelligence
  4. Deep crawl + sitemap mapping
  5. Render JavaScript page / browser fallback
  6. Resolve entity + evidence graph
  7. Find social profiles
  8. Find public contacts + people
  9. Technology fingerprinting
 10. Brand intelligence
 11. SEO audit
 12. Security-header posture audit
 13. Quality/accessibility/performance audit
 14. Trust/transparency signals
 15. Entity relationship graph
 16. Competitor/comparison intelligence
 17. Structured-data inventory
 18. API / OpenAPI / GraphQL discovery
 19. Privacy/compliance public signals
 20. Team / people extraction
 21. Commerce / pricing intelligence
 22. Content freshness signals
 23. Link graph / external-domain intelligence
 24. Broken-link / URL health check
 25. Generate marketplace/directory listing
 26. RAG-ready document export
 27. Knowledge/fact export with provenance
 28. Generate Markdown + HTML + JSON reports
 29. Compare two URLs
 30. Batch enrichment worker
 31. Create monitoring snapshot
 32. Diff current URL against stored snapshot
 33. Continuous scheduled watch + webhook
 34. Optional AI evidence reasoning
 35. Run reliability benchmark
 36. Plugins / extension SDK
 37. HTTP API server
 38. MCP server
 39. About & credits
```

Credits are also embedded in CLI output, machine-readable metadata, API responses, MCP responses and generated reports.

---

# Core capabilities

## 1. Safe public URL collection

The network layer treats every submitted URL as untrusted input.

It includes:

- HTTP/HTTPS-only policy
- URL credential rejection
- DNS resolution before fetch
- localhost blocking
- private/reserved IPv4 blocking
- loopback, ULA and link-local IPv6 blocking
- redirect destination re-validation
- bounded redirects
- request timeouts
- maximum response bytes
- explicit User-Agent
- response timing
- redirect-chain evidence
- response-header capture
- HEAD-based URL probing

```bash
url-agent probe https://example.com
```

---

## 2. Deep site crawling

The crawler is not limited to a homepage.

It supports:

- configurable crawl depth
- configurable page limits
- bounded concurrency
- same-origin policy
- URL allow patterns
- URL deny patterns
- robots.txt discovery and default respect
- sitemap.xml discovery
- robots-declared sitemaps
- sitemap indexes
- up to thousands of sitemap URLs as discovery candidates
- high-value page prioritization
- About / Contact / Team / Pricing / Product / Security / Docs / Partners / Customers / Legal classification
- fail-soft page collection
- skipped-page reasons
- per-page errors
- optional JavaScript render fallback

```bash
url-agent crawl https://example.com
```

---

## 3. Entity resolution with evidence

The agent attempts to determine whether the URL represents a:

- person
- creator
- startup
- organization
- business
- product
- service
- software application
- commerce property
- event
- general website

Identity resolution uses multiple deterministic signals such as JSON-LD, Open Graph site names, page titles and content context.

Important fields keep provenance:

```json
{
  "name": {
    "value": "Example Inc.",
    "confidence": 0.97,
    "method": "jsonld-name+og-site-name+page-title",
    "sources": [
      "https://example.com/",
      "https://example.com/about"
    ]
  }
}
```

The agent surfaces contradictions rather than silently overwriting conflicting evidence.

---

## 4. Domain, DNS, mail and TLS intelligence

```bash
url-agent domain https://example.com
```

The domain action collects public infrastructure signals including:

- A records
- AAAA records
- MX records
- NS records
- TXT records
- CAA records
- SPF presence
- DMARC presence
- common mail-provider hints
- TLS protocol
- cipher
- certificate validity dates
- certificate issuer
- certificate subject
- certificate SAN names

This is infrastructure intelligence, not a vulnerability scanner.

---

## 5. JavaScript rendering and screenshot adapter

Static HTML is not always enough. The render layer supports:

- remote rendering endpoint adapter
- optional Playwright adapter
- automatic render fallback for thin/SPA-like pages
- always-render mode
- final rendered URL validation
- full-page PNG screenshot output when requested

Configure:

```env
URL_AGENT_RENDER_MODE=auto
```

For local Playwright rendering:

```bash
npm install playwright
npx playwright install chromium
```

Or configure a compatible remote renderer:

```env
URL_AGENT_RENDER_ENDPOINT=https://your-render-service.example/render
URL_AGENT_RENDER_API_KEY=...
```

---

## 6. Social identity discovery

The agent normalizes public social links found across crawled pages, including common networks such as:

- X / Twitter
- LinkedIn
- Instagram
- Facebook
- YouTube
- TikTok
- GitHub
- Discord
- Threads
- Snapchat
- Pinterest
- Telegram
- Mastodon-style links
- Bluesky
- Medium
- Reddit

```bash
url-agent socials https://example.com
```

---

## 7. Public contact and people intelligence

The agent can identify:

- public email addresses
- mailto links
- public telephone links/numbers
- contact-page candidates
- JSON-LD Person entities
- names
- job titles
- public person URLs
- public person image references

```bash
url-agent contacts https://example.com
url-agent people https://example.com
```

---

## 8. Technology fingerprinting

Technology detection combines multiple public signals rather than relying on one keyword.

The initial built-in detectors include signals for categories such as:

- frontend frameworks
- CMS platforms
- ecommerce systems
- site builders
- analytics
- tag managers
- payments
- CRM/support tools
- CDN/security infrastructure
- hosting
- web servers
- runtimes

Signals currently recognize common public fingerprints including Next.js, Nuxt, React, Vue, Angular, Svelte, WordPress, Shopify, WooCommerce, Webflow, Wix, Squarespace, Framer, Google Analytics, Google Tag Manager, Meta Pixel, Hotjar, Stripe, Intercom, HubSpot, Cloudflare, Vercel, Netlify, Nginx and Apache.

Each technology carries confidence and evidence.

```bash
url-agent technologies https://example.com
```

---

## 9. Brand intelligence

The brand analyzer extracts candidates for:

- brand/site name
- logos
- favicons
- social preview imagery
- public color hints
- social profiles
- public handles
- taglines/descriptions

```bash
url-agent brand https://example.com
```

---

## 10. SEO intelligence

The deterministic SEO audit evaluates signals such as:

- title
- title length
- meta description
- description length
- canonical URL
- Open Graph metadata
- social image
- headings
- JSON-LD
- sitemap discovery
- `noindex`
- cross-host canonical warnings
- duplicate title groups in the crawl sample

Every score includes explainable issues, warnings and checks.

```bash
url-agent seo https://example.com
```

---

## 11. Security posture signals

The security action inspects public HTTP posture including:

- HTTPS
- HSTS
- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- frame/clickjacking protection
- visible technology-disclosure headers

```bash
url-agent security https://example.com
```

This is a public configuration audit, **not a penetration test** and not a guarantee of security.

---

## 12. Quality, accessibility and performance hints

The quality layer evaluates lightweight deterministic signals such as:

- page language
- semantic headings
- text volume
- response timing
- HTTP status
- rendered/static collection mode
- page forms
- image counts

```bash
url-agent quality https://example.com
```

---

## 13. Trust and transparency signals

The trust score is intentionally explainable. It looks for public indicators such as:

- HTTPS
- About page
- Contact route
- Legal/privacy pages
- Security/trust page
- public social presence
- public contact information
- structured data
- crawl depth / site substance

It can also flag some high-pressure language for manual review.

This score is **not** a legal, financial or fraud determination.

---

## 14. Entity relationship graph

The graph layer creates nodes and evidence-linked relationships for:

- the primary entity
- social profiles
- public contacts
- technologies
- important pages

Every edge includes:

- relationship type
- confidence
- evidence URLs

```bash
url-agent graph https://example.com
```

---

## 15. Competitor and comparison intelligence

The agent examines public comparison, alternative, versus and competitor context found during crawling and surfaces external candidates with evidence and confidence.

```bash
url-agent competitors https://example.com
```

It deliberately does not pretend that every external link is a competitor.

---

## 16. Structured data inventory

Extract and inspect JSON-LD documents across the crawled site:

```bash
url-agent structured https://example.com
```

Useful for:

- Organization discovery
- Product data
- Person data
- Event data
- SoftwareApplication data
- schema debugging
- entity resolution pipelines

---

## 17. API surface discovery

The agent identifies public links suggesting:

- OpenAPI
- Swagger
- GraphQL
- `/api` surfaces
- developer portals
- documentation
- `.well-known` resources

```bash
url-agent apis https://example.com
```

It discovers public references; it does not bypass authentication.

---

## 18. Privacy and compliance signals

The compliance action detects public policy/transparency signals such as:

- privacy policy
- terms
- cookie policy
- consent language
- GDPR language
- CCPA language
- accessibility statement
- security page
- trust center

```bash
url-agent compliance https://example.com
```

Presence of these signals is **not a compliance determination**.

---

## 19. Commerce and pricing intelligence

The commerce analyzer can surface:

- visible currency/price strings
- pricing-page presence
- ecommerce language
- subscription language
- marketplace language

```bash
url-agent commerce https://example.com
```

---

## 20. Content freshness

The agent extracts public freshness hints including:

- article publication dates
- article modification dates
- common date metadata
- HTTP Last-Modified

```bash
url-agent freshness https://example.com
```

---

## 21. Link intelligence and health checks

```bash
url-agent links https://example.com
url-agent check-links https://example.com --limit 100
```

Capabilities include:

- internal link inventory
- external link inventory
- external-domain frequency
- bounded concurrent health probes
- redirect results
- response timing
- broken/unreachable link list

---

## 22. Ready-to-review listing generation

This is especially useful for directories, marketplaces, ranking boards and URL-first onboarding.

```bash
url-agent listing https://example.com
```

Example output fields:

```json
{
  "name": "Example",
  "tagline": "...",
  "description": "...",
  "category": "startup",
  "url": "https://example.com/",
  "logo": "...",
  "image": "...",
  "socials": [],
  "contacts": {},
  "keywords": [],
  "technologies": [],
  "seoScore": 92,
  "trustScore": 88,
  "completeness": 100,
  "confidence": 0.94,
  "evidence": []
}
```

This is one of the patterns used by URL-first product workflows in the wider HORNO technology ecosystem.

---

## 23. RAG-ready export

```bash
url-agent rag https://example.com
```

The agent creates citation-friendly documents containing:

- stable document IDs
- source URL
- title
- cleaned text
- word count
- checksum
- canonical URL
- language
- JSON-LD types

This gives AI/RAG applications structured provenance instead of anonymous text chunks.

---

## 24. Knowledge/fact export

```bash
url-agent knowledge https://example.com
```

The knowledge export converts intelligence into subject/predicate/object facts with:

- confidence
- evidence URLs
- entity identity
- social relationships
- technology relationships

Useful for knowledge graphs, CRM enrichment and agent memory layers.

---

## 25. Monitoring, snapshots and change intelligence

Create a baseline:

```bash
url-agent snapshot https://example.com
```

Check changes later:

```bash
url-agent diff https://example.com
```

Continuous watch mode:

```bash
url-agent watch https://example.com --interval 300000
```

The normalized snapshot tracks:

- entity identity
- content fingerprint
- SEO score
- trust score
- technologies
- social profiles
- public contacts
- important pages

When configured, changed snapshots can be sent to a webhook.

```env
URL_AGENT_WEBHOOK_URL=https://your-system.example/hooks/url-agent
URL_AGENT_WEBHOOK_SECRET=...
```

---

## 26. Batch enrichment and worker queue

```bash
url-agent batch urls.txt --concurrency 6
```

Or JSON:

```json
{
  "urls": [
    "https://example.com",
    "https://horno.net",
    "https://space.horno.net"
  ]
}
```

The built-in worker queue provides bounded concurrency and per-job result/error tracking.

---

## 27. Cache and persistence adapters

Default operation requires no external database.

Available adapters include:

### Memory cache

Default for simple local execution.

### File cache

```env
URL_AGENT_CACHE=file
URL_AGENT_CACHE_DIR=.url-agent/cache
```

### Redis / Valkey

```env
REDIS_URL=redis://localhost:6379
```

or:

```env
VALKEY_URL=redis://localhost:6379
```

Install the optional adapter package if needed:

```bash
npm install redis
```

### Local file persistence

Used automatically for snapshots when no database URL is configured.

### PostgreSQL

```env
DATABASE_URL=postgresql://user:password@localhost:5432/urlagent
```

```bash
npm install pg
```

The storage table is initialized automatically by the adapter.

---

## 28. HTTP API

Start it:

```bash
url-agent serve --host 0.0.0.0 --port 8787
```

Endpoints:

```text
GET  /health
GET  /actions
GET  /investigate?url=https://example.com
POST /investigate
GET  /action/:name?...params
POST /action/:name
```

Example:

```bash
curl "http://localhost:8787/action/detect_technologies?url=https://example.com"
```

Optional API protection:

```env
URL_AGENT_API_TOKEN=change-me
URL_AGENT_API_RATE_LIMIT=60
URL_AGENT_CORS_ORIGIN=https://your-app.example
```

Every API response carries project attribution.

---

## 29. MCP server

```bash
url-agent mcp
```

The MCP server implements JSON-RPC initialization, tool listing, tool calls, ping and a HORNO attribution resource.

Tools include:

```text
investigate_url
probe_url
domain_intelligence
render_page
map_site
deep_crawl
resolve_entity
find_social_profiles
find_contacts
detect_technologies
brand_intelligence
audit_seo
audit_security
audit_quality
audit_trust
entity_graph
competitor_intelligence
generate_listing
rag_export
structured_data
api_discovery
compliance_signals
people_team
commerce_intelligence
content_freshness
link_intelligence
check_links
knowledge_export
compare_urls
batch_investigate
create_snapshot
diff_snapshot
ai_reason
list_plugins
```

MCP protocol output is kept on stdout while operational credits/status go to stderr, preventing the banner from corrupting tool frames.

---

## 30. Optional AI reasoning

The deterministic agent works without an API key.

AI is an enhancement layer for synthesis, interpretation and evidence-based reasoning.

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=gpt-5-mini
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.1
```

Any compatible Chat Completions-style endpoint can be configured.

```bash
url-agent reason https://example.com \
  --instruction "Summarize the company and cite the evidence URLs."
```

The model receives collected evidence and is explicitly instructed not to invent unsupported facts.

---

## 31. Plugin SDK

The project exposes a small extension interface.

```ts
import { definePlugin } from "url-intelligence-agent";

export default definePlugin({
  name: "my-enricher",
  version: "1.0.0",
  actions: {
    custom_check: async (input) => ({ input, ok: true })
  },
  enrich: async (result) => {
    result.meta.custom = "added by plugin";
    return result;
  }
});
```

Load it:

```bash
url-agent plugin-load ./my-plugin.js
```

Plugins can add actions and enrich complete intelligence results.

---

## 32. Reliability benchmark

Run the included live benchmark:

```bash
url-agent benchmark
```

The benchmark runner records:

- pass/fail
- elapsed time
- assertion details
- extraction errors
- aggregate pass rate
- average execution time

Custom benchmark files are supported:

```bash
url-agent benchmark benchmarks/urls.json
```

The benchmark framework is intentionally transparent: it reports measured cases instead of presenting an unverified marketing accuracy number.

---

# Reports that are actually shareable

```bash
url-agent report https://example.com
```

One command generates:

```text
url-intelligence-....md
url-intelligence-....html
url-intelligence-....json
```

Reports include:

- executive summary
- evidence and confidence
- SEO score
- security posture score
- quality score
- trust score
- brand intelligence
- technologies
- public contacts
- social profiles
- important pages
- crawl statistics
- competitor candidates
- contradictions
- collection warnings
- fingerprint
- HORNO / creator attribution

The HTML report is standalone and can be opened directly in a browser.

---

# Library API

The project is not limited to the CLI.

```ts
import {
  investigate,
  runAction,
  crawlSite,
  inspectDomain,
  createSnapshot,
  diffSnapshots,
  renderMarkdown,
  renderHtml
} from "url-intelligence-agent";

const result = await investigate("https://example.com");
console.log(result.entity);
console.log(result.technologies);
```

Or call the unified action interface:

```ts
const seo = await runAction("audit_seo", {
  url: "https://example.com"
});
```

---

# Agent profiles

Profiles are labels carried through an investigation and are available to plugins and AI instructions.

Useful conventions include:

```text
full-intelligence
startup-intelligence
company-research
creator-profile
social-identity
marketplace-onboarding
directory-enrichment
seo-audit
lead-enrichment
brand-intelligence
rag-ingestion
competitor-intelligence
due-diligence-lite
monitoring
benchmark
```

Example:

```bash
url-agent investigate https://example.com --profile startup-intelligence
```

---

# Architecture

```mermaid
flowchart TD
    A[Public URL] --> B[SSRF-aware URL guard]
    B --> C[Bounded HTTP fetch]
    C --> D[Robots + sitemap discovery]
    D --> E[Priority deep crawler]
    E --> F{Thin / JS-heavy?}
    F -->|yes| G[Remote / Playwright renderer]
    F -->|no| H[Deterministic extractors]
    G --> H
    H --> I[Entity resolver]
    H --> J[Social + contacts]
    H --> K[Technology + brand]
    H --> L[SEO / security / quality / trust]
    H --> M[Structured data / APIs / commerce / compliance]
    I --> N[Evidence + confidence]
    J --> N
    K --> N
    L --> N
    M --> N
    N --> O[Entity graph + knowledge export]
    N --> P[RAG documents]
    N --> Q[Snapshot / diff / webhook]
    N --> R{Optional AI?}
    R -->|yes| S[Evidence-only reasoning]
    R -->|no| T[Deterministic result]
    S --> U[CLI / API / MCP / reports / plugins]
    T --> U
```

---

# Reliability principles

1. **Deterministic first** — use HTML, headers, JSON-LD and DNS when they can establish a fact directly.
2. **Evidence always** — important identity fields carry source URLs.
3. **Confidence is explicit** — uncertainty is data, not something to hide.
4. **Contradictions are surfaced** — conflicting sources are not silently merged.
5. **Fail soft** — one blocked or broken page does not destroy the whole investigation.
6. **Bound network work** — requests, bytes, redirects, crawl pages, depth and concurrency are configurable.
7. **Respect public boundaries** — no authentication bypass, CAPTCHA bypass or private-network probing.
8. **Robots-aware by default** — deep crawling reads robots.txt unless explicitly configured otherwise.
9. **AI is optional** — core intelligence remains useful without paid inference.
10. **Reports are reproducible** — fingerprints, timestamps and evidence are preserved.
11. **Machine outputs retain attribution** — project metadata travels with API/MCP/results.
12. **Scores are explainable** — no black-box “trust” or “SEO” number without checks and findings.

See [`SECURITY.md`](SECURITY.md).

---

# Configuration reference

Copy `.env.example` to `.env`.

Important settings:

```env
URL_AGENT_TIMEOUT_MS=10000
URL_AGENT_MAX_BYTES=3000000
URL_AGENT_MAX_REDIRECTS=6
URL_AGENT_MAX_PAGES=30
URL_AGENT_MAX_DEPTH=3
URL_AGENT_CONCURRENCY=4
URL_AGENT_OBEY_ROBOTS=true
URL_AGENT_RENDER_MODE=off
URL_AGENT_CACHE=memory
URL_AGENT_WORKER_CONCURRENCY=4
URL_AGENT_API_RATE_LIMIT=60
URL_AGENT_AI_AUTO=false
```

For a larger site crawl:

```env
URL_AGENT_MAX_PAGES=200
URL_AGENT_MAX_DEPTH=5
URL_AGENT_CONCURRENCY=8
```

Keep limits appropriate for the target site and your legal/operational context.

---

# Docker

Build:

```bash
docker build -t url-intelligence-agent .
```

Investigate:

```bash
docker run --rm url-intelligence-agent investigate https://example.com
```

API:

```bash
docker compose up url-agent
```

Optional Redis or PostgreSQL service profiles are included in `docker-compose.yml`.

---

# Where this is useful

URL Intelligence Agent can be embedded into:

- AI assistants
- autonomous research agents
- coding agents
- startup directories
- product directories
- ranking/bid boards
- marketplaces
- creator/influencer platforms
- CRM enrichment
- sales research
- competitive intelligence
- public due-diligence support
- SEO tooling
- brand intelligence
- RAG ingestion
- knowledge graphs
- smart-link platforms
- digital identity products
- monitoring systems
- launch platforms
- URL-first onboarding
- profile autofill
- content verification pipelines
- web observability workflows

---

# HORNO ecosystem connection

This repository is part of a wider engineering effort developed by **HRN Innovation Technologies Ltd**.

The HORNO ecosystem explores technology across decentralized infrastructure, distributed storage, Proof-of-Storage, DePIN concepts, digital identity, creator tools, discovery systems and community-oriented products.

If you found this repository because you were looking for:

```text
AI URL intelligence
web intelligence agent
URL metadata extraction
entity resolution
website technology detection
social profile discovery
SEO audit API
MCP web intelligence
AI crawler
deep website crawler
brand intelligence
public contact enrichment
RAG website extraction
website monitoring
link intelligence
structured data extraction
marketplace listing enrichment
startup directory enrichment
DePIN technology
Proof-of-Storage
HORNO Network
HORNO Space
```

then the main ecosystem entry point is:

## 🔥 https://horno.net

Also explore:

- https://easy.horno.net
- https://space.horno.net
- https://github.com/vpicciuolo/url-metadata-social-fetcher

---

# Contributing

Contributions are welcome, especially around:

- new evidence sources
- technology fingerprints
- entity resolution
- additional safe extractors
- benchmark cases
- renderer adapters
- cache/storage adapters
- MCP interoperability
- report UX
- plugins
- false-positive reduction
- tests for difficult public URLs

Please preserve the evidence-first and public-boundary design principles.

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

# Credits

**Created by Vincenzo Picciuolo**  
Founder & Lead Engineer — **HRN Innovation Technologies Ltd**

Built as part of the technology work behind the **HORNO ecosystem** and released publicly for the developer community.

- HORNO Network: https://horno.net
- Easy HORNO: https://easy.horno.net
- HORNO Space: https://space.horno.net
- Base metadata toolkit: https://github.com/vpicciuolo/url-metadata-social-fetcher
- X: https://x.com/vpicciuolo
- X: https://x.com/hornonetwork
- X: https://x.com/BeHotNow2026

If the project is useful to you: **⭐ star it, fork it, build with it, open issues, contribute and show us what you create.**

---

# License

MIT © 2026 HRN Innovation Technologies Ltd — Founder: Vincenzo Picciuolo.
