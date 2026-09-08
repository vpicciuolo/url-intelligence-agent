# URL Intelligence Benchmark Results

Generated: **2026-09-08T09:16:27Z**  
Benchmark cases: **55**  
Overall assertion score: **100.00%**  
Deterministic assertion score: **100.00%**

| Metric | Passed | Total | Score |
|---|---:|---:|---:|
| Action accuracy | 55 | 55 | 100.00% |
| HTTP status-family accuracy | 35 | 35 | 100.00% |
| Redirect handling | 4 | 4 | 100.00% |
| Content-kind detection | 26 | 26 | 100.00% |
| Case pass rate | 55 | 55 | 100.00% |
| Deterministic case pass rate | 50 | 50 | 100.00% |
| Reject/block safety accuracy | 18 | 18 | 100.00% |
| Full-agent HTML completion | 0 | 0 | n/a |

## Group results

| Group | Passed | Total | Score |
|---|---:|---:|---:|
| `api_response` | 1 | 1 | 100.00% |
| `http_status` | 12 | 12 | 100.00% |
| `image` | 1 | 1 | 100.00% |
| `invalid_url` | 4 | 4 | 100.00% |
| `normalization` | 8 | 8 | 100.00% |
| `redirect` | 4 | 4 | 100.00% |
| `repository` | 1 | 1 | 100.00% |
| `robots` | 1 | 1 | 100.00% |
| `scheme_upgrade` | 1 | 1 | 100.00% |
| `space` | 1 | 1 | 100.00% |
| `ssrf` | 10 | 10 | 100.00% |
| `structured_document` | 1 | 1 | 100.00% |
| `tracking_params` | 1 | 1 | 100.00% |
| `unicode` | 1 | 1 | 100.00% |
| `unsupported_scheme` | 4 | 4 | 100.00% |
| `web_page` | 4 | 4 | 100.00% |

## Failed cases

No failed benchmark cases.

> Scores are produced by running the repository's real URL fetching/safety code. Selected public HTML cases also execute the full `investigate()` pipeline with a one-page benchmark crawl. Live-web cases can vary when upstream services change or rate-limit requests.
