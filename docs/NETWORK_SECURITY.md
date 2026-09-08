# Network Security Architecture

URL Intelligence Agent v1.1.0 treats every user-supplied URL as untrusted network input. The core HTTP collector is designed to access public HTTP/HTTPS resources while preventing the application from being used as a pivot into localhost, private networks, link-local services or cloud metadata endpoints.

This document describes the core `safeFetch()` boundary in `src/net.ts`.

## Threat model

The agent accepts arbitrary URLs through the CLI, HTTP API, MCP tools and hosted demo. A malicious URL can attempt to abuse server-side fetching through techniques such as:

- direct loopback or RFC1918/private addresses;
- link-local or cloud metadata addresses;
- IPv6 local/private address forms;
- IPv4-mapped or transition/tunnel representations;
- a public URL that redirects to an internal destination;
- a hostname returning both public and private DNS answers;
- DNS rebinding, where validation receives a public address and the later connection receives a private address;
- oversized responses, redirect loops or slow responses intended to exhaust resources.

The network layer therefore performs both policy validation and resource bounding.

## Request flow

```text
Untrusted URL
    |
    v
Parse URL + allow HTTP/HTTPS only
    |
    v
Reject credentials and local-only hostnames
    |
    v
Preflight DNS lookup: resolve all A/AAAA answers
    |
    v
Reject if ANY answer is private / local / reserved
    |
    v
Undici guarded dispatcher
    |
    v
Socket-time DNS lookup: resolve and validate again
    |
    v
Connect only to validated public address
    |
    v
Bounded response: timeout + maximum bytes
    |
    +---- redirect? ----> validate target and repeat
    |
    v
Return response
```

## Why validation happens twice

A DNS check performed before `fetch()` is useful but is not by itself a complete DNS-rebinding defense. Without connection-time control, this sequence is possible:

```text
validation lookup: attacker.example -> public IP
connection lookup: attacker.example -> private IP
```

The second lookup can occur after the first check, creating a check-to-use / TOCTOU gap.

Version 1.1.0 closes that gap by using an explicit Undici `Agent` whose connection `lookup` callback is guarded by the same public-address policy. The DNS answer used by a new outbound socket must therefore pass the policy at connection time.

## Connection-scoped protection, not long-lived pinning

The implementation intentionally does **not** replace a hostname with an IP address in the request URL and does not permanently pin a domain to one address.

That preserves normal web behavior including:

- TLS certificate validation;
- SNI;
- HTTP `Host` semantics;
- virtual hosting;
- CDN and load-balancer address rotation;
- IPv4/IPv6 operation for public destinations.

The security invariant is simpler: **the address a new socket is about to use must be public and permitted at the time of connection**.

## Address policy

The classifier uses CIDR-aware `net.BlockList` policies instead of string-prefix tests. The blocked classes include, among others:

### IPv4

- unspecified/current network;
- RFC1918 private ranges;
- loopback;
- link-local, including the `169.254.0.0/16` metadata/link-local range;
- carrier-grade NAT shared space;
- benchmarking and documentation ranges;
- multicast;
- reserved/future-use space.

### IPv6

- unspecified and loopback;
- IPv4-mapped IPv6;
- NAT64 translation prefixes used to embed IPv4 destinations;
- ULA;
- link-local and deprecated site-local;
- multicast;
- documentation ranges;
- transition/tunnel ranges that can encode or route toward non-public destinations.

The policy is deliberately conservative for a public-web intelligence agent. A destination that must be reachable only through a private network is outside this collector's intended trust boundary.

## Mixed DNS answers

If a hostname returns several DNS answers and **any** address is blocked, the destination is rejected.

Example:

```text
example.invalid -> 93.184.216.34
example.invalid -> 127.0.0.1
```

The agent does not simply select the public answer. Rejecting the entire mixed result avoids address-selection ambiguity and prevents a resolver or connection strategy from later choosing the unsafe address.

## Redirects

Redirects are handled manually. Every `301`, `302`, `303`, `307` and `308` target is converted to an absolute URL and passed through the same public-URL validation before another request is made.

The redirect response body is cancelled before following the next hop, and the total number of redirects remains bounded.

## Resource limits

The network safety boundary also enforces:

- request timeout;
- maximum response bytes;
- maximum redirect count;
- explicit supported schemes;
- bounded crawler page/depth/concurrency policies at higher layers.

These are availability controls as well as safety controls.

## Scope of the guarded transport

The project does not replace Node's process-global dispatcher. The guarded Undici dispatcher is used by `safeFetch()` for untrusted public URL collection. This keeps the trust boundary explicit and avoids accidentally applying arbitrary-URL rules to trusted infrastructure integrations such as OAuth provider calls.

Code paths that fetch user-controlled or discovered public URLs should go through `safeFetch()` rather than an unguarded `fetch()`.

## Browser rendering

Playwright is optional and is a separate network boundary. Chromium performs its own document, redirect, script, image, frame, XHR/fetch and other subresource requests. The `safeFetch()` socket-time resolver does not automatically control those browser-originated connections.

For production browser rendering:

1. keep rendering disabled unless required;
2. run the browser in an isolated container/process;
3. deny private, link-local and metadata destinations at the network/egress layer;
4. treat remote renderers as separate trusted services with equivalent controls;
5. do not expose renderer credentials or internal networks to untrusted pages.

The public Hugging Face Space keeps the optional Playwright renderer disabled by default.

## Defense in depth

For high-value deployments, application-level validation should be combined with infrastructure egress controls. Recommended controls include:

- firewall/VPC/container rules denying private and link-local address space;
- explicit blocking of cloud metadata endpoints;
- least-privilege network routes;
- separate networks for databases, caches and management services;
- authentication and rate limits on the public URL-agent API/MCP service.

## Tests

The test suite includes deterministic checks for private/reserved IPv4, IPv6 local/reserved classes, mapped/transition forms, public-address acceptance and rejection of mixed public/private DNS answers. The Hugging Face benchmark also includes malformed URL and SSRF-oriented safety cases.

Any future network change should preserve these invariants:

- unsupported schemes never reach the network;
- unsafe literal IPs are rejected;
- unsafe DNS answers are rejected during preflight;
- unsafe DNS answers are rejected at socket connection time;
- redirect targets receive the full validation path;
- bounds remain enforced.

## Related documentation

- [SECURITY.md](../SECURITY.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [Web research](WEB_RESEARCH.md)

Repository: https://github.com/vpicciuolo/url-intelligence-agent
