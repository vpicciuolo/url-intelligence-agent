# URL Intelligence Agent — Public Remote MCP

**URL in. Identity, evidence and intelligence out.**

URL Intelligence Agent exposes a public **Streamable HTTP MCP** endpoint from its Hugging Face Docker Space so compatible AI clients can discover and call URL intelligence tools directly.

## Public endpoint

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Hugging Face Space:

https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent

GitHub source:

https://github.com/vpicciuolo/url-intelligence-agent

MCP discovery metadata:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

## What it exposes

The public hosted MCP endpoint exposes a controlled read-only subset of the URL Intelligence Agent runtime for testing:

- `investigate_url`
- `audit_seo`
- `audit_security`
- `audit_trust`
- `find_social_profiles`
- `detect_technologies`
- `brand_intelligence`
- `domain_intelligence`
- `structured_data`

The complete repository contains many additional tools for local/self-hosted deployments.

## Transport

The hosted endpoint uses MCP over **Streamable HTTP** on a single `/mcp` URL. The server supports initialization, tool discovery, tool calls, ping, resources and MCP session IDs.

A minimal initialize request:

```bash
curl -i https://vpicciuolo-url-intelligence-agent.hf.space/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}'
```

The server returns an `Mcp-Session-Id`. Send that session ID on subsequent MCP requests.

## AI client usage

For clients that support custom remote MCP servers, add the endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Then let the client scan/discover the available tools. This can be used with platforms that expose remote MCP/custom app functionality, including ChatGPT and Claude configurations where that functionality is available on the user’s account or workspace.

## Hosted demo protection

The public remote MCP endpoint is designed for evaluation rather than unrestricted compute. Tool discovery and initialization do not consume an analysis call. The hosted MCP demo currently limits analysis tool execution to **one analysis per MCP session every 24 hours**.

For unrestricted use, clone and self-host the MIT-licensed repository or run the local stdio MCP server:

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
npm run mcp
```

## Attribution

Remote MCP results include project attribution.

**Project:** URL Intelligence Agent  
**Creator:** Vincenzo Picciuolo  
**Company:** HRN Innovation Technologies Ltd  
**GitHub:** https://github.com/vpicciuolo/url-intelligence-agent  
**Hugging Face:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent  
**Remote MCP:** https://vpicciuolo-url-intelligence-agent.hf.space/mcp
