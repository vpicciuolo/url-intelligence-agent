# URL Intelligence Agent — MCP Integration Guide

URL Intelligence Agent includes a native stdio MCP server so MCP-compatible AI clients can call the agent as a tool provider.

Repository: https://github.com/vpicciuolo/url-intelligence-agent  
HORNO: https://horno.net

---

# What the MCP server exposes

The server implements the core MCP stdio flow used by agent clients:

- `initialize`
- `notifications/initialized`
- `ping`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`

The MCP server writes protocol messages to **stdout** and human-readable startup information to **stderr**, so normal console text does not corrupt the JSON-RPC stream.

It exposes the URL Intelligence Agent action registry as MCP tools and includes evidence/provenance plus project attribution in results.

---

# Option A — Run MCP from a cloned repository

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
npm run mcp
```

Equivalent direct command:

```bash
node /absolute/path/url-intelligence-agent/dist/src/cli.js mcp
```

Use an **absolute path** when configuring a desktop/client application because GUI applications often start with a different working directory.

---

# Option B — Install globally and use `url-agent`

```bash
npm install -g github:vpicciuolo/url-intelligence-agent
url-agent mcp
```

This is usually the cleanest MCP configuration when the machine is under your control.

Verify the executable first:

```bash
which url-agent
url-agent about
```

On Windows PowerShell:

```powershell
Get-Command url-agent
url-agent about
```

---

# Generic MCP client configuration

Most MCP clients that support stdio servers need a command plus arguments.

## Global-install configuration

```json
{
  "mcpServers": {
    "url-intelligence-agent": {
      "command": "url-agent",
      "args": ["mcp"],
      "env": {
        "URL_AGENT_MAX_PAGES": "30",
        "URL_AGENT_MAX_DEPTH": "3",
        "URL_AGENT_OBEY_ROBOTS": "true"
      }
    }
  }
}
```

## Repository-path configuration

```json
{
  "mcpServers": {
    "url-intelligence-agent": {
      "command": "node",
      "args": [
        "/absolute/path/url-intelligence-agent/dist/src/cli.js",
        "mcp"
      ],
      "env": {
        "URL_AGENT_MAX_PAGES": "30",
        "URL_AGENT_MAX_DEPTH": "3",
        "URL_AGENT_OBEY_ROBOTS": "true"
      }
    }
  }
}
```

The exact location/name of the MCP configuration file differs between MCP clients. The important part is that the client launches either `url-agent mcp` or `node .../dist/src/cli.js mcp` as a stdio process.

---

# Add optional AI reasoning to MCP

The MCP server itself does not require an AI key. Most tools are deterministic.

To enable the `ai_reason` action, add environment variables:

```json
{
  "mcpServers": {
    "url-intelligence-agent": {
      "command": "url-agent",
      "args": ["mcp"],
      "env": {
        "AI_BASE_URL": "https://api.openai.com/v1",
        "AI_API_KEY": "YOUR_KEY",
        "AI_MODEL": "gpt-5-mini",
        "AI_MAX_TOKENS": "3000",
        "AI_TEMPERATURE": "0.1"
      }
    }
  }
}
```

Do not commit real API keys to the repository.

---

# Add rendering/browser fallback to MCP

For JavaScript-heavy websites, install Playwright in the same environment where the MCP process runs:

```bash
npm install playwright
npx playwright install chromium
```

Then configure:

```json
{
  "mcpServers": {
    "url-intelligence-agent": {
      "command": "url-agent",
      "args": ["mcp"],
      "env": {
        "URL_AGENT_RENDER_MODE": "auto",
        "URL_AGENT_RENDER_TIMEOUT_MS": "30000"
      }
    }
  }
}
```

A remote rendering service can be used instead:

```json
{
  "URL_AGENT_RENDER_MODE": "auto",
  "URL_AGENT_RENDER_ENDPOINT": "https://renderer.example.com/render",
  "URL_AGENT_RENDER_API_KEY": "YOUR_RENDER_KEY"
}
```

---

# Important MCP tools

The MCP server builds its tool list from the runtime action registry. Important tools include:

| Tool | Purpose |
| --- | --- |
| `investigate_url` | Complete evidence-first investigation |
| `probe_url` | Safe public URL/status/redirect probe |
| `domain_intelligence` | DNS, mail and TLS intelligence |
| `map_site` | Map discovered pages and sitemap URLs |
| `deep_crawl` | Bounded multi-page crawl |
| `render_page` | Render JavaScript-heavy pages |
| `resolve_entity` | Resolve entity type/name and provenance |
| `find_social_profiles` | Discover normalized public social profiles |
| `find_contacts` | Discover public email/phone/contact signals |
| `detect_technologies` | Technology fingerprinting |
| `brand_intelligence` | Brand/logo/favicon/tagline signals |
| `audit_seo` | SEO/discoverability audit |
| `audit_security` | Public HTTP security-header posture |
| `audit_quality` | Quality/accessibility/performance hints |
| `audit_trust` | Public trust/transparency scoring |
| `entity_graph` | Evidence-linked relationship graph |
| `competitor_intelligence` | Public comparison/alternative candidates |
| `structured_data` | JSON-LD/structured-data inventory |
| `api_discovery` | API/OpenAPI/GraphQL/developer surface discovery |
| `compliance_signals` | Public privacy/compliance policy signals |
| `people_team` | Public people/team extraction |
| `commerce_intelligence` | Pricing/commerce/subscription signals |
| `content_freshness` | Publication/modification freshness hints |
| `link_intelligence` | Internal/external link intelligence |
| `check_links` | Bounded URL health checking |
| `generate_listing` | Ready-to-review marketplace/directory listing |
| `rag_export` | RAG-ready documents with citation fields |
| `knowledge_export` | Provenance-oriented facts/knowledge output |
| `compare_urls` | Compare two URL intelligence results |
| `batch_investigate` | Process many URLs with bounded concurrency |
| `create_snapshot` | Persist monitoring snapshot |
| `diff_snapshot` | Compare current state against snapshot |
| `ai_reason` | Optional evidence-only model reasoning |
| `list_plugins` | List registered plugins |

Run locally to see the live action registry:

```bash
url-agent actions
```

---

# MCP resource

The server exposes a project/ecosystem resource:

```text
horno://about
```

It returns attribution plus HORNO ecosystem links and repository information.

---

# Tool-call examples

An MCP client normally handles JSON-RPC for you, but understanding the wire format is useful for troubleshooting.

## Initialize

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"manual-test","version":"1.0"}}}
```

## List tools

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

## Investigate a URL

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"investigate_url","arguments":{"url":"https://example.com"}}}
```

## SEO audit

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"audit_seo","arguments":{"url":"https://example.com"}}}
```

## Compare two URLs

```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"compare_urls","arguments":{"url":"https://example.com","url2":"https://example.org"}}}
```

---

# Manual stdio smoke test

You can pipe one JSON-RPC request into the server.

```bash
printf '%s\n' \
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
| node dist/src/cli.js mcp
```

For a longer interactive protocol session, use a client or a script that keeps stdin open and sends one JSON object per line.

---

# Recommended production MCP environment

```env
URL_AGENT_TIMEOUT_MS=10000
URL_AGENT_MAX_BYTES=3000000
URL_AGENT_MAX_REDIRECTS=6
URL_AGENT_MAX_PAGES=30
URL_AGENT_MAX_DEPTH=3
URL_AGENT_CONCURRENCY=4
URL_AGENT_SAME_ORIGIN=true
URL_AGENT_OBEY_ROBOTS=true
URL_AGENT_CACHE=memory
URL_AGENT_CACHE_TTL_MS=300000
URL_AGENT_RENDER_MODE=off
URL_AGENT_AI_AUTO=false
```

Increase crawl depth/page limits only when the calling workflow genuinely requires it.

---

# Troubleshooting

## MCP client says server exited immediately

Run the exact configured command in a terminal:

```bash
url-agent mcp
```

or:

```bash
node /absolute/path/url-intelligence-agent/dist/src/cli.js mcp
```

If Node cannot find the file, correct the absolute path and rebuild:

```bash
npm run build
```

## Client cannot find `url-agent`

GUI applications may not inherit your shell PATH. Use the absolute path to the executable or configure Node with an absolute path to `dist/src/cli.js`.

## JSON parsing/protocol errors

Do not wrap the MCP process in another script that writes decorative text to stdout. The built-in MCP server reserves stdout for protocol JSON and uses stderr for startup information.

## URLs fail but the MCP server works

The agent deliberately blocks localhost/private destinations and validates DNS/redirect targets. Confirm the requested target is a public HTTP/HTTPS URL.

## JavaScript-only page has little content

Enable a renderer and install Playwright, or configure `URL_AGENT_RENDER_ENDPOINT`.

---

# Security notes

An MCP client gives an AI system the ability to request public network analysis through this server. Keep bounded crawl limits, maintain SSRF protections and avoid exposing secrets in instructions/results.

The agent is designed for public web intelligence. It does not intentionally bypass authentication, CAPTCHAs or access controls.

---

## Support the open-source project

Support continued development through the Stripe-enabled support page:

https://hrn.ae/githubsupport

---

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**  
HORNO ecosystem: https://horno.net
