#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const officialPath = resolve("hf-dataset/results/latest.json");
const baselineRoot = resolve("hf-dataset/results/baselines");
const outputPath = resolve("hf-dataset/results/leaderboard.json");

async function load(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const official = await load(officialPath);
const baselines = [
  { id: "url-metadata", version: "5.12.0" },
  { id: "link-preview-js", version: "5.0.0" },
];

const entries = [
  {
    id: "url-intelligence-agent",
    name: "URL Intelligence Agent",
    version: official.git_sha ? `commit ${official.git_sha.slice(0, 8)}` : "current main",
    source: "https://github.com/vpicciuolo/url-intelligence-agent",
    hugging_face: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",
    license: "MIT",
    independent: false,
    adapter: "Native benchmark runner against the repository's real safeFetch and selected investigate() paths.",
    summary: official,
  },
];

for (const baseline of baselines) {
  const dir = resolve(baselineRoot, `${baseline.id}-${baseline.version}`);
  const [tool, summary] = await Promise.all([
    load(resolve(dir, "tool.json")),
    load(resolve(dir, "summary.json")),
  ]);
  entries.push({
    id: tool.id,
    name: tool.name,
    version: tool.version,
    source: tool.source,
    package: tool.package,
    license: tool.license,
    independent: true,
    adapter: tool.adapter,
    summary,
  });
}

for (const entry of entries) {
  const safety = entry.summary?.metrics?.security_action_accuracy?.pct;
  entry.safety_gate_passed = Number(safety) === 100;
}

entries.sort((a, b) => {
  if (a.safety_gate_passed !== b.safety_gate_passed) return a.safety_gate_passed ? -1 : 1;
  return Number(b.summary?.overall_score || 0) - Number(a.summary?.overall_score || 0);
});

let rank = 0;
for (const entry of entries) {
  if (entry.safety_gate_passed) entry.rank = ++rank;
  else entry.rank = null;
}

const manifest = {
  benchmark: "vpicciuolo/url-intelligence-benchmark",
  benchmark_version: "v0.1",
  generated_at: new Date().toISOString(),
  ranking_policy: "Only entries with 100% reject/block safety accuracy receive a rank; eligible entries are ordered by overall assertion score.",
  entries,
};

await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Wrote ${entries.length} leaderboard entries to ${outputPath}`);
