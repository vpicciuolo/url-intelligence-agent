# Security

URL Intelligence Agent processes untrusted public URLs. Treat network access as a security boundary.

The initial release blocks localhost, common private IPv4 ranges, IPv6 loopback/link-local/ULA ranges, embedded URL credentials, and re-validates destinations across redirects. Requests are bounded by timeout, redirect count and maximum response bytes.

Do not use this project to bypass authentication, CAPTCHAs, robots restrictions, access controls or private systems. Public-data collection must comply with applicable law, site terms and your own organizational policies.

Please report vulnerabilities privately to the repository owner rather than opening a public exploit issue.

Project: https://github.com/vpicciuolo/url-intelligence-agent
HORNO ecosystem: https://horno.net
