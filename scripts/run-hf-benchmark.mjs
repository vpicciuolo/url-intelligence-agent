#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { investigate } from "../dist/src/agent.js";
import { safeFetch } from "../dist/src/net.js";

const benchmarkPath = resolve(process.argv[2] || "hf-dataset/data/benchmark.jsonl");
const outputPath = resolve(process.argv[3] || "hf-dataset/results/predictions.jsonl");

function parseJsonl(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid benchmark JSONL line ${index + 1}: ${error.message}`); }
  });
}

function classifyContentKind(contentType, text, bytes, status) {
  const mime = String(contentType || "").toLowerCase().split(";", 1)[0].trim();
  if (status === 204 || bytes === 0) return "empty";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("json")) return "json";
  if (mime.includes("xml")) return "xml";
  if (mime === "text/html" || mime === "application/xhtml+xml") return "html";
  if (mime.startsWith("text/")) {
    if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text || "")) return "html";
    return "text";
  }
  if (/^\s*[\[{]/.test(text || "")) {
    try { JSON.parse(text); return "json"; } catch { /* not JSON */ }
  }
  if (/^\s*<\?xml\b/i.test(text || "")) return "xml";
  if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text || "")) return "html";
  return mime ? "binary" : "unknown";
}

function classifyFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Local\/private host is blocked|Private\/reserved IP blocked|Private\/reserved destination blocked/i.test(message)) {
    return { action: "block", error: message };
  }
  if (/Invalid URL|Only http\/https URLs are allowed|Credentials in URLs are not allowed/i.test(message)) {
    return { action: "reject", error: message };
  }
  return { action: "error", error: message };
}

function shouldRunFullAgent(item) {
  return item.expected_action === "analyze" && item.expected_content_kind === "html" &&
    ["web_page", "repository", "space"].includes(item.group);
}

async function networkPrediction(item) {
  const started = Date.now();
  try {
    const fetched = await safeFetch(item.url, { timeoutMs: 15000, maxBytes: 3_000_000, maxRedirects: 8 });
    const redirectCount = fetched.trace.redirectChain.length;
    return {
      id: item.id,
      action: "analyze",
      initial_status: redirectCount > 0 ? 300 : fetched.status,
      final_status: fetched.status,
      redirect_count: redirectCount,
      final_url: fetched.url,
      content_type: fetched.trace.contentType || null,
      content_kind: classifyContentKind(fetched.trace.contentType, fetched.text, fetched.trace.bytes, fetched.status),
      bytes: fetched.trace.bytes,
      elapsed_ms: Date.now() - started,
      error: null,
    };
  } catch (error) {
    const failure = classifyFailure(error);
    return {
      id: item.id,
      action: failure.action,
      initial_status: null,
      final_status: null,
      redirect_count: 0,
      final_url: null,
      content_type: null,
      content_kind: null,
      bytes: 0,
      elapsed_ms: Date.now() - started,
      error: failure.error,
    };
  }
}

async function addFullAgentSignal(item, prediction) {
  if (!shouldRunFullAgent(item)) return { ...prediction, agent_applicable: false };
  const started = Date.now();
  try {
    const result = await investigate(item.url, {
      profile: "benchmark",
      externalResearch: false,
      force: true,
      crawl: { maxPages: 1, maxDepth: 0, concurrency: 1, obeyRobots: false, renderMode: "off" },
    });
    const root = result.pages[0];
    return {
      ...prediction,
      agent_applicable: true,
      agent_completed: true,
      agent_elapsed_ms: Date.now() - started,
      agent_final_url: result.finalUrl,
      agent_entity_type: result.entity.type.value,
      agent_entity_name: result.entity.name.value,
      agent_title: root?.title || null,
      agent_description_present: Boolean(root?.description),
      agent_canonical_present: Boolean(root?.canonical),
      agent_og_image_present: Boolean(root?.ogImage),
      agent_error: null,
    };
  } catch (error) {
    return {
      ...prediction,
      agent_applicable: true,
      agent_completed: false,
      agent_elapsed_ms: Date.now() - started,
      agent_final_url: null,
      agent_entity_type: null,
      agent_entity_name: null,
      agent_title: null,
      agent_description_present: false,
      agent_canonical_present: false,
      agent_og_image_present: false,
      agent_error: error instanceof Error ? error.message : String(error),
    };
  }
}

const cases = parseJsonl(await readFile(benchmarkPath, "utf8"));
const predictions = [];

for (let index = 0; index < cases.length; index += 1) {
  const item = cases[index];
  process.stderr.write(`[${index + 1}/${cases.length}] ${item.id} ${item.url}\n`);
  const network = await networkPrediction(item);
  predictions.push(await addFullAgentSignal(item, network));
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, predictions.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
process.stdout.write(`Wrote ${predictions.length} real-agent predictions to ${outputPath}\n`);
