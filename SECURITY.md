# Security

URL Intelligence Agent processes untrusted public URLs. Treat outbound network access as a security boundary.

## Network safety in v1.1.0

Version 1.1.0 uses a two-stage SSRF defense for the core HTTP collection path.

1. **Preflight URL and DNS validation** parses the URL, permits only HTTP/HTTPS, rejects embedded credentials and local-only hostnames, resolves all returned addresses, and rejects the destination if any answer is private, loopback, link-local, reserved or otherwise non-public.
2. **Connect-time DNS validation** uses a dedicated guarded Undici dispatcher. The resolver used by the actual outbound socket validates the DNS answers again immediately before connection. This closes the preflight-to-connect DNS-rebinding / TOCTOU gap where a hostname could resolve publicly during validation and then resolve to an internal address when the socket connects.

The core network layer also:

- blocks common private, loopback, link-local, documentation, benchmarking, multicast and reserved IPv4 ranges;
- blocks IPv6 loopback, ULA, link-local, site-local, multicast, documentation, transition/tunnel and mapped-address classes that should not be reached by the public-web collector;
- blocks cloud/link-local metadata destinations such as `169.254.169.254` through the whole `169.254.0.0/16` range;
- rejects mixed DNS answers when even one returned address is non-public instead of silently choosing a different answer;
- re-validates every redirect target and uses manual redirect handling;
- limits redirect count, response bytes and request time;
- rejects URL credentials and unsupported schemes;
- does not alter the process-global HTTP dispatcher: the guarded transport is scoped to untrusted URL-agent collection.

The protection is connection-scoped rather than long-lived DNS pinning. Hostnames remain hostnames so TLS SNI, certificates, virtual hosting and normal CDN/load-balancer behavior continue to work, while every new outbound socket must resolve to an allowed public address.

See [docs/NETWORK_SECURITY.md](docs/NETWORK_SECURITY.md) for the detailed threat model and request flow.

## Browser rendering is a separate boundary

`safeFetch()` and the normal crawler use the guarded HTTP transport described above. Optional Playwright rendering launches a browser and therefore has its own network stack, including subresource requests, frames and browser-originated fetches. Do not assume the core `safeFetch()` connect-time guarantee automatically applies to Chromium traffic.

Keep `URL_AGENT_RENDER_MODE=off` unless rendering is required. For production browser rendering, isolate the browser/container and enforce outbound network policy at the infrastructure layer. A remote renderer should be treated as a separate trusted service with equivalent egress controls.

## Defense in depth

Application-layer SSRF controls should not be the only protection for sensitive deployments. Where possible, also use firewall, container, VPC or platform egress rules that prevent the runtime from reaching private address space, link-local services, cloud metadata endpoints and other internal control planes.

Do not use this project to bypass authentication, CAPTCHAs, robots restrictions, access controls or private systems. Public-data collection must comply with applicable law, site terms and your organizational policies.

## Reporting a vulnerability

Please report security vulnerabilities privately to the repository owner rather than publishing a working exploit in a public issue. Include the affected version, reproduction conditions and the smallest safe proof needed to demonstrate the issue.

Project: https://github.com/vpicciuolo/url-intelligence-agent  
HORNO Network: https://horno.net
