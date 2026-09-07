# URL Intelligence Benchmark — Technical Report

**Version:** v0.1 seed release  
**Author:** Vincenzo Picciuolo / HRN Innovation Technologies Ltd  
**Project:** URL Intelligence Agent  
**Dataset:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark  
**Leaderboard:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard

## Abstract

URL-analysis and web-intelligence systems often combine network fetching, URL parsing, metadata extraction, redirect handling and safety controls, but their quality is commonly demonstrated through isolated examples rather than reproducible evaluation. The URL Intelligence Benchmark introduces a public set of versioned test vectors for evaluating core URL-analysis behavior under a shared machine-readable scoring scheme.

The v0.1 seed release contains 55 cases and 120 scored assertions spanning public web pages, structured responses, HTTP status families, redirects, normalization, malformed input, unsupported schemes and SSRF/private-network safety. The benchmark is designed primarily as a reproducible regression and interoperability suite. It is not a training corpus and does not claim to represent the complete distribution of the public web.

Independent open-source baselines are executed automatically from pinned upstream package versions. Their raw predictions, scorer outputs and adapter metadata are published with the Dataset so results can be inspected rather than accepted as manually entered leaderboard claims.

## 1. Evaluation objectives

The v0.1 core benchmark measures whether a URL-analysis implementation can:

1. classify whether an input should be analyzed, rejected or blocked;
2. report HTTP status families correctly where applicable;
3. follow and report redirect chains;
4. identify broad response/content kinds;
5. normalize and parse common URL variants safely;
6. reject malformed or unsupported URL schemes; and
7. prevent requests to loopback, private, link-local, cloud-metadata and related unsafe targets.

The selected reference-agent runner additionally records whether the full URL Intelligence Agent `investigate()` pipeline completes on a small set of eligible HTML cases. That signal is reported separately from the core assertion score because metadata/network libraries do not implement an equivalent full-agent pipeline.

## 2. Benchmark structure

Each test case contains a stable `id`, input `url`, semantic `group`, `difficulty`, expected action, optional status-family expectation, redirect minimum, expected content kind, security class, determinism flag and required capability checks.

The current groups include:

- public web pages, repositories and Spaces;
- APIs, XML/structured documents, images and robots.txt;
- redirect and scheme-upgrade cases;
- explicit 2xx, 3xx, 4xx and 5xx endpoints;
- normalization, tracking-parameter and Unicode cases;
- malformed URLs and unsupported schemes; and
- SSRF/private-network vectors.

## 3. Deterministic and live-web cases

The benchmark distinguishes deterministic cases from live-web cases whose upstream metadata or behavior can legitimately change. This distinction allows regression comparisons to report a deterministic score separately from the full live-web score.

For longer-term comparisons, evaluators should pin the exact Hugging Face dataset revision used during the run.

## 4. Safety methodology

Safety test vectors are intended to verify refusal behavior without dereferencing unsafe targets. Inputs include unsupported schemes, local file URLs, loopback addresses, private address ranges, link-local/cloud-metadata targets and alternative address representations.

A compliant implementation should classify these inputs before unsafe network activity occurs.

For leaderboard ranking, v0.1 applies a hard safety gate: an entry must achieve **100% reject/block safety action accuracy** to receive an official rank. This prevents a high transport score from compensating for unsafe URL handling.

The benchmark does not perform penetration testing and is not a vulnerability scanner.

## 5. Metrics

The reference scorer reports:

- overall assertion score;
- deterministic assertion score;
- action accuracy;
- HTTP status-family accuracy;
- redirect handling;
- content-kind detection;
- reject/block safety accuracy;
- full-agent HTML completion where supplied by the runner;
- case pass rate; and
- per-group pass rates.

Metrics are intentionally decomposed rather than collapsed into a single opaque quality number.

## 6. Reference implementation result

The open-source URL Intelligence Agent is continuously evaluated by GitHub Actions against the published benchmark. The verified v0.1 reference run reports:

| Metric | Result |
|---|---:|
| Benchmark cases | 55 / 55 |
| Scored assertions | 120 / 120 |
| Overall assertion score | 100.00% |
| Deterministic assertion score | 100.00% |
| Action accuracy | 100.00% |
| HTTP status-family accuracy | 100.00% |
| Redirect handling | 100.00% |
| Content-kind detection | 100.00% |
| Reject/block safety accuracy | 100.00% |
| Selected full-agent HTML completion | 6 / 6 — 100.00% |

These numbers describe performance on the current benchmark revision only. They are not a claim of perfect accuracy across the entire public web.

## 7. Independent open-source baselines

Two external open-source libraries are now run automatically from clean installs using pinned public releases. The benchmark adapter does not modify upstream source. It translates documented public API outputs and native error semantics into the common benchmark prediction schema.

| Tool | Type | Core score | Safety | HTTP status | Redirects | Content kind | Full-agent track |
|---|---|---:|---:|---:|---:|---:|---:|
| **URL Intelligence Agent** | Full agent / MCP | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **6/6 — 100%** |
| **url-metadata 5.12.0** | Metadata/network library | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | N/A |
| **link-preview-js 5.0.0** | Link-preview library | **71.67%** | **100.00%** | **17.14%** | **75.00%** | **84.62%** | N/A |

### Baseline adapter notes

**url-metadata 5.12.0** is exercised through its network-only probe (`fields: ['network']`) with its built-in request-filtering-agent safety controls. The library reports non-2xx HTTP responses as exceptions carrying the response status. The adapter normalizes such responses to `action=analyze` because an HTTP response was successfully obtained; it does not invent a status or bypass upstream behavior.

**link-preview-js 5.0.0** is exercised through `getLinkPreview()` with its documented `resolveDNSHost` SSRF protection and manual redirect validation. Its public result does not expose HTTP response status, so status-family assertions are not inferred. Unsupported schemes and private-network refusals are mapped to the benchmark's `reject`/`block` taxonomy when the upstream library has already refused the input.

Raw prediction JSONL, machine-readable summaries and human-readable summaries are published under `results/baselines/`.

### What the independent results reveal

The tie between URL Intelligence Agent and `url-metadata` on the **v0.1 core score is an important benchmark finding, not something to hide**. It demonstrates that the current 55-case suite is effective at measuring transport, URL handling and network-safety fundamentals, but it is not yet sufficient to distinguish a full web-intelligence agent from a strong metadata/network library.

Therefore the v0.1 leaderboard should be interpreted as a **core URL/network interoperability and safety benchmark**. Full-agent capability is currently reported as a separate signal rather than being mixed into the core score.

This independent result directly motivates the semantic and agent-specific tracks planned for v0.2 and v1.0.

## 8. Ranking policy

An entry receives a numerical leaderboard rank only when reject/block safety accuracy is 100%.

Among safety-qualified entries:

1. entries are ordered by overall core assertion score;
2. equal overall scores share the same rank; and
3. full-agent completion is displayed separately and is not imputed for libraries that do not implement an agent pipeline.

This avoids unfairly scoring a metadata library as though it were expected to perform entity resolution, corroboration or agent orchestration that is outside its stated scope.

## 9. Reproducibility

A benchmark submission should publish:

- tool or agent name;
- exact release/tag/commit;
- exact benchmark revision;
- generated JSONL prediction file;
- scorer output;
- reproduction command;
- external services or paid APIs used; and
- caching behavior.

The public leaderboard submission form is available at:

https://github.com/vpicciuolo/url-intelligence-agent/issues/new?template=benchmark-submission.yml

The two maintained independent baselines are also reproducible through the repository's GitHub Actions workflow and pinned npm package versions.

## 10. Threats to validity

The v0.1 release is intentionally a seed suite and has several limitations:

- 55 cases cannot represent the full diversity of the public web;
- some cases rely on third-party public endpoints;
- live pages may change independently of the benchmark;
- current scoring strongly emphasizes deterministic URL/network behavior;
- semantic correctness of extracted entities, claims and evidence is not yet part of the core score;
- the initial independent baseline set contains two libraries rather than a broad cross-section of full agents, crawlers and commercial systems; and
- the benchmark owner also develops the initial reference implementation.

The `url-metadata` 100% core result provides concrete evidence of this scope limitation: a high-quality metadata/network library can satisfy every current v0.1 core assertion without implementing the deeper intelligence features of the reference agent.

These limitations are stated explicitly to avoid over-interpreting early benchmark scores.

## 11. v0.2 / v1.0 roadmap

The next benchmark versions should add deterministic tracks that measure capabilities beyond transport fundamentals, including:

- exact title, description, canonical and Open Graph extraction;
- structured-data / Schema.org extraction correctness;
- URL canonicalization outputs rather than only successful handling;
- entity-name and entity-type resolution;
- social-profile discovery and direct verification;
- external-source discovery and source provenance;
- independent-domain corroboration coverage;
- contradiction detection and preservation;
- technology detection;
- SEO/security/trust observation accuracy;
- brand and domain intelligence;
- deterministic local fixtures for malformed HTML, encoding, gzip/brotli, redirect loops and large bodies;
- additional SSRF and alternate address-representation cases;
- additional independent full-agent and crawler baselines;
- community submissions;
- frozen/versioned evaluation releases; and
- documented change-control rules for benchmark expectations.

A future **Agent Intelligence track** should be scored independently from the core URL/network track so specialized libraries can still be compared fairly within their scope while full agents can be differentiated on deeper capabilities.

## 12. Open benchmark policy

The benchmark is MIT-licensed and intended to be reusable by other URL-analysis tools, agent frameworks and research projects. Contributions should improve coverage without introducing unsafe behavior, benchmark leakage or test cases whose expected behavior cannot be independently justified.

## Resources

- Dataset: https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
- Leaderboard: https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
- Live Agent: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
- Collection: https://huggingface.co/collections/vpicciuolo/url-intelligence-open-source-stack-6a9f3a0ff61aeb8e3cf1b4e0
- GitHub: https://github.com/vpicciuolo/url-intelligence-agent
