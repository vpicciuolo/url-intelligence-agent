# Claim Provenance & Temporal Consistency Engine

URL Intelligence Agent v1.2.0 treats web extraction as an evidence-resolution problem rather than a single-value scraping problem.

## Why

A page can describe the same fact differently across layers. For example:

- Open Graph description: `80,000+ pages indexed`
- rendered body: `100,502 pages indexed`

Those values are not automatically contradictory. `80,000+` is a lower-bound statement and `100,502` satisfies it. The useful signal is that the representations differ in precision and likely freshness.

The provenance engine therefore separates:

- **logical contradiction** — values cannot simultaneously be true under normalization;
- **compatible variation** — values differ but remain logically compatible;
- **representation drift** — source HTML and rendered DOM differ;
- **freshness divergence** — a volatile fact differs across representations/time;
- **precision difference** — approximate/range/lower-bound vs exact value;
- **suspected stale metadata** — static metadata materially trails a newer exact rendered value;
- **insufficient evidence** — only one observation supports the claim.

## Evidence model

### EvidenceObservation

An observation records a value exactly where it was seen:

```json
{
  "id": "obs_…",
  "subject": "https://example.com/",
  "predicate": "metric:pages_indexed",
  "rawValue": "80,000+",
  "normalizedValue": {
    "kind": "number",
    "value": 80000,
    "exact": false,
    "min": 80000,
    "max": null,
    "comparator": "gte"
  },
  "source": {
    "pageUrl": "https://example.com/",
    "finalUrl": "https://example.com/",
    "representation": "source_html",
    "layer": "open_graph",
    "property": "og:description",
    "sourceRange": {
      "start": 4812,
      "end": 4895
    },
    "visibility": "metadata_only",
    "sourceClass": "first-party",
    "independenceGroup": "example.com"
  },
  "temporal": {
    "observedAt": "2026-09-08T06:00:00.000Z"
  },
  "integrity": {
    "documentHash": "sha256…",
    "observationHash": "sha256…"
  },
  "quality": {
    "extractionConfidence": 0.9,
    "sourceAuthority": 0.82,
    "freshnessConfidence": 0.78
  }
}
```

### ResolvedClaim

Observations sharing a subject/predicate are compared and resolved:

```json
{
  "predicate": "metric:pages_indexed",
  "displayValue": 100502,
  "status": "drift",
  "flags": [
    "representation_drift",
    "precision_difference",
    "freshness_divergence",
    "stale_metadata_suspected"
  ],
  "resolution": {
    "policy": "field-policy:volatile-metric-v1",
    "confidence": 0.99,
    "preferredObservationId": "obs_…",
    "explanation": []
  }
}
```

`resolution.confidence` is a resolution/evidence-strength score. It is **not** a probability that the real-world claim is true.

## Representations

The crawler can retain separate evidence views:

- `source_html` — HTTP response representation;
- `rendered_dom` — optional browser-rendered representation;
- `http` — HTTP headers/validators;
- `external` — reserved for externally corroborated claim observations.

Raw HTML is not retained by default. Set `URL_AGENT_INCLUDE_RAW_REPRESENTATIONS=true` only when full representation retention is appropriate for the deployment.

## Evidence layers

The v1.0 provenance schema understands:

- HTTP headers;
- HTML/title/canonical/feed links;
- standard meta tags;
- Open Graph;
- Twitter Cards;
- JSON-LD;
- Microdata;
- RDFa;
- visible DOM/text;
- runtime same-origin JSON API evidence;
- sitemap/feed layers where available.

The existing fast extraction surface remains available for compatibility. Provenance extraction intentionally preserves duplicate values instead of collapsing them before comparison.

## Normalization

### Numbers and ranges

Examples understood deterministically:

- `80,000`
- `80,000+`
- `80K`
- `80K+`
- `>80,000`
- `at least 80,000`
- `about 80k`
- `100,502`

An exact number satisfies a lower-bound claim when it is equal to or greater than the minimum. This prevents false conflicts.

### Money

The engine normalizes common currency symbols/codes and can preserve cadence such as month/year/week.

### Dates

Dates are normalized to ISO timestamps with a precision indicator so date-only and timestamp representations can be compared without inventing precision.

### URLs

URL normalization strips fragments and common UTM parameters and normalizes default ports before comparison.

### Strings

Strings receive Unicode NFKC, whitespace, case and punctuation folding for deterministic normalized comparison.

## Conflict taxonomy

Pairwise comparison can produce relations including:

- `exact_match`
- `normalized_match`
- `compatible_range`
- `precision_difference`
- `numeric_drift`
- `temporal_drift`
- `value_conflict`
- `type_conflict`
- `date_conflict`
- `currency_conflict`
- `canonical_conflict`
- `external_contradiction`

A claim aggregates these comparisons into one high-level status.

## Source authority is field-aware

There is no universal rule such as “rendered DOM always wins.” Source authority depends on the field.

Examples:

- canonical URL: canonical link/HTTP link evidence has high authority;
- volatile live counter: exact rendered/API value receives a freshness preference;
- metadata description: normal meta description can outrank secondary social-card fallbacks;
- price: exact current visible/runtime evidence receives additional weight while incompatible structured values remain visible as conflicts.

## Browser/runtime evidence

Optional Playwright rendering can capture same-origin public XHR/fetch JSON. The capture is bounded by:

- request-count limits;
- response-size limits;
- same-origin requirement for captured API bodies;
- public URL validation;
- blocked service workers and downloads;
- optional media/font blocking.

This is evidence collection only. It does not bypass authentication or access controls.

### Security boundary

Browser networking is not the guarded Undici `safeFetch()` transport. Application-level request interception is defense-in-depth, but production deployments that enable browser rendering for untrusted URLs should still isolate the renderer and enforce network-level egress controls.

## Temporal intelligence

Snapshots persist:

- resolved claim values;
- claim statuses;
- provenance fingerprint;
- ETag and Last-Modified validators;
- content/entity/technology/trust state;
- observation timestamp.

Timestamped history is stored separately from the latest baseline. This enables future trend analysis without overwriting the previous state.

`safeFetch()` also supports conditional validators:

```ts
await safeFetch(url, {
  ifNoneMatch: previousEtag,
  ifModifiedSince: previousLastModified
});
```

A `304 Not Modified` response is returned as an empty-body result with trace metadata.

## MCP tools

### inspect_provenance

Input:

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "limit": 100,
  "format": "json"
}
```

Use `format: "prov"` to additionally include PROV-shaped export.

### verify_claim

Input:

```json
{
  "url": "https://example.com",
  "predicate": "pages_indexed",
  "value": 100502
}
```

Possible verification states:

- `supported`
- `compatible`
- `contradicted`
- `not_found`

The result describes evidence compatibility, not independent real-world truth unless external corroboration is separately available.

## W3C PROV-shaped export

`exportProvJson()` exposes observations as entities, resolution as activities, the URL Intelligence Agent as a software agent, and claim derivations through `wasDerivedFrom`-style relationships.

It is intentionally lightweight and interoperability-oriented; internal resolution does not require RDF.

## Privacy and retention

The default runtime stores hashes, bounded samples and extracted observations. Raw HTML retention is opt-in. Operators should choose retention policies appropriate to their jurisdiction, data source and deployment purpose.

## Benchmark expectations

Provenance regression cases should measure at least:

- source attribution accuracy;
- duplicate observation preservation;
- source locator accuracy;
- numeric/range normalization;
- false-conflict rate;
- conflict detection accuracy;
- representation drift classification;
- stale-metadata signal precision;
- preferred-observation selection;
- temporal change detection.

The canonical regression example is `80,000+` in metadata vs `100,502` in rendered content: **compatible semantics, drift signal, no logical conflict**.
