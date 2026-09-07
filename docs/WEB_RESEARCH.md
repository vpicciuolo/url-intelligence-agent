# External Web Evidence Research

`investigate_url` is not limited to the submitted website.

The full investigation pipeline deliberately separates **first-party extraction** from **external corroboration**:

1. Crawl the submitted public URL, robots policy, sitemaps and prioritized same-site pages.
2. Resolve the entity from observable first-party metadata and content.
3. Collect eligible external URLs from outbound links, public social/profile links and structured data / JSON-LD, including public `sameAs` references. Direct references from the target receive a dedicated high-priority verification lane.
4. Open and read eligible direct external destinations through the SSRF-safe network layer. A link does not count as confirmation by itself. Articles, websites and public social/profile pages must be fetched and parsed before they can strengthen corroboration.
5. Search beyond the target domain for additional entity/domain mentions, articles, reviews, interviews and backlink-style references using the selected external index.
6. Fetch the selected search results and inspect every fetched external page for entity mentions and direct links back to the target domain. Mark verified backlinks with `backlink-to-target` evidence. Platforms that block automated public access stay visible as unverified instead of being silently trusted.
7. Report extraction confidence and external corroboration separately.
8. Preserve source URLs, timestamps, coverage limitations and explicit contradictions.

## Why confidence is separated

A website repeating the same claim across many pages does not create independent confirmation.

`confidenceAssessment.extractionConfidence` describes how strongly the target's observable metadata/content supports the extracted identity fields.

`confidenceAssessment.externalCorroboration` describes the breadth of fetched third-party-domain coverage that clearly mentions the resolved entity or directly links back to the target.

Neither value is a mathematical probability that every claim is true.

The full result also exposes `webResearch`, including:

- search provider used
- search queries used
- candidate URL count
- fetched source count
- third-party source/domain counts
- corroborating third-party source/domain counts
- platform source count and verified-platform count
- direct-reference count and verified-direct-reference count
- per-source verification status, analyzed word count and bounded content sample
- source coverage score and level
- every selected external source
- discovery path (`outbound-link`, `structured-data`, `search:<provider>`, and `backlink-to-target` when detected)
- fetch status and errors
- entity-mention detection
- observation timestamp
- coverage notes

## Search providers

External URLs referenced by the target are researched without any search credential. Full Investigation also has a **built-in public DuckDuckGo HTML/Lite search fallback**, so the hosted runtime can cross the target-domain boundary even when no commercial search API key is configured.

For higher-volume, more reproducible, or organization-controlled discovery, the runtime automatically prefers the first configured provider in this order:

1. `URL_AGENT_SEARCH_ENDPOINT` — SearXNG-compatible JSON endpoint
2. `BRAVE_SEARCH_API_KEY` — Brave Search API
3. `SERPER_API_KEY` — Serper / Google search API
4. `TAVILY_API_KEY` — Tavily Search
5. `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` — Google Programmable Search / Custom Search JSON API
6. Built-in DuckDuckGo public fallback when no provider above is configured

You can explicitly select or disable search with `URL_AGENT_SEARCH_PROVIDER` (`duckduckgo`, `ddg`, `none`, `off`).

Do not commit provider credentials to the repository. Use environment variables or your deployment platform's secret manager.

### Hugging Face Space

The hosted Docker Space works without a search secret through the built-in fallback. If you add a supported search credential as a Space secret, the runtime automatically prefers that provider for broader/reproducible discovery.

Example:

```text
BRAVE_SEARCH_API_KEY=<secret value>
```

No code change is required after the secret is available to the running Space.

## Resource controls

```text
URL_AGENT_EXTERNAL_RESEARCH=true
URL_AGENT_EXTERNAL_MAX_SOURCES=24
URL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES=60
URL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES=24
URL_AGENT_EXTERNAL_CONCURRENCY=6
URL_AGENT_EXTERNAL_TIMEOUT_MS=9000
URL_AGENT_EXTERNAL_MAX_BYTES=1500000
URL_AGENT_SEARCH_QUERIES=4
URL_AGENT_SEARCH_RESULTS_PER_QUERY=10
URL_AGENT_SEARCH_TIMEOUT_MS=10000
```

The defaults are intentionally bounded. A public-web investigation must never turn into an unbounded spider.

## About “all backlinks”

A crawler cannot enumerate every backlink on the public internet because it has no complete global reverse-link index.

The agent therefore uses three complementary mechanisms:

- **direct evidence expansion** from external URLs actually referenced by the target;
- **search-index discovery** for additional third-party pages mentioning the entity/domain or exact target URL;
- **backlink verification** by parsing fetched third-party pages and checking whether they directly link to the target domain.

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
