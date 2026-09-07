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
- mcp
- ai-agent
- web-crawler
- seo
- metadata
- ssrf
- safety
- evaluation
configs:
- config_name: default
  data_files:
  - split: test
    path: data/benchmark.jsonl
---

# 📊 URL Intelligence Benchmark

### A public benchmark for URL analysis agents, MCP servers and web-intelligence tools.

The **URL Intelligence Benchmark** evaluates whether an analyzer can safely and correctly handle public URLs, redirects, HTTP status behavior, content types, normalization, malformed inputs and SSRF/private-network cases.

It is designed as a **reproducible evaluation asset**, not a training corpus and not a scraped web dump.

<p align="center">
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard"><img src="https://img.shields.io/badge/LEADERBOARD-Open-7C3AED?style=for-the-badge" alt="Leaderboard"></a>
  <a href="https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/LIVE%20AGENT-Try-2563EB?style=for-the-badge" alt="Live agent"></a>
  <a href="https://github.com/vpicciuolo/url-intelligence-agent"><img src="https://img.shields.io/badge/GITHUB-Source-111827?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

Built by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd** as part of the open-source **URL Intelligence Agent** project.

- Dataset: https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
- Leaderboard: https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
- Live agent: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
- Source: https://github.com/vpicciuolo/url-intelligence-agent

## Why this benchmark exists

URL-analysis tools are often evaluated with ad-hoc examples that are difficult to reproduce. This dataset provides versioned test vectors with explicit expected behavior so releases and competing tools can be evaluated consistently.

It targets:

- URL intelligence agents
- MCP servers and agent tools
- metadata and Open Graph analyzers
- SEO and social-preview tooling
- redirect and HTTP-status handling
- URL parsing and normalization
- content-type detection
- SSRF and private-network protection

## v0.1 seed release

The current release contains **55 cases** across these groups:

| Group | Purpose |
|---|---|
| `web_page` / `repository` / `space` | Public web analysis |
| `api_response` / `structured_document` / `image` / `robots` | Content-type handling |
| `redirect` / `scheme_upgrade` | Redirect-chain behavior |
| `http_status` | 2xx, 3xx, 4xx and 5xx classification |
| `normalization` / `tracking_params` / `unicode` | URL parsing and canonicalization |
| `invalid_url` / `unsupported_scheme` | Input validation |
| `ssrf` | Loopback, private, link-local and obfuscated-address protection |

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

Generated: `2026-09-07T22:01:37Z`  
Git commit: `ef7c5321c1a09e4d3808465c644cf5732dac91d2`

See `results/latest.md` for the group breakdown and failed-case list, and `results/latest.json` for machine-readable metrics.
<!-- BENCHMARK_RESULTS_END -->

The published score is scoped to this benchmark version. It is not a claim that any tool has perfect accuracy on every website on the internet.

## 🏆 Community leaderboard

The benchmark is being opened to other URL-analysis tools and agents.

**Leaderboard:** https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard

A submission should identify the tool, version/commit, public source or reproducible runner, benchmark revision and generated predictions. Results should be reproducible from a public repository whenever possible.

### Submit a tool

1. Fork or clone the benchmark source from GitHub.
2. Generate one prediction per benchmark `id`.
3. Run the included scorer.
4. Open a **Benchmark Submission** issue in the GitHub repository.
5. Include your public source/repository, version, prediction file and scorer output.

Submission entry point:

https://github.com/vpicciuolo/url-intelligence-agent/issues/new?template=benchmark-submission.yml

Community results are reviewed before being added to the public leaderboard. The benchmark owner may rerun submissions to verify reproducibility.

## Record schema

Each JSONL record contains:

- `id` — stable benchmark case ID
- `url` — input URL/string
- `group` — benchmark category
- `difficulty` — `easy`, `medium`, or `hard`
- `expected_action` — `analyze`, `reject`, or `block`
- `expected_initial_status_family` — expected HTTP status family when applicable
- `expected_redirects_min` — minimum redirect count when applicable
- `expected_content_kind` — expected broad response type when applicable
- `security_class` — public, invalid, loopback, private-network, etc.
- `deterministic` — whether the case is expected to remain stable over time
- `required_checks` — capabilities an analyzer should exercise
- `notes` — benchmark guidance

The machine-readable JSON Schema is available in `schema.json`.

## Safety semantics

Cases whose `expected_action` is `block` or `reject` are **test vectors**. A compliant analyzer should classify them without dereferencing local files, executing URL schemes, or making requests to loopback, link-local, cloud-metadata or RFC1918/private-network targets.

The SSRF cases intentionally test whether unsafe outbound targets are refused before a network request is made.

## Loading with 🤗 Datasets

```python
from datasets import load_dataset

ds = load_dataset("vpicciuolo/url-intelligence-benchmark", split="test")
print(ds[0])
```

## Running the scorer

Export analyzer results as JSONL with at least:

```json
{"id":"web-001","action":"analyze","initial_status":200,"redirect_count":0,"content_kind":"html"}
```

Then run:

```bash
python evaluate.py predictions.jsonl
```

The scorer reports action accuracy plus status-family, redirect and content-kind accuracy where expectations are defined.

## Reproducibility rules

For leaderboard submissions:

- Pin the benchmark revision used for the run.
- Identify the exact tool version, release or commit.
- Do not manually edit predictions after execution.
- Disclose required external services or paid APIs.
- Disclose whether network responses were cached.
- Keep safety vectors non-destructive: unsafe URLs must never be dereferenced.
- Prefer open-source runners so results can be independently reproduced.

## Versioning policy

Benchmark IDs remain stable within a major version. Cases may be added over time. Live-web cases are marked `deterministic: false` where upstream behavior can legitimately change.

For release comparisons, pin the Hugging Face dataset revision/commit.

### Roadmap to v1.0

The v0.1 suite is a seed/regression benchmark. The v1.0 target is to expand coverage with more real-world URL patterns, independent baselines, community submissions, additional safety cases and a frozen evaluation release suitable for longer-term comparisons.

## License

MIT. See `LICENSE`.

## Project

**URL Intelligence Agent** is an open-source evidence-first URL analysis and web-intelligence agent with a live Hugging Face Space, public benchmark, Remote MCP and self-hosted runtime.

GitHub: https://github.com/vpicciuolo/url-intelligence-agent  
Live Space: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent  
Leaderboard: https://huggingface.co/spaces/vpicciuolo/url-intelligence-benchmark-leaderboard
