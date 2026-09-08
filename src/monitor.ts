import { createHash } from "node:crypto";
import { createPersistence } from "./adapters.js";
import { PROJECT } from "./credits.js";
import type { IntelligenceResult, JsonValue, Snapshot, SnapshotDiff } from "./types.js";

function claimKey(subject: string, predicate: string): string { return `${subject}::${predicate}`; }

export function createSnapshot(result: IntelligenceResult): Snapshot {
  const claimValues = Object.fromEntries(result.provenance.claims.map(claim => [claimKey(claim.subject, claim.predicate), claim.displayValue])) as Record<string, JsonValue>;
  const claimStatuses = Object.fromEntries(result.provenance.claims.map(claim => [claimKey(claim.subject, claim.predicate), claim.status]));
  const provenanceFingerprint = createHash("sha256").update(JSON.stringify(Object.entries(claimValues).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
  const httpValidators = Object.fromEntries(result.pages.map(page => [page.url, { etag: page.trace?.etag, lastModified: page.trace?.lastModified }]).filter(([, value]) => Boolean((value as { etag?: string; lastModified?: string }).etag || (value as { etag?: string; lastModified?: string }).lastModified))) as Record<string, { etag?: string; lastModified?: string }>;
  return {
    meta: result.meta,
    url: result.finalUrl,
    entityName: result.entity.name.value,
    fingerprint: result.fingerprint,
    contentFingerprint: result.contentFingerprint,
    provenanceFingerprint,
    claimValues,
    claimStatuses,
    httpValidators,
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
  compare("provenanceFingerprint", previous.provenanceFingerprint, current.provenanceFingerprint);
  compare("claimValues", previous.claimValues, current.claimValues);
  compare("claimStatuses", previous.claimStatuses, current.claimStatuses);
  compare("httpValidators", previous.httpValidators, current.httpValidators);
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
  const persistence = createPersistence();
  await persistence.put("snapshots", id, snapshot);
  const historyId = `${id}-${snapshot.observedAt.replace(/[:.]/g, "-")}`;
  await persistence.put("snapshot-history", historyId, snapshot);
  return id;
}

export async function loadSnapshot(urlOrId: string): Promise<Snapshot | undefined> {
  const id = /^https?:\/\//.test(urlOrId) ? createHash("sha256").update(urlOrId).digest("hex").slice(0, 32) : urlOrId;
  return createPersistence().get<Snapshot>("snapshots", id);
}

export async function loadSnapshotHistory(url: string, limit = 50): Promise<Snapshot[]> {
  const id = createHash("sha256").update(url).digest("hex").slice(0, 32);
  const rows = await createPersistence().list<Snapshot>("snapshot-history", Math.max(limit * 4, 100));
  return rows.filter(snapshot => createHash("sha256").update(snapshot.url).digest("hex").slice(0, 32) === id).sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, limit);
}

export async function sendWebhook(payload: unknown, webhook = process.env.URL_AGENT_WEBHOOK_URL): Promise<{ sent: boolean; status?: number; error?: string }> {
  if (!webhook) return { sent: false, error: "URL_AGENT_WEBHOOK_URL not configured" };
  try {
    const headers: Record<string, string> = { "content-type": "application/json", "user-agent": `url-intelligence-agent/${PROJECT.version}` };
    if (process.env.URL_AGENT_WEBHOOK_SECRET) headers["x-url-agent-signature"] = createHash("sha256").update(process.env.URL_AGENT_WEBHOOK_SECRET + JSON.stringify(payload)).digest("hex");
    const response = await fetch(webhook, { method: "POST", headers, body: JSON.stringify(payload) });
    return { sent: response.ok, status: response.status, error: response.ok ? undefined : `Webhook returned ${response.status}` };
  } catch (error) { return { sent: false, error: error instanceof Error ? error.message : String(error) }; }
}
