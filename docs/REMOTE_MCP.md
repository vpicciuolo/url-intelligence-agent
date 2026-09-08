# URL Intelligence Agent — Public Remote MCP

Official hosted endpoint:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

Discovery:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

Current application release: **1.2.0**

## Protocol versions

The runtime supports:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

For MCP 2026-07-28 the server supports the stateless protocol path, discovery, routing metadata, cache hints, structured tool schemas and optional Tasks behavior. Older clients retain legacy initialize/session compatibility.

## Public hosted tools

The Hugging Face Remote MCP intentionally exposes a bounded subset:

```text
investigate_url
inspect_provenance
verify_claim
audit_seo
audit_security
audit_trust
find_social_profiles
detect_technologies
brand_intelligence
domain_intelligence
structured_data
```

The open source/self hosted runtime exposes the full action registry.

## Provenance tools

### `inspect_provenance`

Returns claim observations and resolution details.

Example arguments:

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "limit": 100,
  "format": "json"
}
```

Set `format` to `prov` for the W3C PROV shaped export.

### `verify_claim`

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "value": 100502
}
```

Status:

```text
supported
compatible
contradicted
not_found
```

## Modern MCP 2026-07-28

A modern client may first call:

```text
server/discover
```

The server returns current version/capability metadata and the Tasks extension declaration.

HTTP routing headers can include:

```text
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: inspect_provenance
```

The JSON body remains JSON-RPC.

The server validates that routing metadata is consistent with the JSON-RPC call on the modern path.

## Legacy clients

Legacy clients may still use:

```text
initialize
notifications/initialized
tools/list
tools/call
resources/list
resources/read
```

and an `Mcp-Session-Id` returned by the hosted server.

This compatibility path exists so existing 2025-era clients do not need to migrate immediately.

## Tasks extension

When a modern client advertises:

```text
io.modelcontextprotocol/tasks
```

selected expensive tools can return a task object instead of blocking the request.

Task capable tools:

```text
investigate_url
deep_crawl
compare_urls
batch_investigate
```

The public hosted allowlist may prevent some of these from being callable remotely even though the full runtime supports them.

Task methods:

```text
tasks/get
tasks/update
tasks/cancel
```

Use `sync: true` to request a synchronous result where supported.

## Strict schemas

v1.2 publishes action specific `inputSchema` values.

Examples:

- `verify_claim` requires `url`, `predicate`, `value`;
- `inspect_provenance` accepts `predicate`, `limit`, `format`;
- `compare_urls` requires `url` and `url2`;
- `batch_investigate` requires an array of URLs.

The provenance tools also expose structured output schemas.

## Resources

MCP resources include:

```text
url-intelligence://about
url-intelligence://provenance-schema
```

The provenance schema resource describes the observation/claim model and consistency taxonomy.

## Hosted anti abuse policy

The public Remote MCP is a demonstration endpoint, not an unlimited free crawler.

The hosted server applies a bounded analysis allowance and tracks IP usage so creating a new legacy MCP session cannot simply reset the analysis window.

The exact hosted limit is returned in discovery/metadata and can be changed operationally.

For unrestricted usage, self host the MIT licensed repository.

## Origin checks

The hosted endpoint checks browser `Origin` values against an allowlist appropriate for known MCP clients/platforms and the Space itself.

Non browser MCP clients may not send an Origin header.

## Public URL requirement

The hosted MCP validates tool URL arguments before execution. Only public HTTP/HTTPS targets are intended.

Core URL collection also passes through the guarded network layer documented in `docs/NETWORK_SECURITY.md`.

## Browser rendering

The public Space does not enable unrestricted local Playwright rendering by default.

Optional rendering is a separate network trust boundary. Self hosters who enable it should use isolated browser egress controls.

## Manual modern discovery example

Conceptually:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "_meta": {
    "protocolVersion": "2026-07-28"
  }
}
```

## Manual legacy initialize example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {},
    "clientInfo": {
      "name": "manual-test",
      "version": "1.0"
    }
  }
}
```

## Self hosting

Run the local HTTP/MCP server:

```bash
npm install
npm run build
npm run serve
```

Then use:

```text
http://127.0.0.1:8787/mcp
```

Use `URL_AGENT_API_TOKEN` and normal TLS/reverse proxy controls if exposing a private deployment to the internet.

## Attribution

Remote results include URL Intelligence Agent project attribution, version, creator, company and repository metadata.

Created by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd** inside the **HORNO Network** ecosystem.
