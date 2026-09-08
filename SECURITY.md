# Security

URL Intelligence Agent is designed for public web intelligence. Security controls focus on preventing the agent itself from becoming a route to private/internal services while keeping collection bounded and observable.

Current release: **1.3.0**

## Security scope

The project intentionally analyzes public HTTP/HTTPS resources. It does not intentionally bypass:

- authentication;
- CAPTCHAs;
- access controls;
- private networks;
- cloud metadata endpoints;
- paywalls or protected application state.

Security audit output describes observable response/header posture. It is not penetration testing.

## Core HTTP trust boundary

All untrusted URL collection through `safeFetch()` uses a dedicated guarded Undici transport.

### Preflight validation

Before a request is made, the URL is checked for:

- valid `http:` or `https:` scheme;
- embedded credentials;
- blocked local/private hostnames;
- literal private/reserved IPs;
- DNS answers that include non public address classes.

If DNS returns a mix of public and blocked addresses, the request is rejected rather than selecting only the public answer.

### Connect time DNS validation

Preflight validation alone is not sufficient because a hostname can resolve differently when the actual socket is opened.

The dedicated Undici dispatcher therefore uses a guarded DNS lookup for the real outbound connection. Every DNS answer used by the socket is validated again before connection.

This closes the normal DNS rebinding / TOCTOU gap between preflight resolution and connect time resolution for the core HTTP transport.

### Blocked address classes

The policy covers IPv4/IPv6 classes including:

- loopback;
- RFC1918/private networks;
- link local;
- cloud metadata style destinations;
- shared carrier grade/private ranges;
- documentation/benchmark/reserved ranges;
- multicast;
- mapped IPv4 in IPv6;
- NAT64/translation ranges;
- selected transition/tunnel ranges;
- unique local IPv6;
- site local/reserved IPv6.

See `src/net.ts` and `docs/NETWORK_SECURITY.md` for the concrete policy.

### Redirects

Redirect following is manual. Every redirect target is parsed and validated before the next outbound request.

### Resource bounds

The core transport enforces configurable:

```text
request timeout
maximum response bytes
maximum redirects
```

The crawler separately enforces page/depth/concurrency bounds.

## Character decoding

v1.2 adds charset aware decoding using response charset, BOM and HTML charset hints with UTF 8 fallback.

This reduces evidence corruption on non UTF 8 pages. It is a correctness control rather than a substitute for sanitization when downstream applications render extracted text.

## Browser rendering trust boundary

Browser rendering is **not** the same network boundary as the guarded Undici transport.

v1.2 adds browser defense in depth:

- initial URL validation;
- request interception;
- public destination checks;
- bounded subresource request count;
- service worker blocking;
- download blocking;
- optional media/font blocking;
- bounded same origin runtime JSON capture.

However, browser automation has additional protocol and networking behavior. Security sensitive operators should place Playwright or any remote renderer inside a separate container/VM/network segment with infrastructure egress rules that deny private/internal destinations independently of application code.

Application level browser filtering must not be described as equivalent to network isolation.

## Runtime API evidence

When enabled, v1.2 can collect bounded same origin JSON responses produced by public page XHR/fetch activity.

This feature is intended for public page evidence only. It must not be used to:

- capture authenticated/private API responses without authorization;
- reuse user session cookies to collect protected data;
- probe internal services;
- bypass access controls.

The public Hugging Face deployment does not enable unrestricted Playwright browser collection by default.

## Provenance integrity

The provenance engine stores SHA 256 hashes for document representations and observations.

These hashes allow a consumer to identify the exact representation/observation processed by the agent. They do **not** prove that a website claim is factually true.

The distinction is important:

```text
integrity of observed evidence ≠ truth of external claim
```

## External research

External search/index providers are a separate trust and cost boundary.

Recommendations:

- store provider keys only as secrets/environment variables;
- set quotas;
- do not log keys;
- restrict configured search endpoints;
- fetch/verify candidate sources before treating them as corroboration;
- keep first party extraction confidence separate from external corroboration.

## Optional AI provider

AI reasoning is optional.

Do not send secrets, OAuth tokens or private application data to model providers unless the operator explicitly intends and is authorized to do so.

AI output is not evidence. It is a reasoning layer over the collected evidence.

## API authentication

Self hosted HTTP deployments can require:

```env
URL_AGENT_API_TOKEN=strong-secret
```

Use TLS in front of internet exposed deployments.

Do not commit tokens or API keys.

## Hosted Hugging Face OAuth

The official Space uses Hugging Face OAuth for web analysis/report access.

Hosted demo rules are anti abuse controls, not an authorization model for target websites.

The project owner account is intentionally exempt from the public web demo quota.

## MCP security

Remote MCP gives clients the ability to request public network analysis through the agent.

Controls include:

- allowlisted hosted tools;
- URL validation before hosted tool execution;
- Origin checks on the hosted endpoint;
- protocol/routing validation;
- account/IP based demo quotas;
- bounded tool schemas;
- bounded crawl/network settings.

The public hosted MCP policy should not be interpreted as a replacement for authentication on a private enterprise deployment.

## MCP Tasks

Task records can contain analysis output. In production:

- use an appropriate persistence backend;
- define TTL/retention;
- protect persistence storage;
- avoid logging task payloads with secrets;
- ensure task retrieval is scoped correctly if adding multi tenant authentication.

The open source default is a building block, not a complete enterprise multi tenant authorization layer.

## Reports

Hosted reports are short lived and scoped to the signed in user that created them.

Report routes are marked `noindex`/`nofollow`/`noarchive`.

Operators with stronger confidentiality requirements should move report storage to durable access controlled storage and add explicit expiration/deletion policies.

## Logging

Avoid logging:

- OAuth access tokens;
- API tokens;
- search provider keys;
- AI provider keys;
- full Authorization/Cookie headers;
- protected page content;
- unbounded raw third party HTML.

Prefer hashes, bounded excerpts and structured diagnostics.

## Dependency security

Production operators should:

```bash
npm audit
npm outdated
npm test
```

before releases and after meaningful dependency upgrades.

Optional dependencies such as Playwright, PostgreSQL and Redis should also be patched independently.

## Reporting vulnerabilities

Do not disclose an exploitable security issue publicly before maintainers have had a reasonable opportunity to investigate and patch it.

Use GitHub's private vulnerability reporting/security advisory path when available for the repository.

Include:

1. affected version/commit;
2. reproduction steps;
3. expected vs actual behavior;
4. security impact;
5. environment details;
6. suggested mitigation if known.

## Release security checklist

Before releasing:

```text
npm run typecheck
npm test
```

and verify:

- SSRF regression tests pass;
- mixed DNS answer rejection passes;
- redirect revalidation remains active;
- no secrets are committed;
- hosted demo allowlist/quota is correct;
- browser rendering defaults match the documented trust model;
- Hugging Face build reaches RUNNING;
- `/health` reports the expected version.

See `VERSIONING.md` for the release policy.
