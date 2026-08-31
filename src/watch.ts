import { investigate } from "./agent.js";
import { createSnapshot, diffSnapshots, loadSnapshot, persistSnapshot, sendWebhook } from "./monitor.js";
import type { SnapshotDiff } from "./types.js";

export type WatchOptions = {
  intervalMs?: number;
  profile?: string;
  webhook?: boolean;
  signal?: AbortSignal;
  onCheck?: (event: { first: boolean; diff?: SnapshotDiff; at: string }) => void | Promise<void>;
};

export async function watchUrl(url: string, options: WatchOptions = {}): Promise<void> {
  const intervalMs = Math.max(60_000, options.intervalMs || Number(process.env.URL_AGENT_WATCH_INTERVAL_MS || 300000));
  let first = true;
  while (!options.signal?.aborted) {
    const result = await investigate(url, { profile: options.profile || "monitoring", force: true });
    const current = createSnapshot(result);
    const previous = await loadSnapshot(result.finalUrl);
    let diff: SnapshotDiff | undefined;
    if (previous) {
      diff = diffSnapshots(previous, current);
      if (diff.changed && options.webhook !== false) await sendWebhook({ event: "url-intelligence-change", diff });
    }
    await persistSnapshot(current);
    await options.onCheck?.({ first, diff, at: new Date().toISOString() });
    first = false;
    if (options.signal?.aborted) break;
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
}
