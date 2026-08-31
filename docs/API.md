# URL Intelligence Agent — HTTP API Guide

URL Intelligence Agent includes a lightweight HTTP JSON API for calling the same action registry used by the CLI and MCP server.

Repository: https://github.com/vpicciuolo/url-intelligence-agent  
HORNO: https://horno.net

---

# Start the API

From a built repository:

```bash
npm run build
node dist/src/cli.js serve --host 127.0.0.1 --port 8787
```

Or:

```bash
npm run serve
```

For container deployment:

```bash
docker compose up -d --build
```

---

# Base URL

Local default:

```text
http://127.0.0.1:8787
```

The server supports:

- `GET /health`
- `GET /actions`
- `GET /investigate?url=...`
- `POST /investigate`
- `GET /action/:name?...`
- `POST /action/:name`

Responses are JSON and include URL Intelligence Agent / HORNO project attribution.

---

# Authentication

By default, `URL_AGENT_API_TOKEN` can be empty for local development.

For production, set:

```env
URL_AGENT_API_TOKEN=replace-with-a-long-random-token
```

Then send:

```http
Authorization: Bearer replace-with-a-long-random-token
```

Example:

```bash
curl \
  -H "Authorization: Bearer replace-with-a-long-random-token" \
  http://127.0.0.1:8787/health
```

Do not expose a tokenless service to an untrusted network.

---

# Rate limiting

Configure requests per client IP per minute:

```env
URL_AGENT_API_RATE_LIMIT=60
```

When exceeded, the API returns HTTP `429`.

---

# CORS

Optional:

```env
URL_AGENT_CORS_ORIGIN=https://your-frontend.example
```

When configured, the server responds with CORS headers for the supplied origin and supports `GET`, `POST` and `OPTIONS`.

---

# Health

```bash
curl http://127.0.0.1:8787/health
```

Example shape:

```json
{
  "ok": true,
  "uptimeSeconds": 123,
  "actions": 30,
  "attribution": {
    "project": "URL Intelligence Agent"
  }
}
```

The action count is dynamic and may change as plugins/actions are registered.

---

# List actions

```bash
curl http://127.0.0.1:8787/actions
```

Authenticated:

```bash
curl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/actions
```

This is the best way to inspect the live action registry of a running instance.

---

# Investigate a URL — GET

```bash
curl \
  -G http://127.0.0.1:8787/investigate \
  --data-urlencode "url=https://example.com"
```

With auth:

```bash
curl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G http://127.0.0.1:8787/investigate \
  --data-urlencode "url=https://example.com"
```

---

# Investigate a URL — POST

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/investigate \
  -d '{
    "url": "https://example.com",
    "profile": "full-intelligence"
  }'
```

---

# Call any action

Endpoint:

```text
/action/:name
```

## SEO audit

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/audit_seo \
  -d '{"url":"https://example.com"}'
```

## Technology detection

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/detect_technologies \
  -d '{"url":"https://example.com"}'
```

## Domain intelligence

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/domain_intelligence \
  -d '{"url":"https://example.com"}'
```

## Generate a listing

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/generate_listing \
  -d '{"url":"https://example.com"}'
```

## Compare two URLs

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/compare_urls \
  -d '{
    "url":"https://example.com",
    "url2":"https://example.org"
  }'
```

## Batch investigation

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/action/batch_investigate \
  -d '{
    "urls":[
      "https://example.com",
      "https://example.org"
    ],
    "concurrency":2
  }'
```

---

# Common action names

The runtime action registry includes actions such as:

```text
investigate_url
probe_url
domain_intelligence
map_site
deep_crawl
render_page
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
structured_data
api_discovery
compliance_signals
people_team
commerce_intelligence
content_freshness
link_intelligence
check_links
generate_listing
rag_export
knowledge_export
compare_urls
batch_investigate
create_snapshot
diff_snapshot
ai_reason
list_plugins
```

Always use `/actions` to inspect the exact registry on your running build.

---

# Request body size

The built-in server bounds JSON request bodies to approximately 1 MB by default. Large batch jobs should be split into reasonable chunks rather than sending extremely large payloads.

---

# Error behavior

Common statuses:

| Status | Meaning |
| --- | --- |
| `200` | Successful action |
| `204` | CORS preflight success |
| `400` | Invalid input/action execution error |
| `401` | Missing/incorrect API bearer token |
| `404` | Unknown endpoint |
| `429` | Rate limit exceeded |

Errors still include project attribution metadata.

---

# JavaScript example

```js
const response = await fetch("http://127.0.0.1:8787/action/audit_seo", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "authorization": `Bearer ${process.env.URL_AGENT_API_TOKEN}`
  },
  body: JSON.stringify({
    url: "https://example.com"
  })
});

if (!response.ok) {
  throw new Error(`URL Intelligence Agent returned ${response.status}`);
}

const data = await response.json();
console.log(data.result);
```

---

# Python example

```python
import os
import requests

response = requests.post(
    "http://127.0.0.1:8787/action/investigate_url",
    headers={
        "Authorization": f"Bearer {os.environ['URL_AGENT_API_TOKEN']}"
    },
    json={"url": "https://example.com"},
    timeout=120,
)

response.raise_for_status()
print(response.json()["result"])
```

---

# Production checklist

Before exposing the API:

- set `URL_AGENT_API_TOKEN`
- set an appropriate `URL_AGENT_API_RATE_LIMIT`
- bind behind a reverse proxy or load balancer
- terminate HTTPS/TLS at the edge
- restrict inbound firewall rules
- keep crawl/page/depth/concurrency limits bounded
- monitor CPU/memory/outbound traffic
- keep optional AI/render/database secrets outside source control
- persist `.url-agent` only if required
- use a private network for Redis/PostgreSQL

See [DEPLOYMENT.md](DEPLOYMENT.md) for a full deployment guide.

---

## Support the open-source project

Support continued development through the Stripe-enabled support page:

https://hrn.ae/githubsupport

---

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**  
HORNO ecosystem: https://horno.net
