export type EvidenceField<T> = {
  value: T;
  confidence: number;
  method: string;
  sources: string[];
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type FetchTrace = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  elapsedMs: number;
  bytes: number;
  contentType?: string;
  redirectChain: string[];
  headers: Record<string, string>;
};

export type PageSignal = {
  url: string;
  status: number;
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  favicon?: string;
  language?: string;
  robots?: string;
  jsonLdTypes: string[];
  jsonLd: JsonValue[];
  headings: string[];
  socials: string[];
  emails: string[];
  phones: string[];
  links: string[];
  images: string[];
  scripts: string[];
  stylesheets: string[];
  forms: number;
  wordCount: number;
  textSample: string;
  meta: Record<string, string>;
  headers: Record<string, string>;
  trace?: FetchTrace;
  rendered?: boolean;
};

export type CrawlPolicy = {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  sameOrigin: boolean;
  obeyRobots: boolean;
  allowPatterns: string[];
  denyPatterns: string[];
  renderMode: "off" | "auto" | "always";
};

export type CrawlResult = {
  rootUrl: string;
  pages: PageSignal[];
  importantPages: Record<string, string>;
  sitemapUrls: string[];
  robotsUrl?: string;
  robotsText?: string;
  skipped: { url: string; reason: string }[];
  errors: { url: string; error: string }[];
  policy: CrawlPolicy;
};

export type TechnologySignal = {
  name: string;
  category: string;
  confidence: number;
  version?: string;
  evidence: string[];
};

export type BrandProfile = {
  name?: string;
  logos: string[];
  favicons: string[];
  colors: string[];
  socialProfiles: string[];
  handles: string[];
  taglines: string[];
};

export type AuditResult = {
  score: number;
  issues: string[];
  warnings: string[];
  checks: Record<string, boolean | number | string>;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  url?: string;
  confidence?: number;
  attributes?: Record<string, JsonValue>;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: string;
  confidence: number;
  evidence: string[];
};

export type EntityGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type CompetitorCandidate = {
  name: string;
  url: string;
  confidence: number;
  reason: string;
  evidence: string[];
};

export type RagDocument = {
  id: string;
  url: string;
  title?: string;
  text: string;
  wordCount: number;
  checksum: string;
  metadata: Record<string, JsonValue>;
};

export type Snapshot = {
  meta: Record<string, unknown>;
  url: string;
  entityName: string;
  fingerprint: string;
  contentFingerprint: string;
  seoScore: number;
  trustScore: number;
  technologies: string[];
  socials: string[];
  contacts: string[];
  importantPages: Record<string, string>;
  observedAt: string;
};

export type SnapshotDiff = {
  changed: boolean;
  changes: { field: string; before: JsonValue; after: JsonValue }[];
  previous: Snapshot;
  current: Snapshot;
};

export type IntelligenceResult = {
  meta: Record<string, unknown>;
  inputUrl: string;
  finalUrl: string;
  profile: string;
  entity: {
    type: EvidenceField<string>;
    name: EvidenceField<string>;
    description?: EvidenceField<string>;
  };
  seo: AuditResult;
  security: AuditResult;
  quality: AuditResult;
  trust: AuditResult;
  socials: string[];
  contacts: { emails: string[]; phones: string[] };
  importantPages: Record<string, string>;
  pages: PageSignal[];
  sitemapUrls: string[];
  technologies: TechnologySignal[];
  brand: BrandProfile;
  graph: EntityGraph;
  competitors: CompetitorCandidate[];
  rag: RagDocument[];
  contradictions: string[];
  warnings: string[];
  fingerprint: string;
  contentFingerprint: string;
  observedAt: string;
};

export type AgentActionContext = {
  profile?: string;
  options?: Record<string, JsonValue>;
};

export type AgentPlugin = {
  name: string;
  version: string;
  actions?: Record<string, (input: unknown, context: AgentActionContext) => Promise<unknown>>;
  enrich?: (result: IntelligenceResult, context: AgentActionContext) => Promise<IntelligenceResult>;
};

export type BenchmarkCase = {
  name: string;
  url: string;
  expected?: { entityType?: string; titleIncludes?: string; minSeoScore?: number };
};

export type BenchmarkResult = {
  name: string;
  url: string;
  ok: boolean;
  elapsedMs: number;
  assertions: { name: string; ok: boolean; actual?: JsonValue }[];
  error?: string;
};
