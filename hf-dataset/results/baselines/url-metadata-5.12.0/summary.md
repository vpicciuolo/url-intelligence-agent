# URL Intelligence Benchmark Results

Generated: **2026-09-07T22:36:10Z**  
Benchmark cases: **55**  
Overall assertion score: **89.17%**  
Deterministic assertion score: **87.85%**

| Metric | Passed | Total | Score |
|---|---:|---:|---:|
| Action accuracy | 42 | 55 | 76.36% |
| HTTP status-family accuracy | 35 | 35 | 100.00% |
| Redirect handling | 4 | 4 | 100.00% |
| Content-kind detection | 26 | 26 | 100.00% |
| Case pass rate | 42 | 55 | 76.36% |
| Deterministic case pass rate | 37 | 50 | 74.00% |
| Reject/block safety accuracy | 13 | 18 | 72.22% |
| Full-agent HTML completion | 0 | 0 | n/a |

## Group results

| Group | Passed | Total | Score |
|---|---:|---:|---:|
| `api_response` | 1 | 1 | 100.00% |
| `http_status` | 4 | 12 | 33.33% |
| `image` | 1 | 1 | 100.00% |
| `invalid_url` | 2 | 4 | 50.00% |
| `normalization` | 8 | 8 | 100.00% |
| `redirect` | 4 | 4 | 100.00% |
| `repository` | 1 | 1 | 100.00% |
| `robots` | 1 | 1 | 100.00% |
| `scheme_upgrade` | 1 | 1 | 100.00% |
| `space` | 1 | 1 | 100.00% |
| `ssrf` | 9 | 10 | 90.00% |
| `structured_document` | 1 | 1 | 100.00% |
| `tracking_params` | 1 | 1 | 100.00% |
| `unicode` | 1 | 1 | 100.00% |
| `unsupported_scheme` | 2 | 4 | 50.00% |
| `web_page` | 4 | 4 | 100.00% |

## Failed cases

- `status-400` — action
- `status-401` — action
- `status-403` — action
- `status-404` — action
- `status-418` — action
- `status-429` — action
- `status-500` — action
- `status-503` — action
- `invalid-001` — action
- `invalid-002` — action
- `invalid-005` — action
- `invalid-007` — action
- `ssrf-008` — action

> Scores are produced by running the repository's real URL fetching/safety code. Selected public HTML cases also execute the full `investigate()` pipeline with a one-page benchmark crawl. Live-web cases can vary when upstream services change or rate-limit requests.
