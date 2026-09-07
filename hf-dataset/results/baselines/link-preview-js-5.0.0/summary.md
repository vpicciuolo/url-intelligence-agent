# URL Intelligence Benchmark Results

Generated: **2026-09-07T22:40:21Z**  
Benchmark cases: **55**  
Overall assertion score: **71.67%**  
Deterministic assertion score: **72.90%**

| Metric | Passed | Total | Score |
|---|---:|---:|---:|
| Action accuracy | 55 | 55 | 100.00% |
| HTTP status-family accuracy | 6 | 35 | 17.14% |
| Redirect handling | 3 | 4 | 75.00% |
| Content-kind detection | 22 | 26 | 84.62% |
| Case pass rate | 23 | 55 | 41.82% |
| Deterministic case pass rate | 23 | 50 | 46.00% |
| Reject/block safety accuracy | 18 | 18 | 100.00% |
| Full-agent HTML completion | 0 | 0 | n/a |

## Group results

| Group | Passed | Total | Score |
|---|---:|---:|---:|
| `api_response` | 0 | 1 | 0.00% |
| `http_status` | 2 | 12 | 16.67% |
| `image` | 0 | 1 | 0.00% |
| `invalid_url` | 4 | 4 | 100.00% |
| `normalization` | 0 | 8 | 0.00% |
| `redirect` | 3 | 4 | 75.00% |
| `repository` | 0 | 1 | 0.00% |
| `robots` | 0 | 1 | 0.00% |
| `scheme_upgrade` | 0 | 1 | 0.00% |
| `space` | 0 | 1 | 0.00% |
| `ssrf` | 10 | 10 | 100.00% |
| `structured_document` | 0 | 1 | 0.00% |
| `tracking_params` | 0 | 1 | 0.00% |
| `unicode` | 0 | 1 | 0.00% |
| `unsupported_scheme` | 4 | 4 | 100.00% |
| `web_page` | 0 | 4 | 0.00% |

## Failed cases

- `web-001` — status_family
- `web-002` — status_family
- `web-003` — status_family
- `web-004` — status_family
- `web-005` — status_family
- `web-006` — status_family
- `web-007` — status_family
- `web-008` — status_family
- `web-009` — status_family
- `web-010` — status_family
- `redirect-002` — redirects, content_kind
- `redirect-005` — content_kind
- `status-200` — status_family
- `status-204` — status_family, content_kind
- `status-400` — status_family
- `status-401` — status_family
- `status-403` — status_family
- `status-404` — status_family
- `status-418` — status_family
- `status-429` — status_family
- `status-500` — status_family
- `status-503` — status_family
- `norm-001` — status_family
- `norm-002` — status_family
- `norm-003` — status_family
- `norm-004` — status_family
- `norm-005` — status_family
- `norm-006` — status_family
- `norm-007` — content_kind
- `norm-008` — status_family
- …and 2 more

> Scores are produced by running the repository's real URL fetching/safety code. Selected public HTML cases also execute the full `investigate()` pipeline with a one-page benchmark crawl. Live-web cases can vary when upstream services change or rate-limit requests.
