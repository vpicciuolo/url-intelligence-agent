import { investigate } from "./agent.js";
import type { BenchmarkCase, BenchmarkResult } from "./types.js";

export async function runBenchmark(cases: BenchmarkCase[]): Promise<{ results: BenchmarkResult[]; summary: { total: number; passed: number; failed: number; passRate: number; avgMs: number } }> {
  const results: BenchmarkResult[] = [];
  for (const item of cases) {
    const started = Date.now();
    try {
      const result = await investigate(item.url, "benchmark");
      const assertions: BenchmarkResult["assertions"] = [];
      if (item.expected?.entityType) assertions.push({ name: "entityType", ok: result.entity.type.value === item.expected.entityType, actual: result.entity.type.value });
      if (item.expected?.titleIncludes) assertions.push({ name: "titleIncludes", ok: result.entity.name.value.toLowerCase().includes(item.expected.titleIncludes.toLowerCase()) || (result.pages[0].title || "").toLowerCase().includes(item.expected.titleIncludes.toLowerCase()), actual: result.pages[0].title || "" });
      if (typeof item.expected?.minSeoScore === "number") assertions.push({ name: "minSeoScore", ok: result.seo.score >= item.expected.minSeoScore, actual: result.seo.score });
      const ok = assertions.every(x => x.ok);
      results.push({ name: item.name, url: item.url, ok, elapsedMs: Date.now() - started, assertions });
    } catch (error) {
      results.push({ name: item.name, url: item.url, ok: false, elapsedMs: Date.now() - started, assertions: [], error: error instanceof Error ? error.message : String(error) });
    }
  }
  const passed = results.filter(x => x.ok).length;
  const avgMs = results.length ? Math.round(results.reduce((sum, x) => sum + x.elapsedMs, 0) / results.length) : 0;
  return { results, summary: { total: results.length, passed, failed: results.length - passed, passRate: results.length ? Math.round(passed / results.length * 10000) / 100 : 0, avgMs } };
}

export const DEFAULT_BENCHMARK: BenchmarkCase[] = [
  { name: "Example Domain", url: "https://example.com", expected: { titleIncludes: "Example" } },
  { name: "HORNO Network", url: "https://horno.net", expected: { titleIncludes: "HORNO" } },
  { name: "HORNO Space", url: "https://space.horno.net", expected: { titleIncludes: "HORNO" } }
];
