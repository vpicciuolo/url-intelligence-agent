import { mkdir, readFile, writeFile, appendFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export type CacheEntry<T> = { value: T; expiresAt: number };
export interface CacheAdapter { get<T>(key: string): Promise<T | undefined>; set<T>(key: string, value: T, ttlMs?: number): Promise<void>; delete(key: string): Promise<void>; }
export interface PersistenceAdapter { put(collection: string, id: string, value: unknown): Promise<void>; get<T>(collection: string, id: string): Promise<T | undefined>; list<T>(collection: string, limit?: number): Promise<T[]>; }

export class MemoryCache implements CacheAdapter {
  private data = new Map<string, CacheEntry<unknown>>();
  async get<T>(key: string): Promise<T | undefined> { const item = this.data.get(key); if (!item) return undefined; if (item.expiresAt && item.expiresAt < Date.now()) { this.data.delete(key); return undefined; } return item.value as T; }
  async set<T>(key: string, value: T, ttlMs = 300000): Promise<void> { this.data.set(key, { value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0 }); }
  async delete(key: string): Promise<void> { this.data.delete(key); }
}

export class FileCache implements CacheAdapter {
  constructor(private root = process.env.URL_AGENT_CACHE_DIR || ".url-agent/cache") {}
  private path(key: string): string { return join(this.root, `${createHash("sha256").update(key).digest("hex")}.json`); }
  async get<T>(key: string): Promise<T | undefined> { try { const item = JSON.parse(await readFile(this.path(key), "utf8")) as CacheEntry<T>; if (item.expiresAt && item.expiresAt < Date.now()) return undefined; return item.value; } catch { return undefined; } }
  async set<T>(key: string, value: T, ttlMs = 300000): Promise<void> { const path = this.path(key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify({ value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0 })); }
  async delete(key: string): Promise<void> { await writeFile(this.path(key), "{}").catch(() => undefined); }
}

export class RedisCache implements CacheAdapter {
  private client: any;
  private async getClient(): Promise<any> {
    if (this.client) return this.client;
    const importer = new Function("m", "return import(m)") as (module: string) => Promise<any>;
    const redis = await importer("redis");
    this.client = redis.createClient({ url: process.env.REDIS_URL || process.env.VALKEY_URL });
    this.client.on?.("error", () => undefined);
    await this.client.connect();
    return this.client;
  }
  async get<T>(key: string): Promise<T | undefined> { const v = await (await this.getClient()).get(`url-agent:${key}`); return v ? JSON.parse(v) as T : undefined; }
  async set<T>(key: string, value: T, ttlMs = 300000): Promise<void> { const c = await this.getClient(); const seconds = Math.max(1, Math.ceil(ttlMs / 1000)); await c.set(`url-agent:${key}`, JSON.stringify(value), { EX: seconds }); }
  async delete(key: string): Promise<void> { await (await this.getClient()).del(`url-agent:${key}`); }
}

export class FilePersistence implements PersistenceAdapter {
  constructor(private root = process.env.URL_AGENT_DATA_DIR || ".url-agent/data") {}
  private path(collection: string, id: string): string { const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_"); return join(this.root, collection, `${safe}.json`); }
  async put(collection: string, id: string, value: unknown): Promise<void> { const path = this.path(collection, id); await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2)); }
  async get<T>(collection: string, id: string): Promise<T | undefined> { try { return JSON.parse(await readFile(this.path(collection, id), "utf8")) as T; } catch { return undefined; } }
  async list<T>(collection: string, limit = 100): Promise<T[]> { try { const dir = join(this.root, collection); const files = (await readdir(dir)).filter(x => x.endsWith(".json")).slice(-limit); const out: T[] = []; for (const file of files) { try { out.push(JSON.parse(await readFile(join(dir, file), "utf8")) as T); } catch { /* skip */ } } return out; } catch { return []; } }
}

export class PostgresPersistence implements PersistenceAdapter {
  private pool: any;
  private async getPool(): Promise<any> {
    if (this.pool) return this.pool;
    const importer = new Function("m", "return import(m)") as (module: string) => Promise<any>;
    const pg = await importer("pg");
    this.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await this.pool.query("CREATE TABLE IF NOT EXISTS url_agent_store (collection text NOT NULL, id text NOT NULL, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(collection,id))");
    return this.pool;
  }
  async put(collection: string, id: string, value: unknown): Promise<void> { const p = await this.getPool(); await p.query("INSERT INTO url_agent_store(collection,id,value) VALUES($1,$2,$3) ON CONFLICT(collection,id) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [collection, id, JSON.stringify(value)]); }
  async get<T>(collection: string, id: string): Promise<T | undefined> { const p = await this.getPool(); const r = await p.query("SELECT value FROM url_agent_store WHERE collection=$1 AND id=$2", [collection, id]); return r.rows[0]?.value as T | undefined; }
  async list<T>(collection: string, limit = 100): Promise<T[]> { const p = await this.getPool(); const r = await p.query("SELECT value FROM url_agent_store WHERE collection=$1 ORDER BY updated_at DESC LIMIT $2", [collection, limit]); return r.rows.map((x: any) => x.value as T); }
}

export function createCache(): CacheAdapter {
  if (process.env.REDIS_URL || process.env.VALKEY_URL) return new RedisCache();
  if (process.env.URL_AGENT_CACHE === "file") return new FileCache();
  return new MemoryCache();
}

export function createPersistence(): PersistenceAdapter {
  if (process.env.DATABASE_URL) return new PostgresPersistence();
  return new FilePersistence();
}

export type Job<T = unknown> = { id: string; type: string; payload: T; createdAt: string; attempts: number };
export type JobResult = { id: string; ok: boolean; startedAt: string; finishedAt: string; value?: unknown; error?: string };

export class WorkerQueue {
  private jobs: Job[] = [];
  private results = new Map<string, JobResult>();
  constructor(private concurrency = Math.max(1, Math.min(20, Number(process.env.URL_AGENT_WORKER_CONCURRENCY || 4)))) {}
  add<T>(type: string, payload: T): Job<T> { const job: Job<T> = { id: randomUUID(), type, payload, createdAt: new Date().toISOString(), attempts: 0 }; this.jobs.push(job as Job); return job; }
  getResult(id: string): JobResult | undefined { return this.results.get(id); }
  pending(): Job[] { return [...this.jobs]; }
  async run(handler: (job: Job) => Promise<unknown>): Promise<JobResult[]> {
    const output: JobResult[] = [];
    while (this.jobs.length) {
      const batch = this.jobs.splice(0, this.concurrency);
      const done = await Promise.all(batch.map(async job => {
        const startedAt = new Date().toISOString(); job.attempts += 1;
        try { const value = await handler(job); return { id: job.id, ok: true, startedAt, finishedAt: new Date().toISOString(), value } as JobResult; }
        catch (error) { return { id: job.id, ok: false, startedAt, finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) } as JobResult; }
      }));
      for (const result of done) { this.results.set(result.id, result); output.push(result); }
    }
    return output;
  }
  async appendAudit(path: string, value: unknown): Promise<void> { await mkdir(dirname(path), { recursive: true }); await appendFile(path, JSON.stringify({ at: new Date().toISOString(), value }) + "\n"); }
}
