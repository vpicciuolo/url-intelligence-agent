# URL Intelligence Agent — Complete Usage Guide

> **URL in. Identity, evidence and intelligence out.**
>
> URL Intelligence Agent is an evidence-first public web intelligence toolkit created by Vincenzo Picciuolo / HRN Innovation Technologies Ltd and used inside the HORNO ecosystem.

Repository: https://github.com/vpicciuolo/url-intelligence-agent  
HORNO: https://horno.net

---

## Requirements

- Node.js 18 or newer
- npm
- Internet access to the public URLs you want to inspect

Optional integrations:

- `playwright` for local JavaScript rendering/browser fallback
- `redis` for Redis/Valkey-backed caching
- `pg` for PostgreSQL persistence
- an OpenAI-compatible API for optional reasoning

---

## Install from source

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
npm run build
```

Run the interactive console:

```bash
node dist/src/cli.js
```

Or use development mode:

```bash
npm run dev
```

## Install directly from GitHub

```bash
npm install github:vpicciuolo/url-intelligence-agent
npx url-agent investigate https://example.com
```

Global installation is useful for CLI and MCP use:

```bash
npm install -g github:vpicciuolo/url-intelligence-agent
url-agent about
url-agent investigate https://example.com
```

---

# The basic mental model

The agent accepts a public HTTP/HTTPS URL and can perform one focused action or a complete investigation.

```text
PUBLIC URL
   │
   ├─ Safe URL validation / redirect checks
   ├─ robots.txt + sitemap discovery
   ├─ bounded crawl / optional rendering
   ├─ metadata + structured-data extraction
   ├─ entity + social + contact resolution
   ├─ technology / brand / domain intelligence
   ├─ SEO / security / quality / trust audits
   ├─ evidence + confidence + provenance
   └─ JSON / Markdown / HTML / RAG / API / MCP output
```

The core workflow is deterministic. AI is optional and is used only when explicitly configured or requested.

---

# Quick commands

Full investigation:

```bash
url-agent investigate https://example.com
```

Safe URL/redirect probe:

```bash
url-agent probe https://example.com
```

Domain/DNS/TLS intelligence:

```bash
url-agent domain https://example.com
```

Deep crawl:

```bash
url-agent crawl https://example.com
```

Entity resolution:

```bash
url-agent entity https://example.com
```

Public social discovery:

```bash
url-agent socials https://example.com
```

Public contacts/people:

```bash
url-agent contacts https://example.com
url-agent people https://example.com
```

Technology fingerprinting:

```bash
url-agent technologies https://example.com
```

Brand intelligence:

```bash
url-agent brand https://example.com
```

SEO/security/quality/trust:

```bash
url-agent seo https://example.com
url-agent security https://example.com
url-agent quality https://example.com
url-agent trust https://example.com
```

Entity graph:

```bash
url-agent graph https://example.com
```

Competitor/comparison signals:

```bash
url-agent competitors https://example.com
```

Structured data and API discovery:

```bash
url-agent structured https://example.com
url-agent apis https://example.com
```

Compliance/public-policy signals:

```bash
url-agent compliance https://example.com
```

Commerce and freshness signals:

```bash
url-agent commerce https://example.com
url-agent freshness https://example.com
```

Link intelligence and link health:

```bash
url-agent links https://example.com
url-agent check-links https://example.com --limit 100
```

Generate a directory/marketplace listing:

```bash
url-agent listing https://example.com
```

RAG export and provenance-aware knowledge export:

```bash
url-agent rag https://example.com
url-agent knowledge https://example.com
```

Reports:

```bash
url-agent report https://example.com --out my-report
```

This writes:

```text
my-report.md
my-report.html
my-report.json
```

Compare two URLs:

```bash
url-agent compare https://example.com https://example.org
```

Batch mode:

```bash
url-agent batch urls.txt --concurrency 4
```

`urls.txt` can contain one URL per line. JSON input can be either an array or `{ "urls": [...] }`.

Monitoring snapshot:

```bash
url-agent snapshot https://example.com
```

Diff current state against a saved snapshot:

```bash
url-agent diff https://example.com --snapshot path/to/snapshot.json
```

Continuous watch:

```bash
url-agent watch https://example.com --interval 300000
```

The interval is milliseconds and is bounded to a minimum of one minute by the CLI.

Optional AI reasoning:

```bash
url-agent reason https://example.com \
  --instruction "Summarize the entity, opportunities, risks and uncertainty using only supplied evidence."
```

List every registered action:

```bash
url-agent actions
```

---

# Useful CLI options

The following options are accepted by relevant commands:

| Option | Meaning |
| --- | --- |
| `--profile <name>` | Add/select the investigation profile label |
| `--force` | Skip cached investigation result |
| `--limit <n>` | Limit operations such as link checking |
| `--concurrency <n>` | Set bounded concurrency for supported tasks |
| `--snapshot <path>` | Snapshot path used by diff workflows |
| `--instruction <text>` | Instruction for optional AI reasoning |
| `--no-webhook` | Disable configured webhook delivery for relevant monitoring actions |
| `--no-html` | Suppress HTML payload from render output |
| `--raw` | Suppress decorative CLI banner for machine-oriented use |

---

# Machine-readable use

For scripts, add `--raw` to avoid the normal CLI banner:

```bash
url-agent investigate https://example.com --raw > result.json
```

Then consume the JSON with your preferred tool:

```bash
jq '.entity.name, .seo.score, .trust.score' result.json
```

---

# Programmatic TypeScript / JavaScript use

The package exports the main runtime modules from `src/index.ts`.

```ts
import { investigate, runAction } from "url-intelligence-agent";

const result = await investigate("https://example.com");
console.log(result.entity.name.value);
console.log(result.entity.name.confidence);
console.log(result.entity.name.sources);

const technologies = await runAction("detect_technologies", {
  url: "https://example.com"
});

console.log(technologies);
```

Direct GitHub dependency:

```json
{
  "dependencies": {
    "url-intelligence-agent": "github:vpicciuolo/url-intelligence-agent"
  }
}
```

---

# Evidence-first fields

Important resolved values use a structure similar to:

```json
{
  "value": "Example Inc.",
  "confidence": 0.97,
  "method": "jsonld-name+og-site-name+page-title",
  "sources": [
    "https://example.com/",
    "https://example.com/about"
  ]
}
```

This allows callers to distinguish a discovered fact from a low-confidence inference and to trace where the result came from.

---

# Render JavaScript-heavy pages

Rendering is disabled by default.

## Local Playwright renderer

```bash
npm install playwright
npx playwright install chromium
```

Set:

```env
URL_AGENT_RENDER_MODE=auto
```

Supported modes are runtime-dependent; `auto` enables fallback behavior when the static page appears too thin, while `off` keeps static fetching only.

Run a direct render action:

```bash
url-agent render https://example.com
```

To avoid including HTML in CLI output:

```bash
url-agent render https://example.com --no-html
```

## Remote renderer

```env
URL_AGENT_RENDER_ENDPOINT=https://renderer.example.com/render
URL_AGENT_RENDER_API_KEY=your-key
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

---

# Optional AI layer

The agent remains useful without AI.

Configure an OpenAI-compatible endpoint:

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-key
AI_MODEL=gpt-5-mini
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.1
AI_TIMEOUT_MS=30000
URL_AGENT_AI_AUTO=false
```

Run reasoning explicitly:

```bash
url-agent reason https://example.com \
  --instruction "Create an evidence-only executive summary and explicitly list uncertainty."
```

Set `URL_AGENT_AI_AUTO=true` only if you intentionally want the complete investigation workflow to invoke the configured AI provider automatically.

---

# Cache and persistence

Default cache mode:

```env
URL_AGENT_CACHE=memory
```

Useful related settings:

```env
URL_AGENT_CACHE_TTL_MS=300000
URL_AGENT_CACHE_DIR=.url-agent/cache
URL_AGENT_DATA_DIR=.url-agent/data
```

Redis/Valkey and PostgreSQL are optional integrations. Install the corresponding peer package and configure the connection URL when you enable those adapters.

```bash
npm install redis
npm install pg
```

```env
REDIS_URL=redis://localhost:6379
VALKEY_URL=
DATABASE_URL=postgres://user:password@localhost:5432/urlagent
```

---

# Monitoring and webhooks

Configure:

```env
URL_AGENT_WEBHOOK_URL=https://your-app.example/webhooks/url-intelligence
URL_AGENT_WEBHOOK_SECRET=replace-with-a-secret
```

Start a watch:

```bash
url-agent watch https://example.com --interval 300000
```

Disable webhook delivery for a specific run:

```bash
url-agent watch https://example.com --interval 300000 --no-webhook
```

For production monitoring, use your process manager/container scheduler so the watch process is restarted if the host restarts.

---

# Safety boundaries

URL Intelligence Agent is built for public web intelligence.

It does not intentionally bypass:

- authentication
- CAPTCHAs
- access controls
- private network boundaries
- robots policy when default robot compliance is enabled

Public URLs are treated as untrusted. The network layer validates destinations and redirects and blocks common local/private network destinations.

See `SECURITY.md` for the security model.

---

# More guides

- [MCP guide](MCP.md)
- [Deployment guide](DEPLOYMENT.md)
- [HTTP API guide](API.md)
- [Action reference](ACTIONS.md)
- [Architecture](ARCHITECTURE.md)

---

## Support the open-source project

If this project saves you engineering time or becomes part of your product, you can support continued open-source development here:

**https://hrn.ae/githubsupport**

The support page provides the Stripe donation/payment flow.

---

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**  
Part of the **HORNO ecosystem** — https://horno.net
