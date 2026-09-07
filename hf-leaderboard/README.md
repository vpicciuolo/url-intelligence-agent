---
title: URL Intelligence Benchmark Leaderboard
emoji: 🏆
colorFrom: purple
colorTo: blue
sdk: static
app_file: index.html
license: mit
short_description: Public leaderboard for URL intelligence agents and tools.
pinned: true
fullWidth: true
datasets:
  - vpicciuolo/url-intelligence-benchmark
tags:
  - benchmark
  - leaderboard
  - url-intelligence
  - web-intelligence
  - mcp
  - ai-agent
  - evaluation
  - ssrf
  - security
  - seo
  - metadata
---

# 🏆 URL Intelligence Benchmark Leaderboard

A public, reproducible leaderboard for **URL intelligence agents, MCP servers, metadata analyzers and web-intelligence tools**.

The leaderboard is powered by the open **URL Intelligence Benchmark** dataset and its machine-readable scorer.

- Benchmark Dataset: https://huggingface.co/datasets/vpicciuolo/url-intelligence-benchmark
- Live URL Intelligence Agent: https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent
- Source / submission workflow: https://github.com/vpicciuolo/url-intelligence-agent

## Submit a tool

Use the public Benchmark Submission issue template:

https://github.com/vpicciuolo/url-intelligence-agent/issues/new?template=benchmark-submission.yml

Submissions must identify the exact tool version/commit, benchmark revision, public prediction file, scorer output and reproduction command. Results are reviewed before publication.

## Metrics

The current benchmark reports:

- Overall assertion score
- Deterministic assertion score
- Action accuracy
- HTTP status-family accuracy
- Redirect handling
- Content-kind detection
- Reject/block safety accuracy
- Full-agent HTML completion
- Case pass rate

## Scope

The current `v0.1` benchmark contains 55 seed cases and 120 scored assertions. Scores are benchmark-version specific and should not be interpreted as universal accuracy across every website or network environment.

Created by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd**.
