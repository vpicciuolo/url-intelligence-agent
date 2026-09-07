---
title: URL Intelligence Agent
emoji: 🧠
sdk: docker
app_port: 7860
license: mit
short_description: AI agent for URL intelligence, SEO, security and MCP.
pinned: false
hf_oauth: true
hf_oauth_expiration_minutes: 1440
---

# URL Intelligence Agent

**URL in. Identity, evidence and intelligence out.**

Open-source evidence-first URL intelligence agent by Vincenzo Picciuolo / HRN Innovation Technologies Ltd.

This Docker Space runs the actual URL Intelligence Agent HTTP service on Hugging Face. It provides deep URL investigation, crawling, entity resolution, social/contact discovery, technology and brand intelligence, SEO/security/trust audits, RAG exports, monitoring, HTTP API, batch workers, reports and MCP support in the project runtime.

The public hosted demo is intentionally limited to **1 analysis request per Hugging Face account or anonymous IP every 24 hours** to reduce automated abuse. Clone or self-host the MIT-licensed project for unrestricted local usage.

Available HTTP endpoints include `/health`, `/me`, `/actions`, `/investigate`, and `/action/:name`.

Source: https://github.com/vpicciuolo/url-intelligence-agent
