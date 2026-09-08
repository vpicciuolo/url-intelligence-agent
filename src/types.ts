export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type EvidenceField<T> = {
  value: T;
  confidence: number;
  method: string;
  sources: string[];
  observationIds?: string[];
};

export type EvidenceRepresentation = "http" | "source_html" | "rendered_dom" | "external";
export type EvidenceLayer = "http_header" | "html" | "meta" | "open_graph" | "twitter_card" | "json_ld" | "microdata" | "rdfa" | "visible_dom" | "sitemap" | "feed" | "api";

export type NormalizedEvidenceValue =
  | { kind: "string"; value: string; folded: string }
  | { kind: "number"; value: number; exact: boolean; approximate?: boolean; min: number | null; max: number | null; comparator: "eq" | "gte" | "lte" | "approx" | "range" }
  | { kind: "date"; value: string; precision: "date" | "minute" | "second" }
  | { kind: "url"; value: string }
  | { kind: "money"; amount: number; currency?: string; cadence?: string; exact: boolean; min: number | null; max: number | null }
  | { kind: "boolean"; value: boolean }
  | { kind: "json"; value: JsonValue };

export type EvidenceObservation = {
  id: string;
  subject: string;
  predicate: string;
  rawValue: JsonValue;
  normalizedValue: NormalizedEvidenceValue;
  source: {
    pageUrl: string;
    finalUrl: string;
    representation: EvidenceRepresentation;
    layer: EvidenceLayer;
    property?: string;
    locator?: string;
    jsonPointer?: string;
    sourceRange?: {
      start: number;
      end: number;
      startLine?: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
    visibility?: "visible" | "metadata_only" | "runtime_data" | "hidden";
    sourceClass?: "first-party" | "platform" | "third-party";
    independenceGroup?: string;
    requestVariant?: {
      language?: string;
      userAgentClass?: string;
      region?: string;
      device?: string;
    };
  };
  temporal: {
    observedAt: string;
    publishedAt?: string;
    modifiedAt?: string;
    lastModified?: string;
    firstSeenAt?: string;
    lastSeenAt?: string;
  };
  integrity: {
    documentHash?: string;
    observationHash: string;
  };
  quality: {
    extractionConfidence: number;
    sourceAuthority: number;
    freshnessConfidence: number;
  };
};

export type ClaimConflict = {
  observationIds: string[];
  relation:
    | "exact_match"
    | "normalized_match"
    | "semantic_equivalent"
    | "wording_variation"
    | "compatible_range"
    | "precision_difference"
    | "numeric_drift"
    | "temporal_drift"
    | "factual_disagreement"
    | "logical_contradiction"
    | "value_conflict"
    | "type_conflict"
    | "identity_conflict"
    | "date_conflict"
    | "currency_conflict"
    | "canonical_conflict"
    | "source_conflict"
    | "external_contradiction";
  severity: "none" | "low" | "medium" | "high";
  explanation: string;
};

export type ResolvedClaim = {
  id: string;
  subject: string;
  predicate: string;
  value: NormalizedEvidenceValue;
  displayValue: JsonValue;
  status: "consensus" | "compatible_variation" | "drift" | "conflict" | "insufficient_evidence";
  observationIds: string[];
  flags: string[];
  resolution: {
    preferredObservationId?: string;
    confidence: number;
    policy: string;
    explanation: string[];
  };
  conflicts: ClaimConflict[];
};

export type ProvenanceReport = {
  schemaVersion: string;
  generatedAt: string;
  observations: EvidenceObservation[];
  claims: ResolvedClaim[];
  summary: {
    totalObservations: number;
    totalClaims: number;
    consensusClaims: number;
    compatibleClaims: number;
    driftClaims: number;
    conflictClaims: number;
    staleMetadataSuspected: number;
    layers: EvidenceLayer[];
    representations: EvidenceRepresentation[];
  };
  warnings: string[];
};

export type PageRepresentation = {
  kind: "source_html" | "rendered_dom";
  url: string;
  observedAt: string;
  documentHash: string;
  byteLength: number;
  textSample: string;
  html?: string;
  requestVariant?: {
    language?: string;
    userAgentClass?: string;
    region?: string;
    device?: string;
  };
  observations: EvidenceObservation[];
};

export type FetchTrace = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  elapsedMs: number;
  bytes: number;
  contentType?: string;
  encoding?: string;
  etag?: string;
  lastModified?: string;
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
  representations?: PageRepresentation[];
  observations?: EvidenceObservation[];
};

export type CrawlPolicy = {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  sameOrigin: boolean;
  obeyRobots: boolean;
  allowPatterns: string[];
  denyPatterns: string[];
  renderMode: "off" | "auto" | "always" | "playwright";
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

export type WebEvidenceSource = {
  url: string;
  finalUrl?: string;
  host: string;
  sourceClass: "first-party" | "platform" | "third-party";
  discoveredBy: string[];
  searchProvider?: string;
  searchTitle?: string;
  searchSnippet?: string;
  status?: number;
  title?: string;
  description?: string;
  publishedAt?: string;
  wordCount?: number;
  contentSample?: string;
  linksToTarget?: boolean;
  verificationStatus?: "unverified" | "search-snippet-match" | "fetched-no-match" | "verified-mention" | "verified-backlink" | "fetch-blocked";
  mentionsEntity: boolean;
  fetched: boolean;
  observedAt: string;
  error?: string;
};

export type WebResearchReport = {
  enabled: boolean;
  searchConfigured: boolean;
  searchProvider?: string;
  queries: string[];
  candidateUrls: number;
  fetchedSources: number;
  thirdPartySources: number;
  thirdPartyDomains: number;
  corroboratingThirdPartySources: number;
  corroboratingThirdPartyDomains: number;
  platformSources: number;
  verifiedPlatformSources?: number;
  directReferenceSources?: number;
  verifiedDirectReferenceSources?: number;
  sourceCoverageScore: number;
  coverageLevel: "none" | "limited" | "moderate" | "strong";
  sources: WebEvidenceSource[];
  notes: string[];
};

export type ConfidenceAssessment = {
  extractionConfidence: number;
  externalCorroboration: number;
  externalCoverageLevel: "none" | "limited" | "moderate" | "strong";
  firstPartyEvidencePages: number;
  thirdPartyEvidenceSources: number;
  thirdPartyEvidenceDomains: number;
  verifiedPlatformSources?: number;
  verifiedDirectReferences?: number;
  searchProvider?: string;
  interpretation: string;
};

export type Snapshot = {
  meta: Record<string, unknown>;
  url: string;
  entityName: string;
  fingerprint: string;
  contentFingerprint: string;
  provenanceFingerprint?: string;
  claimValues?: Record<string, JsonValue>;
  claimStatuses?: Record<string, string>;
  httpValidators?: Record<string, { etag?: string; lastModified?: string }>;
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
  confidenceAssessment: ConfidenceAssessment;
  webResearch: WebResearchReport;
  provenance: ProvenanceReport;
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
