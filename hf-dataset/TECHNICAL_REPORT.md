# URL Intelligence Benchmark — Technical Report

**Version:** v0.1 seed release  
**Author:** Vincenzo Picciuolo / HRN Innovation Technologies Ltd  
**Project:** URL Intelligence Agent  
**Dataset:** https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark  
**Leaderboard:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard

## Abstract

URL-analysis and web-intelligence systems often combine network fetching, URL parsing, metadata extraction, redirect handling and safety controls, but their quality is commonly demonstrated through isolated examples rather than reproducible evaluation. The URL Intelligence Benchmark introduces a public set of versioned test vectors for evaluating core URL-analysis behavior under a shared machine-readable scoring scheme.

The v0.1 seed release contains 55 cases spanning public web pages, structured responses, HTTP status families, redirects, normalization, malformed input, unsupported schemes and SSRF/private-network safety. The benchmark is designed primarily as a reproducible regression and interoperability suite. It is not a training corpus and does not claim to represent the complete distribution of the public web.

## 1. Evaluation objectives

The benchmark measures whether a URL-analysis implementation can:

1. classify whether an input should be analyzed, rejected or blocked;
2. report HTTP status families correctly where applicable;
3. follow and report redirect chains;
4. identify broad response/content kinds;
5. normalize and parse common URL variants safely;
6. reject malformed or unsupported URL schemes; and
7. prevent requests to loopback, private, link-local, cloud-metadata and related unsafe targets.

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

## 6. Reference baseline

The current open-source URL Intelligence Agent is continuously evaluated by GitHub Actions against the published benchmark. At the time of this report, the verified v0.1 run reports:

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
| Full-agent HTML completion | 100.00% |

These numbers describe performance on the current benchmark revision only. They are not a claim of perfect accuracy across the entire public web.

## 7. Reproducibility

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

## 8. Threats to validity

The v0.1 release is intentionally a seed suite and has several limitations:

- 55 cases cannot represent the full diversity of the public web;
- some cases rely on third-party public endpoints;
- live pages may change independently of the benchmark;
- current scoring emphasizes deterministic URL/network behavior rather than semantic correctness of all extracted intelligence;
- current baselines are limited; and
- the benchmark owner also develops the initial reference implementation.

These limitations are stated explicitly to avoid over-interpreting early benchmark scores.

## 9. v1.0 roadmap

The intended v1.0 benchmark will increase external validity through:

- broader real-world URL distributions;
- more adversarial parsing and redirect cases;
- additional SSRF/address-representation cases;
- richer metadata and structured-data expectations;
- independent open-source baselines;
- community submissions;
- frozen/versioned evaluation releases; and
- documented change-control rules for benchmark expectations.

## 10. Open benchmark policy

The benchmark is MIT-licensed and intended to be reusable by other URL-analysis tools, agent frameworks and research projects. Contributions should improve coverage without introducing unsafe behavior, benchmark leakage or test cases whose expected behavior cannot be independently justified.

## Resources

- Dataset: https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
- Leaderboard: https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
- Live Agent: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
- Collection: https://huggingface.co/collections/vpicciuolo/url-intelligence-open-source-stack-6a9f3a0ff61aeb8e3cf1b4e0
- GitHub: https://github.com/vpicciuolo/url-intelligence-agent
