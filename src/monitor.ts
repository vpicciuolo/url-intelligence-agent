import { createHash } from "node:crypto";
import { createPersistence } from "./adapters.js";
import type { IntelligenceResult, JsonValue, Snapshot, SnapshotDiff } from "./types.js";

export function createSnapshot(result: IntelligenceResult): Snapshot {
  return {
    meta: result.meta,
    url: result.finalUrl,
    entityName: result.entity.name.value,
    fingerprint: result.fingerprint,
    contentFingerprint: result.contentFingerprint,
    seoScore: result.seo.score,
    trustScore: result.trust.score,
    technologies: result.technologies.map(x => x.name).sort(),
    socials: [...result.socials].sort(),
    contacts: [...result.contacts.emails, ...result.contacts.phones].sort(),
    importantPages: result.importantPages,
    observedAt: result.observedAt
  };
}

function asJson(value: unknown): JsonValue { return JSON.parse(JSON.stringify(value)) as JsonValue; }

export function diffSnapshots(previous: Snapshot, current: Snapshot): SnapshotDiff {
  const changes: SnapshotDiff["changes"] = [];
  const compare = (field: string, before: unknown, after: unknown) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field, before: asJson(before), after: asJson(after) });
  };
  compare("entityName", previous.entityName, current.entityName);
  compare("contentFingerprint", previous.contentFingerprint, current.contentFingerprint);
  compare("seoScore", previous.seoScore, current.seoScore);
  compare("trustScore", previous.trustScore, current.trustScore);
  compare("technologies", previous.technologies, current.technologies);
  compare("socials", previous.socials, current.socials);
  compare("contacts", previous.contacts, current.contacts);
  compare("importantPages", previous.importantPages, current.importantPages);
  return { changed: changes.length > 0, changes, previous, current };
}

export async function persistSnapshot(snapshot: Snapshot): Promise<string> {
  const id = createHash("sha256").update(snapshot.url).digest("hex").slice(0, 32);
  await createPersistence().put("snapshots", id, snapshot);
  return id;
}

export async function loadSnapshot(urlOrId: string): Promise<Snapshot | undefined> {
  const id = /^https?:\/\//.test(urlOrId) ? createHash("sha256").update(urlOrId).digest("hex").slice(0, 32) : urlOrId;
  return createPersistence().get<Snapshot>("snapshots", id);
}

export async function sendWebhook(payload: unknown, webhook = process.env.URL_AGENT_WEBHOOK_URL): Promise<{ sent: boolean; status?: number; error?: string }> {
  if (!webhook) return { sent: false, error: "URL_AGENT_WEBHOOK_URL not configured" };
  try {
    const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "url-intelligence-agent/1.0.0" };
    if (process.env.URL_AGENT_WEBHOOK_SECRET) headers["x-url-agent-signature"] = createHash("sha256").update(process.env.URL_AGENT_WEBHOOK_SECRET + JSON.stringify(payload)).digest("hex");
    const response = await fetch(webhook, { method: "POST", headers, body: JSON.stringify(payload) });
    return { sent: response.ok, status: response.status, error: response.ok ? undefined : `Webhook returned ${response.status}` };
  } catch (error) { return { sent: false, error: error instanceof Error ? error.message : String(error) }; }
}
