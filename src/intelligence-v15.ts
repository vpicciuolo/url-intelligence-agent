import { createHash } from "node:crypto";
import { getDomain } from "tldts";
import type { ClaimConflict, EvidenceObservation, IntelligenceResult, PageSignal, ResolvedClaim } from "./types.js";

export type UrlIntelligenceSeverityBand = "info" | "low" | "medium" | "high" | "critical";

export const URL_INTELLIGENCE_SCHEMA_VERSION = "1.0" as const;
export const URL_INTELLIGENCE_COMPATIBILITY_BASE = "1.4.0" as const;

export const REASON_CODE_REGISTRY = {
  LOGICAL_NEGATION: { category: "conflict", description: "Two materially similar statements differ in explicit negation or truth polarity.", defaultWeight: 92 },
  FACTUAL_DISAGREEMENT: { category: "conflict", description: "Evidence contains incompatible factual anchors or stable factual values.", defaultWeight: 86 },
  PRICE_CONFLICT: { category: "commerce", description: "Authoritative price observations disagree for the same commercial scope.", defaultWeight: 90 },
  CURRENCY_MISMATCH: { category: "commerce", description: "Currency observations disagree within the same claim scope.", defaultWeight: 82 },
  BILLING_CADENCE_MISMATCH: { category: "commerce", description: "Equivalent price observations use incompatible billing cadences.", defaultWeight: 72 },
  LOCALIZED_PRICE_VARIANT: { category: "commerce", description: "Multiple currencies appear across distinct localized pages without a same-scope price conflict.", defaultWeight: 18 },
  AMBIGUOUS_CURRENCY_SYMBOL: { category: "commerce", description: "A currency symbol is present but does not uniquely identify an ISO currency.", defaultWeight: 28 },
  REPRESENTATION_DRIFT: { category: "provenance", description: "Source and rendered representations differ materially.", defaultWeight: 42 },
  TEMPORAL_DIVERGENCE: { category: "provenance", description: "Evidence freshness or observation timing suggests values changed over time.", defaultWeight: 45 },
  STALE_METADATA_SUSPECTED: { category: "provenance", description: "Metadata appears older than stronger visible or runtime evidence.", defaultWeight: 52 },
  STRUCTURED_VISIBLE_MISMATCH: { category: "provenance", description: "Structured data and visible content provide materially different values.", defaultWeight: 68 },
  CANONICAL_CONFLICT: { category: "discovery", description: "Canonical signals disagree or point to an unexpected host.", defaultWeight: 68 },
  HREFLANG_CONFLICT: { category: "discovery", description: "Language/region alternate declarations are incomplete or contradictory.", defaultWeight: 48 },
  INDEXABILITY_CONFLICT: { category: "discovery", description: "Robots/indexability and canonical signals are in tension.", defaultWeight: 72 },
  SOFT_404_SUSPECTED: { category: "discovery", description: "A successful HTTP response contains strong not-found language.", defaultWeight: 58 },
  LOW_SOURCE_DIVERSITY: { category: "sources", description: "Many observed sources collapse into relatively few independent registrable domains.", defaultWeight: 44 },
  SOURCE_CONCENTRATION: { category: "sources", description: "A large share of external evidence comes from one source group.", defaultWeight: 38 },
  SYNDICATION_SUSPECTED: { category: "sources", description: "Near-identical external evidence appears across multiple domains.", defaultWeight: 34 },
  EXTERNAL_CORROBORATION_MISSING: { category: "sources", description: "No independently fetched external corroboration was observed.", defaultWeight: 32 },
  CSP_WEAK_POLICY: { category: "security", description: "Content-Security-Policy exists but contains permissive directives that reduce its protection.", defaultWeight: 48 },
  HSTS_WEAK_POLICY: { category: "security", description: "HSTS is missing or configured with a short max-age.", defaultWeight: 46 },
  SECURITY_TXT_MISSING: { category: "security", description: "No public security.txt signal was discovered in the crawled evidence.", defaultWeight: 16 },
  INSUFFICIENT_EVIDENCE: { category: "evidence", description: "There is not enough independent evidence to resolve the claim strongly.", defaultWeight: 30 },
  VOLATILE_METRIC: { category: "evidence", description: "The value is time-sensitive and may legitimately change between observations.", defaultWeight: 14 }
} as const;

type ReasonCode = keyof typeof REASON_CODE_REGISTRY;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

function severityBand(score: number): UrlIntelligenceSeverityBand {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  if (score >= 18) return "low";
  return "info";
}

function legacySeverity(conflicts: ClaimConflict[]): ClaimConflict["severity"] {
  const severities = conflicts.map(x => x.severity);
  if (severities.includes("high")) return "high";
  if (severities.includes("medium")) return "medium";
  if (severities.includes("low")) return "low";
  return "none";
}

function reasonForRelation(relation: string, predicate: string): ReasonCode | undefined {
  if (relation === "logical_contradiction") return "LOGICAL_NEGATION";
  if (relation === "factual_disagreement" || relation === "identity_conflict" || relation === "date_conflict") return "FACTUAL_DISAGREEMENT";
  if (relation === "currency_conflict") return "CURRENCY_MISMATCH";
  if (relation === "numeric_drift" || relation === "temporal_drift") return "TEMPORAL_DIVERGENCE";
  if (relation === "value_conflict" && /price|cost|amount|fee|revenue/i.test(predicate)) return "PRICE_CONFLICT";
  return undefined;
}

function reasonForFlag(flag: string): ReasonCode | undefined {
  if (flag === "representation_drift") return "REPRESENTATION_DRIFT";
  if (flag === "freshness_divergence") return "TEMPORAL_DIVERGENCE";
  if (flag === "stale_metadata_suspected") return "STALE_METADATA_SUSPECTED";
  if (flag === "structured_visible_divergence") return "STRUCTURED_VISIBLE_MISMATCH";
  if (flag === "logical_contradiction") return "LOGICAL_NEGATION";
  return undefined;
}

function observationMap(result: IntelligenceResult): Map<string, EvidenceObservation> {
  return new Map(result.provenance.observations.map(x => [x.id, x]));
}

function reasonWeight(code: ReasonCode): number {
  return REASON_CODE_REGISTRY[code].defaultWeight;
}

function assessClaim(claim: ResolvedClaim, observations: Map<string, EvidenceObservation>, corroborationScore: number) {
  const reasonCodes = new Set<ReasonCode>();
  claim.conflicts.forEach(conflict => {
    const code = reasonForRelation(conflict.relation, claim.predicate);
    if (code) reasonCodes.add(code);
    if (/cadence differs/i.test(conflict.explanation)) reasonCodes.add("BILLING_CADENCE_MISMATCH");
  });
  claim.flags.forEach(flag => {
    const code = reasonForFlag(flag);
    if (code) reasonCodes.add(code);
  });
  if (claim.status === "insufficient_evidence") reasonCodes.add("INSUFFICIENT_EVIDENCE");
  if (/(count|followers?|views?|downloads?|users?|members?|inventory|stock|sales|visits?|subscribers?)/i.test(claim.predicate)) reasonCodes.add("VOLATILE_METRIC");

  const claimObservations = claim.observationIds.map(id => observations.get(id)).filter((x): x is EvidenceObservation => Boolean(x));
  const sourceReliability = claimObservations.length
    ? claimObservations.reduce((sum, obs) => sum + obs.quality.sourceAuthority, 0) / claimObservations.length * 100
    : 0;
  const representationCount = new Set(claimObservations.map(obs => obs.source.representation)).size;
  const layerCount = new Set(claimObservations.map(obs => obs.source.layer)).size;
  const factualImpact = Math.max(0, ...[...reasonCodes].map(reasonWeight));
  const temporalRisk = clamp(
    (reasonCodes.has("STALE_METADATA_SUSPECTED") ? 70 : 0) +
    (reasonCodes.has("TEMPORAL_DIVERGENCE") ? 22 : 0) +
    (reasonCodes.has("VOLATILE_METRIC") ? 8 : 0)
  );
  const representationDivergence = clamp(
    (reasonCodes.has("REPRESENTATION_DRIFT") ? 58 : 0) +
    (reasonCodes.has("STRUCTURED_VISIBLE_MISMATCH") ? 30 : 0) +
    Math.max(0, representationCount - 1) * 8 +
    Math.max(0, layerCount - 2) * 3
  );
  const base = claim.status === "conflict" ? 56 : claim.status === "drift" ? 30 : claim.status === "insufficient_evidence" ? 24 : 8;
  const score = clamp(
    base +
    factualImpact * 0.30 +
    temporalRisk * 0.15 +
    representationDivergence * 0.12 +
    (100 - sourceReliability) * 0.06 +
    (100 - corroborationScore) * 0.04
  );

  return {
    claimId: claim.id,
    subject: claim.subject,
    predicate: claim.predicate,
    status: claim.status,
    score: Math.round(score),
    band: severityBand(score),
    legacySeverity: legacySeverity(claim.conflicts),
    confidence: claim.resolution.confidence,
    reasonCodes: [...reasonCodes],
    dimensions: {
      factualImpact: Math.round(factualImpact),
      sourceReliability: Math.round(sourceReliability),
      temporalRisk: Math.round(temporalRisk),
      representationDivergence: Math.round(representationDivergence),
      corroboration: Math.round(corroborationScore)
    }
  };
}

function pageType(page: PageSignal, index: number) {
  const path = (() => { try { return new URL(page.url).pathname.toLowerCase(); } catch { return ""; } })();
  const schema = new Set(page.jsonLdTypes.map(x => x.toLowerCase()));
  const text = `${page.title || ""} ${page.description || ""} ${page.headings.slice(0, 6).join(" ")}`.toLowerCase();
  const signals: string[] = [];
  let type = "unknown";
  let confidence = 0.45;

  const select = (value: string, score: number, ...why: string[]) => { type = value; confidence = Math.max(confidence, score); signals.push(...why); };

  if (schema.has("jobposting")) select("job", 0.99, "SCHEMA_JOBPOSTING");
  else if (schema.has("event")) select("event", 0.98, "SCHEMA_EVENT");
  else if (schema.has("newsarticle")) select("news", 0.98, "SCHEMA_NEWSARTICLE");
  else if (schema.has("article") || schema.has("blogposting")) select("article", 0.95, "SCHEMA_ARTICLE");
  else if (schema.has("product")) select("product", 0.96, "SCHEMA_PRODUCT");
  else if (/\/(pricing|plans?|subscriptions?)(?:\/|$)/.test(path) || /\bpricing\b|\bplans?\b/.test(text)) select("pricing", 0.92, "PRICING_LANGUAGE_OR_PATH");
  else if (/\/(docs?|documentation|developers?|api|guides?)(?:\/|$)/.test(path)) select("documentation", 0.91, "DOCUMENTATION_PATH");
  else if (/\/(privacy|terms|legal|imprint|cookies?)(?:\/|$)/.test(path)) select("legal", 0.94, "LEGAL_PATH");
  else if (/\/(security|trust|compliance)(?:\/|$)/.test(path)) select("security", 0.90, "SECURITY_PATH");
  else if (/\/(contact|support|help)(?:\/|$)/.test(path)) select("contact", 0.91, "CONTACT_PATH");
  else if (/\/(about|company|who-we-are|mission|story)(?:\/|$)/.test(path)) select("about", 0.90, "ABOUT_PATH");
  else if (/\/(careers?|jobs?|join-us)(?:\/|$)/.test(path)) select("jobs", 0.88, "CAREERS_PATH");
  else if (/\/(blog|news|press|media)(?:\/|$)/.test(path)) select("news_or_blog", 0.83, "NEWS_PATH");
  else if (/\/(products?|services?|features|solutions|platform)(?:\/|$)/.test(path)) select("product_or_service", 0.82, "PRODUCT_PATH");
  else if (index === 0 || path === "/" || path === "") select("homepage", 0.88, "ROOT_PAGE");

  if (page.forms > 0 && /login|sign in|sign-in|account/i.test(text)) select("login", 0.88, "LOGIN_FORM_SIGNAL");
  return { url: page.url, type, confidence: Number(confidence.toFixed(2)), signals: [...new Set(signals)].slice(0, 8) };
}

function buildClassification(result: IntelligenceResult) {
  const pages = result.pages.slice(0, 120).map(pageType);
  const distribution: Record<string, number> = {};
  pages.forEach(page => { distribution[page.type] = (distribution[page.type] || 0) + 1; });
  const primary = pages[0] || { url: result.finalUrl, type: "unknown", confidence: 0.3, signals: [] };
  return { primary, distribution, pages };
}

const ISO_CURRENCIES = new Set([
  "USD","EUR","GBP","AED","JPY","CNY","RMB","CAD","AUD","NZD","SGD","HKD","INR","KRW","CHF","SEK","NOK","DKK","PLN","CZK","HUF","RON","BGN","TRY","SAR","QAR","KWD","BHD","OMR","ZAR","BRL","MXN","ARS","CLP","COP","PEN","IDR","MYR","THB","VND","PHP","PKR","BDT","ILS","EGP","NGN","KES","RUB"
]);

function detectCurrency(raw: unknown): { currency?: string; ambiguous: boolean; evidence: string } {
  const value = String(raw ?? "").trim();
  const explicit = value.toUpperCase().match(/\b[A-Z]{3}\b/g)?.find(x => ISO_CURRENCIES.has(x));
  if (explicit) return { currency: explicit === "RMB" ? "CNY" : explicit, ambiguous: false, evidence: "explicit_iso_code" };
  const localized: Array<[RegExp, string]> = [
    [/\bUS\s*\$/i, "USD"], [/\bCA\s*\$/i, "CAD"], [/\bA\s*\$/i, "AUD"], [/\bAU\s*\$/i, "AUD"],
    [/\bNZ\s*\$/i, "NZD"], [/\bSG\s*\$/i, "SGD"], [/\bHK\s*\$/i, "HKD"], [/₹/, "INR"], [/₩/, "KRW"],
    [/₺/, "TRY"], [/₫/, "VND"], [/₱/, "PHP"], [/₪/, "ILS"], [/₽/, "RUB"], [/د\.إ|دإ/, "AED"]
  ];
  for (const [re, currency] of localized) if (re.test(value)) return { currency, ambiguous: false, evidence: "localized_symbol" };
  if (/€/.test(value)) return { currency: "EUR", ambiguous: false, evidence: "unique_symbol" };
  if (/£/.test(value)) return { currency: "GBP", ambiguous: false, evidence: "unique_symbol" };
  if (/\$/.test(value)) return { ambiguous: true, evidence: "ambiguous_dollar_symbol" };
  if (/[¥￥]/.test(value)) return { ambiguous: true, evidence: "ambiguous_yen_yuan_symbol" };
  return { ambiguous: false, evidence: "none" };
}

function priceUnit(raw: unknown): string | undefined {
  const value = String(raw ?? "").toLowerCase();
  const match = value.match(/(?:\/|per\s+)(seat|user|member|account|token|request|call|gb|tb|mb|device|project|workspace|month|year|week|day|hour)s?\b/i);
  return match?.[1]?.toLowerCase();
}

function pageLocale(result: IntelligenceResult, subject: string): string | undefined {
  const page = result.pages.find(x => x.url === subject || x.canonical === subject);
  if (page?.language) return page.language;
  try {
    const path = new URL(subject).pathname;
    return path.match(/\/(?:([a-z]{2})(?:[-_][A-Z]{2})?)(?:\/|$)/)?.[1];
  } catch { return undefined; }
}

function buildCommerce(result: IntelligenceResult) {
  const entries = result.provenance.observations
    .filter(obs => obs.normalizedValue.kind === "money")
    .map(obs => {
      const normalized = obs.normalizedValue.kind === "money" ? obs.normalizedValue : undefined;
      const detected = detectCurrency(obs.rawValue);
      return {
        observationId: obs.id,
        subject: obs.subject,
        predicate: obs.predicate,
        rawValue: obs.rawValue,
        amount: normalized?.amount,
        currency: normalized?.currency || detected.currency,
        currencyEvidence: normalized?.currency ? "normalized_core" : detected.evidence,
        currencyAmbiguous: detected.ambiguous && !normalized?.currency,
        cadence: normalized?.cadence,
        unit: priceUnit(obs.rawValue),
        locale: pageLocale(result, obs.subject),
        sourceLayer: obs.source.layer,
        representation: obs.source.representation,
        observedAt: obs.temporal.observedAt
      };
    });

  const currencies = [...new Set(entries.map(x => x.currency).filter((x): x is string => Boolean(x)))].sort();
  const cadences = [...new Set(entries.map(x => x.cadence).filter((x): x is string => Boolean(x)))].sort();
  const units = [...new Set(entries.map(x => x.unit).filter((x): x is string => Boolean(x)))].sort();
  const currencyConflictClaims = result.provenance.claims.filter(claim => claim.conflicts.some(x => x.relation === "currency_conflict"));
  const subjects = new Set(entries.map(x => x.subject));
  const localizedPricingLikely = currencies.length > 1 && subjects.size > 1 && currencyConflictClaims.length === 0;
  return {
    observations: entries.length,
    currencies,
    cadences,
    units,
    ambiguousCurrencyObservations: entries.filter(x => x.currencyAmbiguous).length,
    currencyConflictClaims: currencyConflictClaims.map(x => x.id),
    localizedPricingLikely,
    fx: {
      mode: "not_applied",
      explanation: "The deterministic core never rewrites observed prices using live FX. Time-stamped FX comparison should be added as an explicit external enrichment."
    },
    entries: entries.slice(0, 100)
  };
}

function normalizeContent(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, "").trim().slice(0, 3000);
}

function registrableDomain(host: string): string {
  return getDomain(host, { allowPrivateDomains: true }) || host.toLowerCase().replace(/^www\./, "");
}

function buildSourceIndependence(result: IntelligenceResult) {
  const sources = result.webResearch.sources.filter(x => x.fetched && x.host);
  const groups = new Map<string, typeof sources>();
  for (const source of sources) {
    const domain = registrableDomain(source.host);
    const group = groups.get(domain) || [];
    group.push(source);
    groups.set(domain, group);
  }
  const contentGroups = new Map<string, Set<string>>();
  for (const source of sources) {
    const sample = normalizeContent(source.contentSample || source.searchSnippet || "");
    if (sample.length < 120) continue;
    const hash = createHash("sha256").update(sample).digest("hex").slice(0, 20);
    const domains = contentGroups.get(hash) || new Set<string>();
    domains.add(registrableDomain(source.host));
    contentGroups.set(hash, domains);
  }
  const syndicationClusters = [...contentGroups.entries()].filter(([, domains]) => domains.size > 1).map(([hash, domains]) => ({ contentHash: hash, domains: [...domains] }));
  const independentGroups = groups.size;
  const sourceDiversity = sources.length ? independentGroups / sources.length : 0;
  const largestGroup = Math.max(0, ...[...groups.values()].map(x => x.length));
  const sourceConcentration = sources.length ? largestGroup / sources.length : 0;
  return {
    fetchedSources: sources.length,
    independentGroups,
    firstPartyGroups: new Set(sources.filter(x => x.sourceClass === "first-party").map(x => registrableDomain(x.host))).size,
    platformGroups: new Set(sources.filter(x => x.sourceClass === "platform").map(x => registrableDomain(x.host))).size,
    thirdPartyGroups: new Set(sources.filter(x => x.sourceClass === "third-party").map(x => registrableDomain(x.host))).size,
    sourceDiversity: Number(sourceDiversity.toFixed(3)),
    sourceConcentration: Number(sourceConcentration.toFixed(3)),
    syndicationSuspected: syndicationClusters.length > 0,
    syndicationClusters: syndicationClusters.slice(0, 20),
    corroborationStrength: Number((result.webResearch.sourceCoverageScore / 100).toFixed(3)),
    groups: [...groups.entries()].map(([domain, group]) => ({ domain, sources: group.length, classes: [...new Set(group.map(x => x.sourceClass))] })).sort((a, b) => b.sources - a.sources).slice(0, 60)
  };
}

function buildSearchDiscovery(result: IntelligenceResult) {
  const root = result.pages[0];
  if (!root) return { indexable: false, issues: ["No root page was collected."], hreflang: { declared: 0, reciprocal: 0 } };
  const issues: string[] = [];
  const xRobots = root.headers["x-robots-tag"] || "";
  const robots = `${root.robots || ""} ${xRobots}`;
  const noindex = /\bnoindex\b/i.test(robots);
  const canonicalHostMismatch = Boolean(root.canonical && (() => { try { return new URL(root.canonical).hostname !== new URL(root.url).hostname; } catch { return false; } })());
  const alternates = root.alternates || [];
  const hreflang = alternates.filter(x => x.hreflang);
  const duplicateHreflang = hreflang.length - new Set(hreflang.map(x => x.hreflang?.toLowerCase())).size;
  let reciprocal = 0;
  for (const alt of hreflang) {
    const target = result.pages.find(page => page.url === alt.href || page.canonical === alt.href);
    if (!target) continue;
    const back = (target.alternates || []).some(x => x.hreflang && (x.href === root.url || x.href === root.canonical));
    if (back) reciprocal += 1;
  }
  const soft404 = root.status >= 200 && root.status < 300 && /\b(?:404|page not found|not found|does not exist)\b/i.test(`${root.title || ""} ${root.headings.join(" ")}`);
  const aiDiscovery = result.pages.flatMap(page => page.links).some(link => /\/(?:llms\.txt|llms-full\.txt)(?:$|\?)/i.test(link));

  if (canonicalHostMismatch) issues.push("Canonical URL points to another hostname.");
  if (noindex && root.canonical && root.canonical !== root.url) issues.push("Noindex and canonical-to-another-URL signals coexist; review intended indexing behavior.");
  if (duplicateHreflang > 0) issues.push("Duplicate hreflang language/region declarations detected.");
  if (hreflang.length > 0 && reciprocal < hreflang.length) issues.push("Some hreflang targets were not observed reciprocating the root page in the crawl sample.");
  if (soft404) issues.push("Soft-404 language detected on a successful HTTP response.");

  return {
    indexable: !noindex && root.status >= 200 && root.status < 400,
    noindex,
    xRobotsTag: xRobots || undefined,
    canonical: root.canonical,
    canonicalHostMismatch,
    sitemapUrls: result.sitemapUrls.length,
    soft404Suspected: soft404,
    hreflang: {
      declared: hreflang.length,
      unique: new Set(hreflang.map(x => x.hreflang?.toLowerCase())).size,
      reciprocal,
      xDefault: hreflang.some(x => x.hreflang?.toLowerCase() === "x-default")
    },
    aiDiscoverySignals: { llmsTxtLinked: aiDiscovery },
    issues
  };
}

function buildSecurityPosture(result: IntelligenceResult) {
  const root = result.pages[0];
  const headers = root?.headers || {};
  const csp = headers["content-security-policy"] || "";
  const hsts = headers["strict-transport-security"] || "";
  const hstsMaxAge = Number(hsts.match(/max-age\s*=\s*(\d+)/i)?.[1] || 0);
  const setCookie = headers["set-cookie"] || "";
  const cspFindings = {
    present: Boolean(csp),
    unsafeInline: /'unsafe-inline'/i.test(csp),
    unsafeEval: /'unsafe-eval'/i.test(csp),
    wildcardSource: /(?:^|[;\s])\*(?:[;\s]|$)/.test(csp),
    frameAncestors: /frame-ancestors/i.test(csp),
    objectSrcNone: /object-src\s+'none'/i.test(csp),
    baseUriRestricted: /base-uri\s+(?:'none'|'self')/i.test(csp),
    upgradeInsecureRequests: /upgrade-insecure-requests/i.test(csp)
  };
  const hstsFindings = {
    present: Boolean(hsts),
    maxAge: hstsMaxAge,
    includeSubDomains: /includeSubDomains/i.test(hsts),
    preload: /(?:^|;)\s*preload(?:;|$)/i.test(hsts)
  };
  const cookies = {
    observed: Boolean(setCookie),
    secure: !setCookie || /\bSecure\b/i.test(setCookie),
    httpOnly: !setCookie || /\bHttpOnly\b/i.test(setCookie),
    sameSite: !setCookie || /\bSameSite=/i.test(setCookie)
  };
  let score = 100;
  if (!csp) score -= 22;
  if (cspFindings.unsafeInline) score -= 9;
  if (cspFindings.unsafeEval) score -= 10;
  if (cspFindings.wildcardSource) score -= 8;
  if (!hsts) score -= 18;
  else if (hstsMaxAge < 15552000) score -= 8;
  if (!headers["cross-origin-opener-policy"]) score -= 5;
  if (!headers["cross-origin-resource-policy"]) score -= 4;
  if (!headers["permissions-policy"]) score -= 4;
  const securityTxtLinked = result.pages.some(page => page.links.some(link => /\/\.well-known\/security\.txt(?:$|\?)/i.test(link))) || Boolean(result.importantPages.security);

  return {
    score: clamp(score),
    csp: cspFindings,
    hsts: hstsFindings,
    cookies,
    crossOrigin: {
      coop: headers["cross-origin-opener-policy"],
      coep: headers["cross-origin-embedder-policy"],
      corp: headers["cross-origin-resource-policy"]
    },
    securityTxtSignal: securityTxtLinked
  };
}

function evidenceMetrics(result: IntelligenceResult, sourceIndependence: ReturnType<typeof buildSourceIndependence>) {
  const summary = result.provenance.summary;
  const observations = result.provenance.observations;
  const claims = result.provenance.claims;
  const represented = new Set(observations.map(x => x.source.representation)).size;
  const layers = new Set(observations.map(x => x.source.layer)).size;
  return {
    observations: summary.totalObservations,
    resolvedClaims: summary.totalClaims,
    representationCoverage: Number(Math.min(1, represented / 3).toFixed(3)),
    layerCoverage: Number(Math.min(1, layers / 11).toFixed(3)),
    independentSourceGroups: sourceIndependence.independentGroups,
    sourceDiversity: sourceIndependence.sourceDiversity,
    firstPartyShare: observations.length ? Number((observations.filter(x => x.source.sourceClass === "first-party" || !x.source.sourceClass).length / observations.length).toFixed(3)) : 0,
    thirdPartyShare: observations.length ? Number((observations.filter(x => x.source.sourceClass === "third-party").length / observations.length).toFixed(3)) : 0,
    corroborationStrength: sourceIndependence.corroborationStrength,
    conflictDensity: claims.length ? Number((summary.conflictClaims / claims.length).toFixed(3)) : 0,
    driftDensity: claims.length ? Number((summary.driftClaims / claims.length).toFixed(3)) : 0,
    staleMetadataRatio: claims.length ? Number((summary.staleMetadataSuspected / claims.length).toFixed(3)) : 0,
    temporalCoverage: observations.length ? Number((observations.filter(x => x.temporal.publishedAt || x.temporal.modifiedAt || x.temporal.lastModified).length / observations.length).toFixed(3)) : 0
  };
}

export function buildUrlIntelligenceExtension(result: IntelligenceResult) {
  const observations = observationMap(result);
  const corroborationScore = clamp(result.webResearch.sourceCoverageScore || 0);
  const claimAssessments = result.provenance.claims
    .map(claim => assessClaim(claim, observations, corroborationScore))
    .sort((a, b) => b.score - a.score);
  const sourceIndependence = buildSourceIndependence(result);
  const commerce = buildCommerce(result);
  const searchDiscovery = buildSearchDiscovery(result);
  const security = buildSecurityPosture(result);

  const reasonCodes = new Set<ReasonCode>(claimAssessments.flatMap(x => x.reasonCodes as ReasonCode[]));
  if (commerce.localizedPricingLikely) reasonCodes.add("LOCALIZED_PRICE_VARIANT");
  if (commerce.ambiguousCurrencyObservations) reasonCodes.add("AMBIGUOUS_CURRENCY_SYMBOL");
  if (sourceIndependence.fetchedSources === 0) reasonCodes.add("EXTERNAL_CORROBORATION_MISSING");
  if (sourceIndependence.fetchedSources >= 3 && sourceIndependence.sourceDiversity < 0.5) reasonCodes.add("LOW_SOURCE_DIVERSITY");
  if (sourceIndependence.sourceConcentration >= 0.6 && sourceIndependence.fetchedSources >= 3) reasonCodes.add("SOURCE_CONCENTRATION");
  if (sourceIndependence.syndicationSuspected) reasonCodes.add("SYNDICATION_SUSPECTED");
  if (searchDiscovery.canonicalHostMismatch) reasonCodes.add("CANONICAL_CONFLICT");
  if (searchDiscovery.noindex && searchDiscovery.canonical && searchDiscovery.canonical !== result.finalUrl) reasonCodes.add("INDEXABILITY_CONFLICT");
  if (searchDiscovery.soft404Suspected) reasonCodes.add("SOFT_404_SUSPECTED");
  if (searchDiscovery.hreflang.declared > searchDiscovery.hreflang.reciprocal) reasonCodes.add("HREFLANG_CONFLICT");
  if (security.csp.present && (security.csp.unsafeEval || security.csp.unsafeInline || security.csp.wildcardSource)) reasonCodes.add("CSP_WEAK_POLICY");
  if (!security.hsts.present || security.hsts.maxAge < 15552000) reasonCodes.add("HSTS_WEAK_POLICY");
  if (!security.securityTxtSignal) reasonCodes.add("SECURITY_TXT_MISSING");

  const topScore = Math.max(0, ...claimAssessments.map(x => x.score), ...[...reasonCodes].map(reasonWeight));
  const classification = buildClassification(result);
  return {
    schemaVersion: URL_INTELLIGENCE_SCHEMA_VERSION,
    compatibilityBase: URL_INTELLIGENCE_COMPATIBILITY_BASE,
    generatedAt: new Date().toISOString(),
    classification,
    severityAssessment: {
      score: Math.round(topScore),
      band: severityBand(topScore),
      legacyEquivalent: topScore >= 65 ? "high" : topScore >= 40 ? "medium" : topScore >= 18 ? "low" : "none",
      explanation: "v1.5 severity is additive intelligence. It does not modify the frozen v1.4 none/low/medium/high conflict severity."
    },
    reasonCodes: [...reasonCodes].sort(),
    reasonCodeRegistry: REASON_CODE_REGISTRY,
    evidenceMetrics: evidenceMetrics(result, sourceIndependence),
    claimAssessments: claimAssessments.slice(0, 150),
    commerce,
    sourceIndependence,
    webPosture: {
      searchDiscovery,
      security,
      legacyScores: {
        seo: result.seo.score,
        security: result.security.score,
        quality: result.quality.score,
        trust: result.trust.score
      }
    },
    technologyChangeBaseline: {
      fingerprint: createHash("sha256").update(result.technologies.map(x => `${x.name}:${x.version || ""}`).sort().join("|")).digest("hex"),
      detected: result.technologies.length,
      note: "Snapshot monitoring can compare this fingerprint and the existing technology list across observations."
    }
  };
}
