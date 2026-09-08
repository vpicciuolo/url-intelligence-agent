# Changelog

All notable changes to URL Intelligence Agent are documented here.

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
