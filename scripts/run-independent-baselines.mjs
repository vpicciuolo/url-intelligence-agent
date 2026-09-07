#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import urlMetadata from "url-metadata";
import { getLinkPreview } from "link-preview-js";

const benchmarkPath = resolve(process.argv[2] || "hf-dataset/data/benchmark.jsonl");
const outputRoot = resolve(process.argv[3] || "hf-dataset/results/baselines");

const BASELINES = [
  {
    id: "url-metadata",
    name: "url-metadata",
    version: "5.12.0",
    source: "https://github.com/laurengarcia/url-metadata",
    package: "https://www.npmjs.com/package/url-metadata",
    license: "MIT",
    type: "metadata/network library",
    adapter: "Native network-only probe (`fields: ['network']`) using the package's built-in request-filtering-agent SSRF protection. HTTP response exceptions carrying a status code are normalized to benchmark action=analyze because a response was successfully obtained.",
  },
  {
    id: "link-preview-js",
    name: "link-preview-js",
    version: "5.0.0",
    source: "https://github.com/OP-Engineering/link-preview-js",
    package: "https://www.npmjs.com/package/link-preview-js",
    license: "MIT",
    type: "link-preview library",
    adapter: "Public getLinkPreview API with documented resolveDNSHost SSRF protection and manual redirect validation enabled. The library does not expose HTTP response status in its public result, so status-family assertions remain failures rather than being inferred.",
  },
];

function parseJsonl(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid benchmark JSONL line ${index + 1}: ${error.message}`); }
  });
}

function classifyContentKind(contentType, status = null) {
  const mime = String(contentType || "").toLowerCase().split(";", 1)[0].trim();
  if (status === 204) return "empty";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("json")) return "json";
  if (mime.includes("xml")) return "xml";
  if (mime === "text/html" || mime === "application/xhtml+xml") return "html";
  if (mime.startsWith("text/")) return "text";
  return mime ? "binary" : null;
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

function isPrivateIp(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").split("%", 1)[0];
  const family = isIP(host);
  if (family === 4) {
    const [a, b, c] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) || a >= 224;
  }
  if (family === 6) {
    return host === "::" || host === "::1" || /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
  }
  return false;
}

function inputTargetsPrivateNetwork(input) {
  try {
    const parsed = new URL(input);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host.endsWith(".localhost") || isPrivateIp(host);
  } catch {
    return false;
  }
}

function inputUsesUnsupportedScheme(input) {
  try {
    return !/^https?:$/.test(new URL(input).protocol);
  } catch {
    return false;
  }
}

function classifyBaselineFailure(error, input) {
  const message = messageOf(error);
  if (
    /ssrf|private|reserved|loopback|request[- ]filter|blocked|forbidden ip|local network|meta ip|dns lookup .* not allowed/i.test(message) ||
    (inputTargetsPrivateNetwork(input) && /valid (?:a )?url|not allowed|fetch failed/i.test(message))
  ) {
    return { action: "block", error: message };
  }
  if (inputUsesUnsupportedScheme(input)) {
    return { action: "reject", error: message };
  }
  if (/valid (?:a )?url|invalid url|unsupported protocol|only http|only absolute urls|protocol.*not supported|failed to parse url|scheme/i.test(message)) {
    return { action: "reject", error: message };
  }
  return { action: "error", error: message };
}

function basePrediction(item, started) {
  return {
    id: item.id,
    action: "error",
    initial_status: null,
    final_status: null,
    redirect_count: 0,
    final_url: null,
    content_type: null,
    content_kind: null,
    elapsed_ms: Date.now() - started,
    agent_applicable: false,
    error: null,
  };
}

async function runUrlMetadata(item) {
  const started = Date.now();
  try {
    const result = await urlMetadata(item.url, {
      fields: ["network"],
      timeout: 15000,
      maxRedirects: 8,
      size: 3_000_000,
    });
    const redirects = result.redirects || { count: 0, chain: [] };
    const contentType = result.responseHeaders?.["content-type"] || null;
    const initialStatus = redirects.count > 0
      ? redirects.chain?.[0]?.statusCode ?? 300
      : result.responseStatusCode ?? null;
    return {
      ...basePrediction(item, started),
      action: "analyze",
      initial_status: initialStatus,
      final_status: result.responseStatusCode ?? null,
      redirect_count: redirects.count || 0,
      final_url: result.url || null,
      content_type: contentType,
      content_kind: classifyContentKind(contentType, result.responseStatusCode),
      elapsed_ms: Date.now() - started,
      error: null,
    };
  } catch (error) {
    const redirects = error?.redirects || { count: 0, chain: [] };
    const status = error?.statusCode ?? null;
    const failure = status != null
      ? { action: "analyze", error: messageOf(error) }
      : classifyBaselineFailure(error, item.url);
    return {
      ...basePrediction(item, started),
      action: failure.action,
      initial_status: redirects.count > 0 ? redirects.chain?.[0]?.statusCode ?? 300 : status,
      final_status: status,
      redirect_count: redirects.count || 0,
      final_url: error?.url || null,
      elapsed_ms: Date.now() - started,
      error: failure.error,
    };
  }
}

async function resolveForLinkPreview(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return hostname;
  const result = await lookup(hostname, { verbatim: true });
  return result.address;
}

async function runLinkPreview(item) {
  const started = Date.now();
  let resolverCalls = 0;
  try {
    const result = await getLinkPreview(item.url, {
      timeout: 15000,
      followRedirects: "manual",
      handleRedirects: () => true,
      resolveDNSHost: async (url) => {
        resolverCalls += 1;
        return resolveForLinkPreview(url);
      },
      headers: {
        "user-agent": "url-intelligence-benchmark/link-preview-js-baseline",
        "accept-language": "en-US,en;q=0.8",
      },
    });
    const redirects = Math.max(0, resolverCalls - 1);
    return {
      ...basePrediction(item, started),
      action: "analyze",
      initial_status: redirects > 0 ? 300 : null,
      final_status: null,
      redirect_count: redirects,
      final_url: result.url || null,
      content_type: result.contentType || null,
      content_kind: classifyContentKind(result.contentType),
      elapsed_ms: Date.now() - started,
      error: null,
    };
  } catch (error) {
    const message = messageOf(error);
    const failure = (
      /ssrf/i.test(message) ||
      (inputTargetsPrivateNetwork(item.url) && (resolverCalls === 0 || /valid (?:a )?url|fetch failed/i.test(message)))
    ) ? { action: "block", error: message } : classifyBaselineFailure(error, item.url);
    return {
      ...basePrediction(item, started),
      action: failure.action,
      redirect_count: Math.max(0, resolverCalls - 1),
      elapsed_ms: Date.now() - started,
      error: failure.error,
    };
  }
}

const runners = {
  "url-metadata": runUrlMetadata,
  "link-preview-js": runLinkPreview,
};

const cases = parseJsonl(await readFile(benchmarkPath, "utf8"));

for (const baseline of BASELINES) {
  const rows = [];
  process.stderr.write(`\n== ${baseline.name} ${baseline.version} ==\n`);
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    process.stderr.write(`[${index + 1}/${cases.length}] ${item.id}\n`);
    rows.push(await runners[baseline.id](item));
  }
  const dir = resolve(outputRoot, `${baseline.id}-${baseline.version}`);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "predictions.jsonl"), rows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
  await writeFile(resolve(dir, "tool.json"), JSON.stringify({ ...baseline, generated_at: new Date().toISOString() }, null, 2) + "\n", "utf8");
  process.stdout.write(`Wrote ${rows.length} predictions for ${baseline.name} ${baseline.version}\n`);
}
