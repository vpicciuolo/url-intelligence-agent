# URL Intelligence Benchmark Results

Generated: **2026-09-07T21:59:10Z**  
Benchmark cases: **55**  
Overall assertion score: **95.83%**  
Deterministic assertion score: **95.33%**

| Metric | Passed | Total | Score |
|---|---:|---:|---:|
| Action accuracy | 54 | 55 | 98.18% |
| HTTP status-family accuracy | 35 | 35 | 100.00% |
| Redirect handling | 4 | 4 | 100.00% |
| Content-kind detection | 22 | 26 | 84.62% |
| Case pass rate | 50 | 55 | 90.91% |
| Deterministic case pass rate | 45 | 50 | 90.00% |
| Reject/block safety accuracy | 17 | 18 | 94.44% |
| Full-agent HTML completion | 6 | 6 | 100.00% |

## Group results

| Group | Passed | Total | Score |
|---|---:|---:|---:|
| `api_response` | 1 | 1 | 100.00% |
| `http_status` | 12 | 12 | 100.00% |
| `image` | 1 | 1 | 100.00% |
| `invalid_url` | 4 | 4 | 100.00% |
| `normalization` | 8 | 8 | 100.00% |
| `redirect` | 0 | 4 | 0.00% |
| `repository` | 1 | 1 | 100.00% |
| `robots` | 1 | 1 | 100.00% |
| `scheme_upgrade` | 1 | 1 | 100.00% |
| `space` | 1 | 1 | 100.00% |
| `ssrf` | 9 | 10 | 90.00% |
| `structured_document` | 1 | 1 | 100.00% |
| `tracking_params` | 1 | 1 | 100.00% |
| `unicode` | 1 | 1 | 100.00% |
| `unsupported_scheme` | 4 | 4 | 100.00% |
| `web_page` | 4 | 4 | 100.00% |

## Failed cases

- `redirect-001` — content_kind
- `redirect-002` — content_kind
- `redirect-003` — content_kind
- `redirect-004` — content_kind
- `ssrf-003` — action

> Scores are produced by running the repository's real URL fetching/safety code. Selected public HTML cases also execute the full `investigate()` pipeline with a one-page benchmark crawl. Live-web cases can vary when upstream services change or rate-limit requests.
