# Architecture

URL Intelligence Agent v1.2.0 is an evidence first web intelligence system. The canonical flow is collection → representation preservation → observation extraction → normalization → claim resolution → higher level intelligence → interfaces and exports.

## Design principles

1. Deterministic collection and extraction come before optional AI reasoning.
2. Raw observations are preserved before values are resolved.
3. Source provenance is intrinsic to an observation rather than reconstructed later.
4. Source HTML and rendered DOM are separate evidence representations.
5. A difference is not automatically a contradiction.
6. Extraction confidence, source authority, freshness and external corroboration are separate concepts.
7. Public network collection is bounded and SSRF aware.
8. Browser rendering is treated as a separate trust boundary.
9. Existing v1.x flattened result fields remain available for compatibility.

## High level pipeline

```text
Public URL
   │
   ▼
URL + DNS safety validation
   │
   ▼
Guarded HTTP collection
   │
   ├─ status / redirects
   ├─ headers
   ├─ ETag / Last Modified
   ├─ charset aware decoding
   └─ source HTML
   │
   ▼
Bounded crawl
   │
   ├─ robots.txt
   ├─ sitemap discovery
   ├─ page priority
   └─ important page classification
   │
   ├─────────────── optional ───────────────┐
   │                                         │
   ▼                                         ▼
Source representation                 Browser representation
   │                                         │
   ├─ HTML                                  ├─ rendered DOM
   ├─ meta / OG / Twitter                   ├─ visible content
   ├─ JSON LD                               └─ bounded same origin JSON
   ├─ Microdata / RDFa
   └─ visible claims
   │                                         │
   └──────────────────┬──────────────────────┘
                      ▼
              EvidenceObservation[]
                      │
                      ▼
              field normalizers
                      │
                      ▼
                 claim grouping
                      │
                      ▼
            conflict / drift engine
                      │
                      ▼
                ResolvedClaim[]
                      │
         ┌────────────┼──────────────┐
         ▼            ▼              ▼
 entity + graph   audits/analysis  monitoring
         │            │              │
         └────────────┼──────────────┘
                      ▼
              IntelligenceResult
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
     CLI             HTTP             MCP
      │               │                │
      └───────────────┼────────────────┘
                      ▼
          reports / RAG / knowledge
```

## Core modules

### `src/net.ts`

The guarded HTTP transport.

Responsibilities:

- parse and validate public HTTP/HTTPS URLs;
- reject credentials in URLs;
- block local/private/reserved address classes;
- resolve all DNS answers before collection;
- reject mixed public/private DNS answers;
- validate DNS again inside the Undici socket resolver;
- manually follow and revalidate redirects;
- enforce request timeout, maximum response size and redirect limits;
- decode response text using HTTP charset, BOM and HTML charset hints with UTF 8 fallback;
- expose ETag and Last Modified validators;
- support conditional request headers.

### `src/crawler.ts`

The bounded site collector.

Responsibilities:

- collect robots.txt and sitemap signals;
- queue same origin pages with bounded depth/page count;
- honor crawl allow/deny rules;
- classify important pages;
- preserve raw/source representation evidence;
- invoke rendering based on the per request crawl policy;
- attach source and rendered representations to `PageSignal`.

### `src/render.ts`

Optional browser rendering.

Responsibilities:

- render JavaScript heavy pages through a configured renderer or Playwright;
- validate the initial destination;
- intercept requests and reject unsupported/private destinations as defense in depth;
- bound subresource requests;
- block service workers and downloads;
- optionally block media/font traffic;
- optionally capture bounded same origin XHR/fetch JSON evidence.

Browser networking is not considered equivalent to the guarded Undici transport. Security sensitive deployments should add infrastructure level egress controls.

### `src/provenance.ts`

The v1.2 provenance and consistency core.

Responsibilities:

- parse evidence with `parse5` and retain source locations;
- extract metadata, Open Graph, Twitter Cards, JSON LD, Microdata, RDFa, canonical/feed links, time/data elements, visible numeric claims and selected HTTP/runtime evidence;
- normalize values according to predicate type;
- group observations into claims;
- compare normalized values;
- distinguish consensus, compatible variation, drift and conflict;
- choose preferred observations using field aware source authority/freshness rules;
- expose verification and W3C PROV shaped export.

## Evidence data model

### EvidenceObservation

An observation records what was observed before cross source resolution.

Conceptually:

```ts
type EvidenceObservation = {
  id: string;
  subject: string;
  predicate: string;
  rawValue: JsonValue;
  normalizedValue: NormalizedEvidenceValue;
  source: {
    pageUrl: string;
    finalUrl: string;
    representation: EvidenceRepresentation;
    layer: EvidenceLayer;
    property?: string;
    locator?: string;
    jsonPointer?: string;
    sourceRange?: SourceRange;
    visibility?: string;
    sourceClass?: string;
    independenceGroup?: string;
    requestVariant?: RequestVariant;
  };
  temporal: {
    observedAt: string;
    publishedAt?: string;
    modifiedAt?: string;
    lastModified?: string;
  };
  integrity: {
    documentHash: string;
    observationHash: string;
  };
  quality: {
    extractionConfidence: number;
    sourceAuthority: number;
    freshnessConfidence: number;
  };
};
```

### PageRepresentation

A page can preserve multiple representations:

```text
source_html
rendered_dom
http
```

The source and rendered representations are not collapsed before evidence comparison.

### ResolvedClaim

A resolved claim groups observations for the same subject/predicate and records:

- preferred value;
- display value;
- status;
- observation IDs;
- conflicts;
- drift/quality flags;
- resolution confidence;
- resolution policy;
- human readable resolution explanation.

Statuses:

```text
consensus
compatible_variation
drift
conflict
insufficient_evidence
```

## Normalization

Normalization is predicate aware.

### Numeric values

Supports exact, approximate, lower bound and upper bound semantics, including K/M/B suffixes.

Examples:

```text
80,000   → exact 80000
80K      → exact 80000
80,000+  → min 80000, no upper bound
>80,000  → lower bound
about 80K → approximate numeric interval
```

### Money

Amount, optional currency and cadence are retained.

### Dates

Dates are converted to normalized timestamps while preserving detected precision.

### URLs

Fragments and common UTM tracking parameters are removed for normalized comparison.

### Strings

Unicode NFKC, whitespace normalization and folded comparison are applied.

## Conflict and drift semantics

The engine intentionally separates logical incompatibility from representation drift.

Example:

```text
metadata: 80,000+
rendered: 100,502
```

The exact value satisfies the metadata lower bound, therefore the pair is compatible. Because the representations differ and the rendered exact value is more precise/fresh for a volatile metric, the claim can still carry:

```text
representation_drift
precision_difference
freshness_divergence
stale_metadata_suspected
```

A stable exact field such as a current product price can instead become a true conflict when two authoritative representations provide incompatible exact values.

## Resolution policy

Resolution is field aware rather than globally declaring one evidence source superior.

Examples:

- canonical URL: HTML canonical/HTTP Link evidence receives high authority;
- volatile metrics: rendered visible/API evidence receives a freshness advantage;
- price: rendered visible price can outrank stale metadata while exact disagreement remains a conflict;
- descriptions: standard description metadata can remain authoritative for the description field but is not automatically treated as current evidence for dynamic facts embedded inside it.

## Integrity and reproducibility

The provenance layer generates SHA 256 hashes for representations and observations. These hashes prove which bytes/observation record the agent processed. They do not independently prove the real world truth of the website claim.

## Temporal intelligence

`src/monitor.ts` extends snapshots with:

```text
provenanceFingerprint
claimValues
claimStatuses
httpValidators
observedAt
```

Timestamped history snapshots are stored separately. This allows repeated observations of a claim to reveal persistent drift, such as a static metadata counter while a rendered counter changes over time.

## External corroboration

External research remains separate from target side extraction.

The agent distinguishes first party evidence, public platform references and third party sources. External corroboration is measured separately from extraction confidence and claim resolution.

Repetition on the target domain does not become independent corroboration simply because it appears on multiple pages.

## Higher level analyzers

`src/analyzers.ts` and `src/extensions.ts` consume `PageSignal` and `IntelligenceResult` to provide:

- entity resolution;
- technology detection;
- brand intelligence;
- SEO, quality, security and trust audits;
- structured data inventory;
- commerce and freshness intelligence;
- API discovery;
- people/team signals;
- link intelligence;
- RAG/knowledge exports.

v1.2 keeps these outputs backward compatible while adding provenance alongside them.

## MCP architecture

`src/mcp.ts` exposes the action registry as tools.

Supported protocol revisions:

```text
2026-07-28
2025-11-25
2025-06-18
2025-03-26
```

For 2026-07-28 the server supports stateless request handling, `server/discover`, method/tool routing metadata, cache hints and optional Tasks extension behavior. Legacy initialize/session behavior remains available for older clients.

Strict input schemas are action specific. `inspect_provenance` and `verify_claim` expose the new evidence model directly.

## Compatibility strategy

v1.2 is a MINOR release. Existing flattened fields remain in `IntelligenceResult` while the new `provenance` object carries the detailed evidence model.

A future v2 may make resolved claims the canonical public model. See `VERSIONING.md`.

## Failure model

The project uses fail soft behavior where possible:

- optional external research failure does not invalidate first party extraction;
- optional rendering failure does not discard successful source HTML evidence;
- malformed JSON LD becomes explicit evidence/diagnostic output rather than crashing the crawl;
- unavailable persistence falls back according to configured adapters;
- uncertainty is surfaced rather than silently converted to high confidence.

## Security boundaries

The important trust boundaries are:

1. untrusted URL input;
2. DNS resolution and outbound HTTP connection;
3. redirects;
4. optional browser execution/networking;
5. optional external search providers;
6. optional AI provider;
7. persistence/cache backends;
8. hosted authentication/rate limiting.

See `SECURITY.md` and `docs/NETWORK_SECURITY.md` for the detailed threat model.
