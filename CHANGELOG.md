# Changelog

All notable changes to URL Intelligence Agent are documented here.

## [1.2.0] - 2026-09-08

### Claim provenance & consistency

- Added the **Claim Provenance & Temporal Consistency Engine**.
- Added first-class `EvidenceObservation`, `ResolvedClaim`, `ClaimConflict`, `PageRepresentation` and `ProvenanceReport` types.
- Every provenance observation can preserve the source URL, representation, evidence layer, source property/locator, JSON Pointer, source byte offsets/line positions, raw value, normalized value, observation time, request variant, document hash and observation hash.
- Added separate extraction-confidence, source-authority and freshness-confidence dimensions instead of treating a single score as truth probability.
- Added field-aware resolution policies for stable fields and volatile metrics.
- Added conflict/drift states: `consensus`, `compatible_variation`, `drift`, `conflict` and `insufficient_evidence`.
- Added explicit flags for source/render drift, metadata/visible-content divergence, structured/visible divergence, precision differences, freshness divergence and suspected stale metadata.
- Added generic claim verification through `verify_claim` and evidence inspection through `inspect_provenance`.
- Added W3C PROV-shaped JSON export for interoperable evidence lineage.

### Normalization & semantic comparison

- Added numeric normalization for exact values, lower/upper bounds, `+` suffixes, K/M/B notation and approximate values.
- Correctly treats statements such as `80,000+` and `100,502` as logically compatible while still reporting representation/freshness drift.
- Added normalized date, URL, money/currency/cadence, boolean and Unicode string comparison.
- Added deterministic visible numeric-claim extraction with nearby semantic context.
- Added field-level conflict detection for prices, dates, URLs, identity-like strings and other stable facts.

### Evidence extraction

- Added standards-compliant HTML parsing with `parse5` for provenance extraction and source locations.
- Added provenance extraction from JSON-LD, Microdata, RDFa, Open Graph, Twitter Cards, standard meta tags, canonical/feed links, `<time>`, `<data>`, HTTP headers and visible text.
- Duplicate metadata values are now preserved as separate observations instead of being irreversibly collapsed in the provenance layer.
- Added bounded same-origin runtime JSON API evidence capture for optional Playwright rendering.

### HTTP, rendering & temporal intelligence

- Source HTML and rendered DOM can now be preserved as separate evidence representations and compared directly.
- Per-request crawl rendering policy is now honored by `shouldRender()` rather than depending only on global environment state.
- Playwright rendering now blocks unsupported/private destinations at request interception, caps subresource requests, blocks service workers and downloads, can block media/fonts, and optionally captures bounded same-origin XHR/fetch JSON.
- Added charset-aware response decoding using HTTP charset, BOM and HTML charset sniffing with UTF-8 fallback.
- Added ETag and Last-Modified capture plus `If-None-Match` / `If-Modified-Since` support to the guarded HTTP transport.
- Monitoring snapshots now persist resolved claim values/statuses, provenance fingerprints, HTTP validators and timestamped snapshot history.

### MCP

- Added MCP protocol **2026-07-28** while retaining compatibility with 2025-11-25, 2025-06-18 and 2025-03-26 clients.
- Added modern stateless remote HTTP behavior plus legacy session compatibility.
- Added modern server discovery metadata, routing-header checks, cache metadata and server identity metadata.
- Added strict per-tool input schemas and output schemas.
- Added `inspect_provenance` and `verify_claim` to the MCP tool surface.
- Added persisted `io.modelcontextprotocol/tasks` support for long-running investigations when a modern client advertises the extension.
- Public remote MCP limits are additionally enforced by IP so opening a new legacy session cannot bypass the hosted-demo policy.

### Security

- Preserved v1.1.0 connect-time DNS-rebinding protection for all core `safeFetch()` traffic.
- Browser rendering remains a separate network trust boundary; application-level Playwright request checks are defense-in-depth, not a replacement for infrastructure-level egress controls in security-sensitive production deployments.
- Runtime API evidence capture is bounded, same-origin and public-data-only; it does not bypass authentication or access controls.

### Tests

- Added deterministic regression coverage for lower-bound compatibility (`80,000+` vs `100,502`), representation drift, suspected stale metadata, exact structured-data conflicts, duplicate metadata provenance/source positions, claim verification and PROV export.
- Existing SSRF and DNS-rebinding regression coverage remains enabled across supported Node.js versions.

### Documentation & hosted demo

- Added a formal versioning and compatibility policy.
- Added dedicated provenance/consistency architecture documentation.
- Updated MCP, architecture, security/deployment guidance and Hugging Face documentation for v1.2.0.
- Added a hosted Evidence Inspector panel for provenance summaries, drift, conflict and suspected stale metadata signals.

## [1.1.0] - 2026-09-08

### Security

- Added **connect-time DNS validation** for the core `safeFetch()` transport using a dedicated guarded Undici dispatcher.
- Closed the DNS-rebinding / TOCTOU gap between preflight hostname validation and the DNS lookup used by the actual outbound socket.
- Replaced string/prefix IP checks with CIDR-aware IPv4 and IPv6 block policies.
- Expanded coverage for mapped, NAT64/translation, transition/tunnel, link-local, local/private, multicast, documentation, benchmarking and reserved address classes.
- Reject mixed DNS answers if any returned address is non-public.
- Preserve manual redirect handling and revalidate every redirect target before another request.
- Keep request timeout, maximum response size and redirect bounds in the guarded transport.

### Changed

- Added `undici` 6.x as the explicit runtime HTTP transport for untrusted URL collection.
- Minimum Node.js version is now **18.17+** to match the supported Undici 6 runtime.
- Core user-agent versioning now follows `PROJECT.version` instead of duplicating a hard-coded release number in multiple network paths.
- Updated project/runtime version to **1.1.0**.

### Tests

- Added deterministic SSRF classification tests for IPv4/IPv6 local, private, reserved, mapped and transition address classes.
- Added regression coverage requiring mixed public/private DNS results to be rejected.

### Documentation

- Added `docs/NETWORK_SECURITY.md` with the two-stage SSRF threat model and request flow.
- Expanded `SECURITY.md`, architecture and deployment guidance.
- Documented the separate Playwright/browser network boundary and the recommendation for infrastructure-level egress isolation.
- Updated Hugging Face Space documentation to describe the v1.1.0 network protections.

## [1.0.0] - 2026

- Initial Unified Intelligence Release: URL intelligence, crawling, entity/evidence resolution, SEO/security/trust analysis, monitoring, RAG, CLI, API, MCP and reporting.
