# Contributing

Contributions are welcome.

Useful areas include URL safety, deterministic extraction, claim provenance, semantic normalization, conflict/drift resolution, structured data, entity resolution, technology detection, social/profile verification, benchmarks, MCP interoperability, report UX and deployment hardening.

## Before submitting a pull request

Run:

```bash
npm install
npm run typecheck
npm test
npm run test:provenance-fixtures
```

Then verify:

1. new deterministic behavior has regression tests;
2. evidence is preserved before resolution rather than silently overwritten;
3. a value difference is not automatically treated as a contradiction;
4. source layer/representation is retained for new provenance fields;
5. AI inference remains optional where deterministic behavior is practical;
6. no behavior bypasses authentication, CAPTCHAs or access controls;
7. network-facing changes preserve the SSRF/DNS-rebinding threat model;
8. browser rendering changes preserve the separate browser trust-boundary documentation;
9. public output changes are reflected in `VERSIONING.md`, `CHANGELOG.md` and relevant docs;
10. new benchmark fixtures define expected semantics clearly and reproducibly.

## Provenance contributions

When adding an evidence source, prefer producing an `EvidenceObservation` with:

```text
subject
predicate
rawValue
normalizedValue
source representation/layer
property/locator/JSON pointer when available
timestamps
integrity hash
quality dimensions
```

Do not collapse duplicate observations before the claim resolver has had the opportunity to compare them.

When adding a comparator/normalizer, add cases that cover both true conflict and false-conflict prevention.

Good examples:

```text
80,000+ vs 100,502 → compatible range + drift, not hard conflict
$49 vs $59          → exact price conflict
URL + UTM vs clean  → normalized URL match
```

## Benchmark contributions

Core URL/network records belong in:

```text
hf-dataset/data/benchmark.jsonl
```

Claim provenance/consistency records belong in:

```text
hf-dataset/data/provenance.jsonl
```

Validate provenance fixtures with:

```bash
python3 hf-dataset/validate_provenance.py
```

Do not change expected benchmark behavior simply to preserve the score of URL Intelligence Agent.

## Security contributions

For untrusted URL collection, preserve:

- public HTTP/HTTPS validation;
- preflight DNS validation;
- connect-time guarded DNS resolution;
- mixed-answer rejection;
- redirect revalidation;
- bounded time/bytes/redirects.

Playwright/browser traffic is a different boundary from the guarded Undici transport. Application-level browser interception is defense in depth, not infrastructure network isolation.

## Style

Keep APIs explicit, typed and deterministic where possible. Prefer explainable outputs over opaque scores.

Created by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.  
HORNO Network: https://horno.net
