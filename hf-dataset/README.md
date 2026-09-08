---
license: mit
language:
- en
pretty_name: URL Intelligence Benchmark
size_categories:
- n<1K
tags:
- url-analysis
- web-intelligence
- benchmark
- leaderboard
- mcp
- ai-agent
- web-crawler
- seo
- metadata
- provenance
- claim-verification
- representation-drift
- temporal-consistency
- ssrf
- safety
- evaluation
configs:
- config_name: core
  data_files:
  - split: test
    path: data/benchmark.jsonl
- config_name: provenance
  data_files:
  - split: test
    path: data/provenance.jsonl
---

# 📊 URL Intelligence Benchmark

### Public, reproducible evaluation for URL intelligence agents, MCP servers and web analysis tools.

The **URL Intelligence Benchmark** is maintained with the open-source **URL Intelligence Agent** project by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

It is an evaluation asset, not a training corpus and not a scraped web dump.

<p align="center">
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard"><img src="https://img.shields.io/badge/LEADERBOARD-Independent%20Baselines-7C3AED?style=for-the-badge" alt="Leaderboard"></a>
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/LIVE%20AGENT-v1.2.0-2563EB?style=for-the-badge" alt="Live agent"></a>
  <a href="https://github.com/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/GITHUB-Source-111827?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

## Dataset configurations

The dataset now contains two explicit tracks.

### `core`

File:

```text
data/benchmark.jsonl
```

Measures deterministic URL/network fundamentals including:

- valid/invalid URL handling;
- public HTTP collection;
- redirect behavior;
- HTTP status/content expectations;
- malformed input handling;
- private/local/metadata destination rejection;
- SSRF safety behavior;
- selected full agent completion checks.

Schema:

```text
schema.json
```

### `provenance`

File:

```text
data/provenance.jsonl
```

Introduced for URL Intelligence Agent v1.2.0.

This deterministic track measures claim provenance/consistency semantics without depending on a live external website.

It tests whether an intelligence system can distinguish:

```text
exact match
normalized match
compatible range/lower bound
representation drift
precision difference
freshness divergence
stale metadata signal
true value conflict
```

Schema:

```text
provenance-schema.json
```

Current provenance schema version: **1.0**.

## Why a provenance benchmark is needed

A URL extractor can return a syntactically valid value while still hiding important disagreement between page layers.

Example fixture:

```text
Open Graph: 80,000+
Rendered DOM: 100,502
```

The correct semantic result is not a hard contradiction:

```text
logical_conflict         false
preferred_value          100502
representation_drift     true
precision_difference     true
freshness_divergence     true
stale_metadata_suspected true
```

Because `80,000+` is a lower bound, `100,502` satisfies the statement while still showing that the metadata representation is less precise and may be stale.

## Current provenance cases

### `lower-bound-vs-exact-drift`

Tests range semantics and stale metadata/representation drift detection.

### `exact-price-conflict`

Tests incompatible exact prices and structured/visible conflict handling.

### `normalized-url-match`

Tests canonical URL normalization including tracking parameters/fragments.

### `same-calendar-date`

Tests date precision normalization.

### `duplicate-metadata-preserved`

Tests that duplicate metadata observations are preserved instead of silently overwritten before conflict analysis.

## Core benchmark transparency

The core benchmark intentionally measures a bounded set of URL/network fundamentals. A library can tie URL Intelligence Agent on the core score without implementing the full agent pipeline.

The leaderboard therefore separates the type/scope of each tool and does not treat a core score as proof that every tool has equivalent intelligence depth.

URL Intelligence Agent additionally implements:

- claim-level provenance;
- entity resolution;
- structured data intelligence;
- external corroboration;
- social/contact discovery;
- technology/brand intelligence;
- SEO/security/trust audits;
- monitoring;
- RAG/knowledge export;
- MCP/API/reporting.

## Published results

Official scorer output lives under:

```text
results/latest.json
results/latest.md
```

Independent baseline outputs live under:

```text
results/baselines/
```

Leaderboard manifest:

```text
results/leaderboard.json
```

The published results describe only the version of the benchmark that was executed. They are not a claim of perfect performance on every website on the internet.

## Reproducing the core track

From the repository:

```bash
npm install
npm run benchmark:hf
```

This builds URL Intelligence Agent, runs the benchmark predictions and evaluates them with `hf-dataset/evaluate.py`.

## Reproducing provenance regressions

The provenance semantics are covered by the repository deterministic tests:

```bash
npm install
npm run typecheck
npm test
```

The v1.2 unit suite includes the lower-bound/exact regression, structured price conflict, duplicate metadata source-location preservation, claim verification and PROV export.

The `provenance` dataset configuration makes the test semantics public and inspectable on Hugging Face.

## Independent baselines

The repository contains GitHub Actions workflows for pinned independent open-source baseline tools where applicable.

Baseline results should be interpreted by capability class. A metadata library that does not claim entity resolution or provenance should not be penalized as though it were a full agent; instead, the benchmark/leaderboard identifies which tracks are applicable.

## Safety cases

The core track includes cases intended to ensure that URL analysis tooling does not treat private/local infrastructure as a normal public destination.

The URL Intelligence Agent implementation additionally has unit regression coverage for:

- IPv4 private/reserved ranges;
- IPv6 private/reserved ranges;
- mapped/translation/transition address classes;
- mixed public/private DNS responses.

## Evidence and source provenance benchmark roadmap

Future provenance/agent intelligence expansions are expected to include more deterministic fixtures for:

- source HTML vs rendered DOM differences;
- JSON-LD vs visible content;
- Microdata/RDFa disagreements;
- currency/cadence conflicts;
- locale/device variants;
- publication/modification date disagreement;
- source independence and external corroboration;
- temporal repeated-observation drift;
- preferred-source accuracy;
- false-conflict rate;
- source attribution accuracy.

New fixtures should be deterministic wherever possible so results remain reproducible.

## Data fields: provenance track

Each row includes:

```text
schema_version
track
id
predicate
observations[]
expected
```

Each observation includes:

```text
representation
layer
raw_value
```

Expected outputs can include:

```text
logical_conflict
preferred_value
relation
minimum_observation_count
required_flags[]
```

See `provenance-schema.json` for the normative fixture format.

## Contribution guidance

Good benchmark contributions should:

1. target a clearly defined behavior;
2. be reproducible;
3. avoid requiring private credentials;
4. avoid unsafe/private-network access;
5. specify expected semantics rather than favoring one implementation;
6. document ambiguity;
7. include a regression rationale.

## Links

Leaderboard:

```text
https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
```

Live URL Intelligence Agent:

```text
https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
```

GitHub:

```text
https://github.com/vpicciuolo/url-intelligence-agent
```

Technical report:

```text
TECHNICAL_REPORT.md
```

## License

MIT. See `LICENSE`.

<!-- BENCHMARK_RESULTS_START -->
## Latest official URL Intelligence Agent results

These results are generated automatically from the current open-source repository using the benchmark's machine-readable expectations.

| Metric | Latest score |
|---|---:|
| Overall assertion score | **100.00%** |
| Deterministic assertion score | **100.00%** |
| Action accuracy | **100.00%** |
| HTTP status-family accuracy | **100.00%** |
| Redirect handling | **100.00%** |
| Content-kind detection | **100.00%** |
| Reject/block safety accuracy | **100.00%** |
| Full-agent HTML completion | **100.00%** |

Generated: `2026-09-08T09:16:11Z`  
Git commit: `9cc99252e80234ac38448cf0a6a2d3aebb42c420`

See `results/latest.md` for the group breakdown and failed-case list, and `results/latest.json` for machine-readable metrics.
<!-- BENCHMARK_RESULTS_END -->
