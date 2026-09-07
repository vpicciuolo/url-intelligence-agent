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
- seo
- metadata
- ssrf
configs:
- config_name: default
  data_files:
  - split: test
    path: data/benchmark.jsonl
---

# URL Intelligence Benchmark

A public, reproducible benchmark for evaluating URL analysis, web metadata extraction, redirect handling, content-type detection, URL normalization, and network-safety behavior.

Built for the open-source **URL Intelligence Agent** by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.

- GitHub: https://github.com/vpicciuolo/url-intelligence-agent
- Live demo: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent

## Why this dataset exists

URL analysis systems are often evaluated with ad-hoc examples. This benchmark provides a versioned set of test cases with explicit expected behavior so releases can be compared consistently.

The benchmark is intended for:

- URL intelligence agents and MCP servers
- metadata and Open Graph analyzers
- SEO and social-preview tooling
- redirect and HTTP-status handling
- URL canonicalization and normalization
- content-type detection
- SSRF and private-network safety checks

It is **not** a training corpus and it is **not** a scraped dump of web content.

## v0.1 seed release

The first release contains **55 test cases** across these groups:

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

Cases whose `expected_action` is `block` or `reject` are **test vectors**. A compliant analyzer should classify them without dereferencing local files, executing URL schemes, or making requests to loopback, link-local, cloud-metadata, or RFC1918/private-network targets.

In particular, the SSRF cases are intentionally included to verify that an agent refuses unsafe outbound fetches.

## Loading with 🤗 Datasets

```python
from datasets import load_dataset

ds = load_dataset("vpicciuolo/url-intelligence-benchmark", split="test")
print(ds[0])
```

## Running the included scorer

Export your analyzer's results as JSONL with at least:

```json
{"id":"web-001","action":"analyze","initial_status":200,"redirect_count":0,"content_kind":"html"}
```

Then run:

```bash
python evaluate.py predictions.jsonl
```

The scorer reports action accuracy plus status-family, redirect, and content-kind accuracy where those expectations are defined.

## Versioning policy

Benchmark IDs remain stable within a major version. Cases may be added over time. Live-web cases are marked `deterministic: false` where upstream metadata or redirect behavior can legitimately change.

For release comparisons, pin the Hugging Face dataset revision/commit.

## License

MIT. See `LICENSE`.

## Project

**URL Intelligence Agent** is an open-source URL analysis and web-intelligence agent with a live Hugging Face Space and MCP-compatible workflows.

GitHub: https://github.com/vpicciuolo/url-intelligence-agent  
Hugging Face Space: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
