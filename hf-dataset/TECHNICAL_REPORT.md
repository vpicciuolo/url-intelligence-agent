# URL Intelligence Benchmark — Technical Report

Version: **2026-09 / provenance track 1.0**

Project: URL Intelligence Agent  
Creator: Vincenzo Picciuolo  
Company: HRN Innovation Technologies Ltd

## Abstract

The URL Intelligence Benchmark is a public evaluation asset for URL analysis libraries, web intelligence agents and MCP servers.

The benchmark intentionally separates two classes of capability:

1. **core URL/network behavior**, where deterministic URL safety, redirects, status/content handling and selected full-agent completion can be measured against reproducible cases;
2. **provenance/consistency semantics**, introduced with URL Intelligence Agent v1.2.0, where claim attribution, normalization and disagreement handling can be evaluated without relying on unstable live websites.

The second track addresses a common weakness in web extraction benchmarks: systems are often scored only on whether they return a value, not whether they can explain which page layer produced it or whether another representation disagrees.

## Goals

The benchmark aims to measure observable, reproducible behavior rather than subjective model quality.

Core goals:

- safe handling of untrusted URL input;
- predictable redirect/status/content behavior;
- explicit handling of private/local destinations;
- reproducible result scoring;
- transparent baseline comparison.

Provenance goals:

- preserve multiple observations before resolution;
- normalize values according to semantic field type;
- distinguish exact/normalized agreement from compatible ranges;
- avoid false conflicts;
- identify true incompatible claims;
- preserve source representation/layer information;
- expose drift/freshness signals independently from logical contradiction.

## Dataset configurations

### Core

```text
config: core
file: data/benchmark.jsonl
schema: schema.json
```

This is the existing network/URL benchmark track.

Typical groups include:

- normal public URLs;
- redirect behavior;
- HTTP status families;
- content handling;
- malformed/unsupported URLs;
- loopback/private/link-local/cloud-metadata style destinations;
- selected full `investigate()` completion checks.

### Provenance consistency

```text
config: provenance
file: data/provenance.jsonl
schema: provenance-schema.json
schema_version: 1.0
```

This track is deterministic and does not need a live external page.

Each row defines:

```text
predicate
observations[]
expected semantics
```

Observation fields:

```text
representation
layer
raw_value
```

Expected semantics may include:

```text
logical_conflict
preferred_value
relation
required_flags[]
minimum_observation_count
```

## Provenance evaluation model

### Observations before answers

The underlying design treats a page value as an observation rather than immediately collapsing it into one answer.

Representations include:

```text
http
source_html
rendered_dom
external
```

Layers include:

```text
http_header
html
meta
open_graph
twitter_card
json_ld
microdata
rdfa
visible_dom
sitemap
feed
api
```

The benchmark does not require all tools to implement every representation. Applicability should be reported explicitly.

### Normalization

Comparison should be performed after semantic normalization.

Examples:

```text
80K       == 80,000
80,000+   means value >= 80,000
$29       can normalize to amount 29 with currency when inferable
URL with UTM/fragment can normalize to canonical form
same calendar date at different precision can be compatible
```

### Conflict taxonomy

A benchmark submission should avoid treating every string difference as a contradiction.

Useful relations include:

```text
exact_match
normalized_match
compatible_range
numeric_drift
value_conflict
date_conflict
currency_conflict
type_conflict
```

A system may use a richer internal taxonomy as long as the published mapping to benchmark expectations is clear.

## Key regression: lower bound vs exact value

Fixture:

```text
predicate: metric:pages_indexed
source/OpenGraph: 80,000+
rendered/visible: 100,502
```

Expected:

```text
logical_conflict         false
preferred_value          100502
representation_drift     true
precision_difference     true
freshness_divergence     true
stale_metadata_suspected true
```

Rationale:

`80,000+` is not an exact assertion of `80,000`; it is a lower bound. `100,502` satisfies the lower bound. The representations still diverge in precision/freshness, so drift is useful without creating a false logical contradiction.

This case was motivated by real world feedback about stale Open Graph descriptions versus live counters.

## Exact price conflict fixture

Fixture:

```text
JSON-LD price: 49 USD
visible/structured price: 59 USD
```

Expected:

```text
logical_conflict true
relation value_conflict
```

Rationale:

For a stable current price in the same currency/cadence, two incompatible exact values should be surfaced as a conflict rather than silently choosing one and hiding the other.

## URL normalization fixture

Two URLs that differ only by common tracking parameters/fragments can represent the same canonical target after normalization.

The fixture checks that normalization occurs before a conflict is declared.

## Date precision fixture

A date-only representation and a timestamp on the same calendar date should be treated as compatible/normalized according to the benchmark semantics.

## Duplicate metadata fixture

Repeated metadata keys must not be irreversibly overwritten before provenance analysis.

The fixture requires at least two preserved observations and expects a conflict when the duplicate exact descriptions differ.

## Metrics for the provenance track

As the track expands, recommended metrics include:

### Source attribution accuracy

Did the system correctly identify the evidence layer/representation associated with each observation?

### Observation recall

Did the system preserve all benchmark-relevant candidate values?

### Normalization accuracy

Did raw values map to the correct numeric/date/url/money/string semantics?

### Conflict precision/recall/F1

Did the system flag actual incompatible values while avoiding false conflicts?

### False-conflict rate

Especially important for approximate/range/lower-bound values.

### Preferred-value accuracy

When a preferred value is defined, did the resolver choose it for a documented field-aware reason?

### Drift classification

Did the system distinguish representation/freshness drift from logical contradiction?

### Required flag recall

Did expected evidence quality/drift flags appear?

## Core benchmark scoring

The core evaluator uses `hf-dataset/evaluate.py` and scores deterministic assertions from predictions generated by `scripts/run-hf-benchmark.mjs`.

The benchmark intentionally publishes raw predictions and score artifacts so results can be inspected rather than accepted as opaque marketing numbers.

## Independent baselines

Independent open source libraries can be pinned and run through separate GitHub Actions workflows.

The benchmark does not assume all baseline tools are full agents.

A metadata library can be applicable to network/metadata fundamentals while not implementing:

- entity resolution;
- external corroboration;
- claim provenance;
- MCP;
- monitoring;
- RAG/reporting.

The leaderboard should therefore show capability class/applicability instead of treating a core score as a universal measure of intelligence depth.

## Reproducibility

Core track:

```bash
npm install
npm run benchmark:hf
```

Repository regression suite including provenance semantics:

```bash
npm install
npm run typecheck
npm test
```

CI runs the deterministic TypeScript suite across supported Node.js versions.

## Safety methodology

The core benchmark includes public/private destination cases because a URL intelligence agent can become an SSRF primitive if network safety is ignored.

URL Intelligence Agent v1.2 uses:

- preflight URL/DNS validation;
- connect-time guarded DNS resolution for the actual Undici socket;
- rejection of mixed public/private DNS answers;
- manual redirect validation;
- bounded response/time/redirect limits.

Optional browser rendering remains a separate trust boundary and is not represented as equivalent to the guarded HTTP collector.

## Limitations

### Benchmark size

The dataset is intentionally small and interpretable. A perfect score means all current assertions passed, not that a tool is universally correct.

### Live web instability

Live pages change. The provenance track therefore prioritizes deterministic fixtures for semantic behavior.

### Geographic and personalization variants

The current provenance track does not yet comprehensively evaluate content that changes by region, language, device or experiment bucket.

### Browser/runtime evidence

The initial provenance fixtures specify representation semantics but do not require a particular browser engine.

### Real-world truth

The benchmark evaluates what an analyzer observes/resolves from evidence. It does not prove that a website's external real-world claim is true.

## Roadmap

Planned benchmark expansion areas:

- source HTML vs rendered DOM fixtures;
- JSON-LD vs visible content mismatches;
- Microdata/RDFa agreement/conflict;
- price currency/cadence semantics;
- locale variants;
- temporal repeated-observation drift;
- source independence/corroboration;
- dynamic API vs DOM evidence;
- published/modified date conflicts;
- entity identity disagreement;
- provenance locator accuracy;
- observation/document hash reproducibility.

## Integrity and governance

Benchmark changes should be reviewable in Git history.

New cases should document:

1. the behavior under test;
2. expected semantics;
3. why the case is deterministic/reproducible;
4. whether it applies to all tool classes;
5. any ambiguity or limitations.

The benchmark should not be changed merely to preserve the score of URL Intelligence Agent.

## License

MIT. The benchmark is intended for public evaluation and reproducible comparison.
