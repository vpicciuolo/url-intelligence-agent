# External Web Evidence Research

`investigate_url` is not limited to the submitted website.

The full investigation pipeline deliberately separates **first-party extraction** from **external corroboration**:

1. Crawl the submitted public URL, robots policy, sitemaps and prioritized same-site pages.
2. Resolve the entity from observable first-party metadata and content.
3. Collect eligible external URLs from outbound links and structured data / JSON-LD.
4. If a search provider is configured, query a web index for additional articles and backlink-style references.
5. Fetch a bounded set of selected public third-party pages through the SSRF-safe network layer.
6. Report extraction confidence and external corroboration separately.
7. Preserve source URLs, timestamps, coverage limitations and explicit contradictions.

## Why confidence is separated

A website repeating the same claim across many pages does not create independent confirmation.

`confidenceAssessment.extractionConfidence` describes how strongly the target's observable metadata/content supports the extracted identity fields.

`confidenceAssessment.externalCorroboration` describes the breadth of fetched third-party-domain coverage that clearly mentions the resolved entity.

Neither value is a mathematical probability that every claim is true.

The full result also exposes `webResearch`, including:

- search provider status
- search queries used
- candidate URL count
- fetched source count
- third-party source/domain counts
- corroborating third-party source/domain counts
- platform source count
- source coverage score and level
- every selected external source
- discovery path (`outbound-link`, `structured-data`, or `search:<provider>`)
- fetch status and errors
- entity-mention detection
- observation timestamp
- coverage notes

## Search providers

External URLs referenced by the target are researched without a search API. Broader backlink/article discovery requires a search index.

The runtime automatically selects the first configured provider in this order:

1. `URL_AGENT_SEARCH_ENDPOINT` — SearXNG-compatible JSON endpoint
2. `BRAVE_SEARCH_API_KEY` — Brave Search API
3. `SERPER_API_KEY` — Serper / Google search API
4. `TAVILY_API_KEY` — Tavily Search
5. `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` — Google Programmable Search / Custom Search JSON API

Do not commit provider credentials to the repository. Use environment variables or your deployment platform's secret manager.

### Hugging Face Space

For the hosted Docker Space, add the chosen provider credential as a Space secret. The container reads it directly from the environment at runtime.

Example:

```text
BRAVE_SEARCH_API_KEY=<secret value>
```

No code change is required after the secret is available to the running Space.

## Resource controls

```text
URL_AGENT_EXTERNAL_RESEARCH=true
URL_AGENT_EXTERNAL_MAX_SOURCES=16
URL_AGENT_EXTERNAL_CONCURRENCY=4
URL_AGENT_EXTERNAL_TIMEOUT_MS=9000
URL_AGENT_EXTERNAL_MAX_BYTES=1500000
URL_AGENT_SEARCH_QUERIES=3
URL_AGENT_SEARCH_RESULTS_PER_QUERY=8
```

The defaults are intentionally bounded. A public-web investigation must never turn into an unbounded spider.

## About “all backlinks”

A crawler cannot enumerate every backlink on the public internet because it has no global reverse-link index.

The agent therefore uses two complementary mechanisms:

- **direct evidence expansion** from external URLs actually referenced by the target;
- **search-index discovery** for additional third-party pages mentioning the entity/domain.

For exhaustive SEO-style backlink datasets, integrate a dedicated backlink index provider (for example an enterprise SEO/backlink API) as an additional discovery adapter. The agent should still fetch and verify selected public sources itself before treating them as evidence.

## Public-data boundary

External research follows the same safety model as the rest of the project:

- public HTTP/HTTPS URLs only
- localhost/private/reserved network destinations blocked
- bounded response size and timeouts
- no authentication bypass
- no CAPTCHA bypass
- no access-control circumvention
- no claim that source coverage is complete
