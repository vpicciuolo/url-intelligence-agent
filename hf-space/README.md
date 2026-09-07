---
title: URL Intelligence Agent
emoji: 🧠
sdk: docker
app_port: 7860
license: mit
short_description: Open-source URL intelligence agent with Remote MCP.
pinned: false
hf_oauth: true
hf_oauth_expiration_minutes: 1440
tags:
  - ai-agent
  - mcp
  - remote-mcp
  - url-intelligence
  - web-intelligence
  - web-crawler
  - entity-resolution
  - seo
  - security
  - social-discovery
  - technology-detection
  - rag
  - typescript
  - docker
---

# 🧠 URL Intelligence Agent

**URL in. Identity, evidence and intelligence out.**

Open-source, evidence-first web intelligence for developers, AI agents, research, automation and MCP workflows. Created by **Vincenzo Picciuolo** at **HRN Innovation Technologies Ltd**.

![URL Intelligence Agent](https://storage.mlcdn.com/account_image/2365654/725Q0AzeY15nwDK3JocgKXq5AhxRoNC53LUBchc7.png)

## 🚀 Live Docker Space

This Hugging Face Space runs the real Node.js URL Intelligence Agent runtime. It can investigate a public URL and collect structured evidence across crawling, entity resolution, social/contact discovery, technology detection, brand signals, SEO, security, trust and structured data.

The **hosted web demo requires Hugging Face sign-in** and is limited to **1 analysis per account every 24 hours** to protect public compute. Successful analyses can be exported as branded **PDF, JSON, Markdown and HTML** reports. Local and self-hosted use remains unrestricted under the MIT License.

## 🔌 Public Remote MCP

Compatible AI clients can connect directly to the hosted agent using Streamable HTTP MCP:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/mcp
```

The public Remote MCP demo exposes a controlled set of read-only URL intelligence tools for testing from compatible MCP clients, including AI platforms that support custom remote MCP servers.

MCP discovery metadata:

```text
https://vpicciuolo-url-intelligence-agent.hf.space/.well-known/mcp.json
```

## HTTP endpoints

```text
/health
/me
/actions
/investigate
/action/:name
/mcp
/.well-known/mcp.json
/llms.txt
/robots.txt
/sitemap.xml
```

## Open source

GitHub repository:

https://github.com/vpicciuolo/url-intelligence-agent

The repository includes the CLI, HTTP API, stdio MCP server, Remote MCP transport, Docker deployment, RAG/export functions, monitoring and the complete TypeScript source.

**Creator:** Vincenzo Picciuolo  
**Company:** HRN Innovation Technologies Ltd  
**License:** MIT
