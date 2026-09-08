import { createHash } from "node:crypto";
import { parse } from "parse5";
import { PROJECT } from "./credits.js";
import type {
  ClaimConflict,
  EvidenceLayer,
  EvidenceObservation,
  EvidenceRepresentation,
  JsonValue,
  NormalizedEvidenceValue,
  PageRepresentation,
  PageSignal,
  ProvenanceReport,
  ResolvedClaim
} from "./types.js";

const unique = <T>(items: T[]): T[] => [...new Set(items)];
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");
const nowIso = (): string => new Date().toISOString();

const STABLE_PREDICATES = /(?:canonical|language|robots|currency|availability|published|modified|founding|start_date|end_date|author|name|url)$/i;
const TEXT_VARIATION_PREDICATES = /(?:description|title|headline|summary|tagline|slogan|site_name)$/i;
const IDENTITY_PREDICATES = /(?:^name$|author|creator|publisher|brand|site_name)$/i;
const VOLATILE_PREDICATES = /(?:count|followers?|following|views?|likes?|downloads?|users?|customers?|members?|reviews?|ratings?|inventory|stock|sales|visits?|requests?|records?|pages?|urls?|items?|products?|subscribers?|installs?|reactions?)/i;
const NUMERIC_PREDICATES = /(?:count|price|rating|employees?|followers?|following|views?|likes?|downloads?|users?|customers?|members?|reviews?|inventory|stock|sales|visits?|requests?|records?|pages?|urls?|items?|products?|subscribers?|installs?|reactions?|number)/i;
const DATE_PREDICATES = /(?:date|published|modified|created|updated|start_at|end_at|start_date|end_date|founding)/i;
const URL_PREDICATES = /(?:^url$|_url$|canonical|image|logo|favicon|same_as|feed_url)/i;
const MONEY_PREDICATES = /(?:price|cost|amount|fee|revenue)/i;

const SOURCE_AUTHORITY: Record<EvidenceLayer, number> = {
  api: 0.98,
  visible_dom: 0.94,
  json_ld: 0.91,
  microdata: 0.89,
  rdfa: 0.88,
  http_header: 0.88,
  html: 0.84,
  open_graph: 0.82,
  meta: 0.79,
  twitter_card: 0.75,
  feed: 0.82,
  sitemap: 0.78
};

const JSONLD_FIELD_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  url: "url",
  datePublished: "published_at",
  dateModified: "modified_at",
  dateCreated: "created_at",
  startDate: "start_date",
  endDate: "end_date",
  foundingDate: "founding_date",
  price: "price",
  lowPrice: "price_low",
  highPrice: "price_high",
  priceCurrency: "price_currency",
  availability: "availability",
  ratingValue: "rating_value",
  ratingCount: "rating_count",
  reviewCount: "review_count",
  userInteractionCount: "interaction_count",
  numberOfEmployees: "employee_count",
  memberCount: "member_count",
  telephone: "phone",
  email: "email"
};

const META_FIELD_MAP: Record<string, string> = {
  description: "description",
  "og:title": "title",
  "twitter:title": "title",
  "og:description": "description",
  "twitter:description": "description",
  "og:url": "og_url",
  "og:image": "image_url",
  "og:image:url": "image_url",
  "twitter:image": "image_url",
  "twitter:image:src": "image_url",
  "og:site_name": "site_name",
  "article:published_time": "published_at",
  "article:modified_time": "modified_at",
  "datepublished": "published_at",
  "datemodified": "modified_at",
  "product:price:amount": "price",
  "product:price:currency": "price_currency",
  "og:price:amount": "price",
  "og:price:currency": "price_currency",
  "product:availability": "availability"
};

const SCHEMA_FIELD_MAP: Record<string, string> = {
  datepublished: "published_at",
  datemodified: "modified_at",
  datecreated: "created_at",
  startdate: "start_date",
  enddate: "end_date",
  price: "price",
  lowprice: "price_low",
  highprice: "price_high",
  pricecurrency: "price_currency",
  availability: "availability",
  ratingvalue: "rating_value",
  ratingcount: "rating_count",
  reviewcount: "review_count",
  userinteractioncount: "interaction_count",
  numberofemployees: "employee_count",
  membercount: "member_count",
  description: "description",
  name: "name",
  url: "url"
};

export type AnalyzeRepresentationOptions = {
  finalUrl?: string;
  observedAt?: string;
  headers?: Record<string, string>;
  requestVariant?: PageRepresentation["requestVariant"];
  networkEvidence?: Array<{ url: string; status: number; contentType?: string; body?: JsonValue; observedAt?: string }>;
  includeHtml?: boolean;
};

function attrs(node: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of node?.attrs || []) out[String(attr.name).toLowerCase()] = String(attr.value || "");
  return out;
}

function nodeText(node: any, includeHidden = false): string {
  if (!node) return "";
  if (node.nodeName === "#text") return String(node.value || "");
  const tag = String(node.tagName || "").toLowerCase();
  if (!includeHidden && ["script", "style", "noscript", "template", "svg"].includes(tag)) return "";
  return (node.childNodes || []).map((child: any) => nodeText(child, includeHidden)).join(" ").replace(/\s+/g, " ").trim();
}

function sourceRange(node: any): EvidenceObservation["source"]["sourceRange"] | undefined {
  const loc = node?.sourceCodeLocation;
  if (!loc || typeof loc.startOffset !== "number" || typeof loc.endOffset !== "number") return undefined;
  return {
    start: loc.startOffset,
    end: loc.endOffset,
    startLine: loc.startLine,
    startColumn: loc.startCol,
    endLine: loc.endLine,
    endColumn: loc.endCol
  };
}

function elementValue(node: any, a = attrs(node)): string | undefined {
  for (const key of ["content", "value", "datetime", "href", "src", "resource"]) if (a[key]) return a[key].trim();
  const text = nodeText(node);
  return text || undefined;
}

function safeAbsolute(value: string, base: string): string {
  try { return new URL(value, base).toString(); } catch { return value; }
}

function normalizeUrl(value: string): string | undefined {
  try {
    const u = new URL(value);
    u.hash = "";
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) u.searchParams.delete(key);
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
    return u.toString().replace(/\/$/, "") || u.toString();
  } catch { return undefined; }
}

function numericCore(input: string): NormalizedEvidenceValue | undefined {
  const source = input.replace(/\u00a0/g, " ").trim();
  const match = source.match(/(?:^|[^\w])([-+]?\d[\d\s,.]*)(?:\s*([kmb]))?(?:\b|\+|$)/i);
  if (!match) return undefined;
  let numberText = match[1].replace(/\s+/g, "");
  const commaCount = (numberText.match(/,/g) || []).length;
  const dotCount = (numberText.match(/\./g) || []).length;
  if (commaCount && dotCount) {
    if (numberText.lastIndexOf(",") > numberText.lastIndexOf(".")) numberText = numberText.replace(/\./g, "").replace(",", ".");
    else numberText = numberText.replace(/,/g, "");
  } else if (commaCount) {
    const tail = numberText.split(",").pop() || "";
    numberText = commaCount > 1 || tail.length === 3 ? numberText.replace(/,/g, "") : numberText.replace(",", ".");
  }
  const base = Number(numberText);
  if (!Number.isFinite(base)) return undefined;
  const scale = match[2] ? ({ k: 1_000, m: 1_000_000, b: 1_000_000_000 } as Record<string, number>)[match[2].toLowerCase()] : 1;
  const value = base * scale;
  const approximate = /(?:about|approx(?:imately)?|around|roughly|~|≈)/i.test(source);
  const lowerBound = /(?:\+|over|more than|at least|minimum|min\.?|>=|>)/i.test(source);
  const upperBound = /(?:under|less than|at most|maximum|max\.?|<=|<)/i.test(source);
  if (lowerBound && !upperBound) return { kind: "number", value, exact: false, approximate, min: value, max: null, comparator: "gte" };
  if (upperBound && !lowerBound) return { kind: "number", value, exact: false, approximate, min: null, max: value, comparator: "lte" };
  return { kind: "number", value, exact: !approximate, approximate, min: approximate ? value * 0.95 : value, max: approximate ? value * 1.05 : value, comparator: approximate ? "approx" : "eq" };
}

function dateCore(input: string): NormalizedEvidenceValue | undefined {
  const source = input.trim();
  const timestamp = Date.parse(source);
  if (!Number.isFinite(timestamp)) return undefined;
  const precision: "date" | "minute" | "second" = /T\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2}/.test(source) ? "second" : /T\d{2}:\d{2}|\d{2}:\d{2}/.test(source) ? "minute" : "date";
  return { kind: "date", value: new Date(timestamp).toISOString(), precision };
}

function moneyCore(input: string): NormalizedEvidenceValue | undefined {
  const source = input.replace(/\u00a0/g, " ").trim();
  const numeric = numericCore(source);
  if (!numeric || numeric.kind !== "number") return undefined;
  const currency = /\bUSD\b|\$/i.test(source) ? "USD" : /\bEUR\b|€/i.test(source) ? "EUR" : /\bGBP\b|£/i.test(source) ? "GBP" : /\bAED\b/i.test(source) ? "AED" : undefined;
  const cadence = /(?:\/|per\s+)(month|mo\b)/i.test(source) ? "month" : /(?:\/|per\s+)(year|yr|annual)/i.test(source) ? "year" : /(?:\/|per\s+)(week|wk)/i.test(source) ? "week" : undefined;
  return { kind: "money", amount: numeric.value, currency, cadence, exact: numeric.exact, min: numeric.min, max: numeric.max };
}

export function normalizeEvidenceValue(raw: JsonValue, predicate = ""): NormalizedEvidenceValue {
  if (typeof raw === "number") return { kind: "number", value: raw, exact: true, min: raw, max: raw, comparator: "eq" };
  if (typeof raw === "boolean") return { kind: "boolean", value: raw };
  if (raw === null) return { kind: "json", value: null };
  if (typeof raw !== "string") return { kind: "json", value: raw };
  const source = raw.trim();
  if (URL_PREDICATES.test(predicate) || /^https?:\/\//i.test(source)) {
    const normalized = normalizeUrl(source);
    if (normalized) return { kind: "url", value: normalized };
  }
  if (DATE_PREDICATES.test(predicate)) {
    const normalized = dateCore(source);
    if (normalized) return normalized;
  }
  if (MONEY_PREDICATES.test(predicate) || /(?:\bUSD\b|\bEUR\b|\bGBP\b|\bAED\b|[$€£])\s*\d/i.test(source)) {
    const normalized = moneyCore(source);
    if (normalized) return normalized;
  }
  if (NUMERIC_PREDICATES.test(predicate) || /^\s*(?:about|over|under|more than|less than|at least|at most|~|≈|>|<)?\s*[-+]?\d[\d\s,.]*(?:\s*[kmb])?\+?\s*$/i.test(source)) {
    const normalized = numericCore(source);
    if (normalized) return normalized;
  }
  return { kind: "string", value: source.normalize("NFKC").replace(/\s+/g, " ").trim(), folded: source.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim() };
}

function metricPredicate(context: string): string | undefined {
  const stop = new Set(["and", "or", "but", "with", "from", "that", "this", "these", "those", "today", "yesterday", "tomorrow", "currently", "now", "approximately", "about", "over", "under", "more", "than"]);
  const tokens = context
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(x => !stop.has(x))
    .slice(0, 4);
  if (!tokens.length) return undefined;
  const slug = tokens.join("_").replace(/^_+|_+$/g, "");
  if (!slug || /^\d+$/.test(slug)) return undefined;
  return `metric:${slug}`;
}

function metaLayer(key: string): EvidenceLayer {
  if (key.startsWith("og:")) return "open_graph";
  if (key.startsWith("twitter:")) return "twitter_card";
  return "meta";
}

function sourceAuthority(predicate: string, layer: EvidenceLayer, representation: EvidenceRepresentation): number {
  let score = SOURCE_AUTHORITY[layer] || 0.7;
  if (/canonical_url/i.test(predicate) && (layer === "html" || layer === "http_header")) score = 0.98;
  if (/description/i.test(predicate) && layer === "meta") score = 0.93;
  if (VOLATILE_PREDICATES.test(predicate) && representation === "rendered_dom" && layer === "visible_dom") score = 0.98;
  if (/price/i.test(predicate) && representation === "rendered_dom" && layer === "visible_dom") score = 0.97;
  return Math.max(0, Math.min(1, score));
}

function createObservation(args: {
  subject: string;
  predicate: string;
  rawValue: JsonValue;
  pageUrl: string;
  finalUrl: string;
  representation: EvidenceRepresentation;
  layer: EvidenceLayer;
  documentHash: string;
  observedAt: string;
  property?: string;
  locator?: string;
  jsonPointer?: string;
  sourceRange?: EvidenceObservation["source"]["sourceRange"];
  visibility?: EvidenceObservation["source"]["visibility"];
  sourceClass?: EvidenceObservation["source"]["sourceClass"];
  independenceGroup?: string;
  requestVariant?: PageRepresentation["requestVariant"];
  publishedAt?: string;
  modifiedAt?: string;
  lastModified?: string;
  extractionConfidence?: number;
}): EvidenceObservation {
  const normalizedValue = normalizeEvidenceValue(args.rawValue, args.predicate);
  const authority = sourceAuthority(args.predicate, args.layer, args.representation);
  const observationHash = hash(JSON.stringify({ subject: args.subject, predicate: args.predicate, raw: args.rawValue, source: args.pageUrl, representation: args.representation, layer: args.layer, property: args.property, locator: args.locator, jsonPointer: args.jsonPointer, documentHash: args.documentHash }));
  return {
    id: `obs_${observationHash.slice(0, 24)}`,
    subject: args.subject,
    predicate: args.predicate,
    rawValue: args.rawValue,
    normalizedValue,
    source: {
      pageUrl: args.pageUrl,
      finalUrl: args.finalUrl,
      representation: args.representation,
      layer: args.layer,
      property: args.property,
      locator: args.locator,
      jsonPointer: args.jsonPointer,
      sourceRange: args.sourceRange,
      visibility: args.visibility || (args.layer === "visible_dom" ? "visible" : "metadata_only"),
      sourceClass: args.sourceClass || "first-party",
      independenceGroup: args.independenceGroup || (() => { try { return new URL(args.pageUrl).hostname.replace(/^www\./, ""); } catch { return args.pageUrl; } })(),
      requestVariant: args.requestVariant
    },
    temporal: { observedAt: args.observedAt, publishedAt: args.publishedAt, modifiedAt: args.modifiedAt, lastModified: args.lastModified },
    integrity: { documentHash: args.documentHash, observationHash },
    quality: {
      extractionConfidence: Math.max(0, Math.min(1, args.extractionConfidence ?? 0.95)),
      sourceAuthority: authority,
      freshnessConfidence: args.representation === "rendered_dom" && VOLATILE_PREDICATES.test(args.predicate) ? 0.96 : args.layer === "http_header" ? 0.88 : 0.78
    }
  };
}

function extractMetricClaims(text: string, emit: (predicate: string, rawValue: string, context: string, locator?: string) => void, locator?: string): void {
  if (!text || text.length > 100_000) text = text.slice(0, 100_000);
  const seen = new Set<string>();
  const patterns = [
    /(?:about|approximately|around|roughly|over|under|more than|less than|at least|at most|~|≈|>|<)?\s*([$€£]?\s*\d[\d\s,.]*(?:\s*[kmb])?\+?)\s+([\p{L}][\p{L}\p{N}'’_-]*(?:\s+[\p{L}][\p{L}\p{N}'’_-]*){0,3})/giu,
    /([\p{L}][\p{L}\p{N}'’_-]*(?:\s+[\p{L}][\p{L}\p{N}'’_-]*){0,3})\s*[:=]\s*((?:about|approximately|around|roughly|over|under|more than|less than|at least|at most|~|≈|>|<)?\s*[$€£]?\s*\d[\d\s,.]*(?:\s*[kmb])?\+?)/giu
  ];
  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const pattern = patterns[patternIndex];
    for (const match of text.matchAll(pattern)) {
      const raw = patternIndex === 0 ? match[1] : match[2];
      const context = patternIndex === 0 ? match[2] : match[1];
      const predicate = metricPredicate(context);
      if (!predicate) continue;
      const normalized = numericCore(raw);
      if (!normalized || normalized.kind !== "number") continue;
      if (normalized.value >= 1900 && normalized.value <= 2100 && /(?:year|date|copyright)/i.test(context)) continue;
      const key = `${predicate}|${raw}|${context}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emit(predicate, raw.trim(), context.trim(), locator);
      if (seen.size >= 80) return;
    }
  }
}

function jsonPointerEscape(value: string): string { return value.replace(/~/g, "~0").replace(/\//g, "~1"); }

function interactionPredicate(value: Record<string, unknown>): string {
  const type = String((value.interactionType as any)?.["@type"] || value.interactionType || "").toLowerCase();
  if (/follow/.test(type)) return "follower_count";
  if (/like/.test(type)) return "like_count";
  if (/view|watch/.test(type)) return "view_count";
  if (/comment/.test(type)) return "comment_count";
  if (/share/.test(type)) return "share_count";
  return "interaction_count";
}

function walkJsonLd(value: unknown, path: string, subject: string, emit: (predicate: string, raw: JsonValue, pointer: string, property: string) => void): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkJsonLd(item, `${path}/${i}`, subject, emit));
    return;
  }
  if (typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const localSubject = typeof record["@id"] === "string" ? String(record["@id"]) : subject;
  if (record.interactionStatistic && typeof record.interactionStatistic === "object") {
    const stats = Array.isArray(record.interactionStatistic) ? record.interactionStatistic : [record.interactionStatistic];
    stats.forEach((stat, i) => {
      if (!stat || typeof stat !== "object" || Array.isArray(stat)) return;
      const s = stat as Record<string, unknown>;
      if (typeof s.userInteractionCount === "number" || typeof s.userInteractionCount === "string") {
        emit(interactionPredicate(s), s.userInteractionCount as JsonValue, `${path}/interactionStatistic/${i}/userInteractionCount`, "userInteractionCount");
      }
    });
  }
  for (const [key, raw] of Object.entries(record)) {
    if (raw === undefined || raw === null) continue;
    const predicate = JSONLD_FIELD_MAP[key];
    if (predicate) {
      const values = Array.isArray(raw) ? raw : [raw];
      values.forEach((item, i) => {
        if (["string", "number", "boolean"].includes(typeof item) || item === null) emit(predicate, item as JsonValue, `${path}/${jsonPointerEscape(key)}${Array.isArray(raw) ? `/${i}` : ""}`, key);
      });
    }
    if (typeof raw === "object") walkJsonLd(raw, `${path}/${jsonPointerEscape(key)}`, localSubject, emit);
  }
}

export function analyzeRepresentation(html: string, pageUrl: string, representation: Exclude<EvidenceRepresentation, "external" | "http">, options: AnalyzeRepresentationOptions = {}): PageRepresentation {
  const observedAt = options.observedAt || nowIso();
  const finalUrl = options.finalUrl || pageUrl;
  const documentHash = hash(html);
  const observations: EvidenceObservation[] = [];
  const subject = finalUrl;
  const requestVariant = options.requestVariant;
  const document = parse(html, { sourceCodeLocationInfo: true }) as any;

  const emit = (predicate: string, rawValue: JsonValue, layer: EvidenceLayer, node?: any, property?: string, jsonPointer?: string, visibility?: EvidenceObservation["source"]["visibility"], extractionConfidence = 0.96) => {
    if (rawValue === "" || rawValue === undefined) return;
    observations.push(createObservation({ subject, predicate, rawValue, pageUrl, finalUrl, representation, layer, documentHash, observedAt, property, locator: node ? `${String(node.tagName || node.nodeName || "node")}${property ? `[${property}]` : ""}` : undefined, jsonPointer, sourceRange: node ? sourceRange(node) : undefined, visibility, requestVariant, extractionConfidence }));
  };

  const visit = (node: any): void => {
    if (!node) return;
    const tag = String(node.tagName || "").toLowerCase();
    const a = attrs(node);

    if (tag === "html" && a.lang) emit("language", a.lang, "html", node, "lang", undefined, "metadata_only");
    if (tag === "title") {
      const value = nodeText(node, true);
      if (value) emit("title", value, "html", node, "title", undefined, "metadata_only");
    }
    if (tag === "meta") {
      const key = String(a.name || a.property || a["http-equiv"] || a.itemprop || "").toLowerCase();
      const value = a.content;
      if (key && value) {
        const predicate = META_FIELD_MAP[key] || SCHEMA_FIELD_MAP[key.replace(/[:-]/g, "")] || `meta:${key}`;
        const layer = metaLayer(key);
        emit(predicate, value, layer, node, key, undefined, "metadata_only");
        extractMetricClaims(value, (metric, raw) => emit(metric, raw, layer, node, key, undefined, "metadata_only", 0.9), `meta:${key}`);
      }
    }
    if (tag === "link") {
      const rel = String(a.rel || "").toLowerCase().split(/\s+/);
      if (rel.includes("canonical") && a.href) emit("canonical_url", safeAbsolute(a.href, finalUrl), "html", node, "rel=canonical", undefined, "metadata_only");
      if (rel.includes("alternate") && a.href && /(?:rss|atom|json)/i.test(a.type || "")) emit("feed_url", safeAbsolute(a.href, finalUrl), "feed", node, a.type || "alternate", undefined, "metadata_only");
    }
    if (tag === "time") {
      const value = a.datetime || nodeText(node);
      if (value) emit(SCHEMA_FIELD_MAP[String(a.itemprop || "").toLowerCase()] || "date", value, a.itemprop ? "microdata" : "html", node, a.itemprop || "datetime", undefined, "visible");
    }
    if (tag === "data" && a.value) emit(SCHEMA_FIELD_MAP[String(a.itemprop || "").toLowerCase()] || "data_value", a.value, a.itemprop ? "microdata" : "html", node, a.itemprop || "value", undefined, "visible");

    if (a.itemprop && tag !== "meta") {
      const value = elementValue(node, a);
      if (value) {
        const key = String(a.itemprop).toLowerCase();
        emit(SCHEMA_FIELD_MAP[key] || `schema:${key}`, URL_PREDICATES.test(key) ? safeAbsolute(value, finalUrl) : value, "microdata", node, a.itemprop, undefined, "visible");
      }
    }
    if (a.property && tag !== "meta") {
      const value = elementValue(node, a);
      if (value) {
        const key = String(a.property).toLowerCase();
        emit(SCHEMA_FIELD_MAP[key.replace(/[:-]/g, "")] || META_FIELD_MAP[key] || `rdfa:${key}`, URL_PREDICATES.test(key) ? safeAbsolute(value, finalUrl) : value, "rdfa", node, a.property, undefined, "visible");
      }
    }

    if (tag === "script" && /application\/ld\+json/i.test(a.type || "")) {
      const source = nodeText(node, true);
      if (source) {
        try {
          const parsed = JSON.parse(source) as JsonValue;
          walkJsonLd(parsed, "", subject, (predicate, raw, pointer, property) => emit(predicate, raw, "json_ld", node, property, pointer, "metadata_only", 0.98));
        } catch {
          observations.push(createObservation({ subject, predicate: "jsonld_parse_error", rawValue: "malformed-json-ld", pageUrl, finalUrl, representation, layer: "json_ld", documentHash, observedAt, property: "application/ld+json", locator: "script[type='application/ld+json']", sourceRange: sourceRange(node), visibility: "metadata_only", requestVariant, extractionConfidence: 1 }));
        }
      }
    }

    for (const child of node.childNodes || []) visit(child);
  };
  visit(document);

  const visibleText = nodeText(document).replace(/\s+/g, " ").trim();
  extractMetricClaims(visibleText, (predicate, raw, context) => {
    observations.push(createObservation({ subject, predicate, rawValue: raw, pageUrl, finalUrl, representation, layer: "visible_dom", documentHash, observedAt, property: context, locator: "document:visible-text", visibility: "visible", requestVariant, extractionConfidence: 0.88 }));
  }, "document:visible-text");

  if (options.headers) {
    for (const [rawKey, rawValue] of Object.entries(options.headers)) {
      const key = rawKey.toLowerCase();
      if (!rawValue) continue;
      if (key === "last-modified") observations.push(createObservation({ subject, predicate: "modified_at", rawValue, pageUrl, finalUrl, representation: "http", layer: "http_header", documentHash, observedAt, property: "last-modified", visibility: "metadata_only", requestVariant, lastModified: rawValue, extractionConfidence: 1 }));
      if (key === "etag") observations.push(createObservation({ subject, predicate: "http_etag", rawValue, pageUrl, finalUrl, representation: "http", layer: "http_header", documentHash, observedAt, property: "etag", visibility: "metadata_only", requestVariant, extractionConfidence: 1 }));
      if (key === "content-language") observations.push(createObservation({ subject, predicate: "language", rawValue, pageUrl, finalUrl, representation: "http", layer: "http_header", documentHash, observedAt, property: "content-language", visibility: "metadata_only", requestVariant, extractionConfidence: 1 }));
      if (key === "link") {
        for (const match of rawValue.matchAll(/<([^>]+)>\s*;\s*rel=["']?canonical["']?/gi)) observations.push(createObservation({ subject, predicate: "canonical_url", rawValue: safeAbsolute(match[1], finalUrl), pageUrl, finalUrl, representation: "http", layer: "http_header", documentHash, observedAt, property: "link:canonical", visibility: "metadata_only", requestVariant, extractionConfidence: 1 }));
      }
    }
  }

  for (const network of options.networkEvidence || []) {
    if (!network.body || typeof network.body !== "object") continue;
    const networkHash = hash(JSON.stringify(network.body));
    const walkApi = (value: unknown, path = ""): void => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.slice(0, 100).forEach((item, i) => walkApi(item, `${path}/${i}`)); return; }
      const record = value as Record<string, unknown>;
      for (const [key, raw] of Object.entries(record)) {
        const predicate = JSONLD_FIELD_MAP[key] || SCHEMA_FIELD_MAP[key.toLowerCase()] || (NUMERIC_PREDICATES.test(key) ? `metric:${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` : undefined);
        if (predicate && (["string", "number", "boolean"].includes(typeof raw) || raw === null)) {
          observations.push(createObservation({ subject, predicate, rawValue: raw as JsonValue, pageUrl, finalUrl, representation: "rendered_dom", layer: "api", documentHash: networkHash, observedAt: network.observedAt || observedAt, property: key, jsonPointer: `${path}/${jsonPointerEscape(key)}`, locator: network.url, visibility: "runtime_data", requestVariant, extractionConfidence: 0.97 }));
        }
        if (raw && typeof raw === "object") walkApi(raw, `${path}/${jsonPointerEscape(key)}`);
      }
    };
    walkApi(network.body);
  }

  const deduped = [...new Map(observations.map(item => [item.id, item])).values()];
  return {
    kind: representation,
    url: finalUrl,
    observedAt,
    documentHash,
    byteLength: Buffer.byteLength(html),
    textSample: visibleText.slice(0, 20_000),
    html: options.includeHtml ? html : undefined,
    requestVariant,
    observations: deduped
  };
}

type Comparison = { relation: ClaimConflict["relation"]; conflict: boolean; severity: ClaimConflict["severity"]; explanation: string };

const TEXT_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with",
  "il", "lo", "la", "i", "gli", "le", "di", "da", "del", "della", "e", "un", "una", "per", "con",
  "el", "la", "los", "las", "de", "del", "y", "un", "una", "para", "con",
  "le", "les", "de", "des", "du", "et", "un", "une", "pour", "avec",
  "der", "die", "das", "den", "dem", "des", "und", "ein", "eine", "für", "mit"
]);
const NEGATION_WORDS = new Set(["not", "no", "never", "without", "none", "neither", "nor", "false", "disabled", "unavailable", "non", "senza", "mai", "nunca", "sin", "pas", "sans", "nicht", "kein", "keine", "ohne"]);

function semanticTokens(input: string): string[] {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .split(/\s+/)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x.length > 1)
    .filter(x => !TEXT_STOPWORDS.has(x));
}

function setMetrics(a: string[], b: string[]) {
  const as = new Set(a), bs = new Set(b);
  const intersection = [...as].filter(x => bs.has(x)).length;
  const union = new Set([...as, ...bs]).size;
  const minSize = Math.max(1, Math.min(as.size, bs.size));
  return {
    intersection,
    jaccard: union ? intersection / union : 0,
    containment: intersection / minSize,
    sameSet: as.size === bs.size && intersection === as.size
  };
}

function factualAnchors(input: string): string[] {
  const out = new Set<string>();
  for (const match of input.matchAll(/(?:^|[^\p{L}\p{N}])([-+]?\d[\d\s,.]*)(?:\s*([kmb]))?(?:\b|\+|$)/giu)) {
    const normalized = numericCore(`${match[1]}${match[2] || ""}`);
    if (normalized?.kind === "number") out.add(`n:${normalized.value}`);
  }
  for (const match of input.matchAll(/https?:\/\/[^\s)\]}>]+/gi)) out.add(`u:${normalizeUrl(match[0]) || match[0]}`);
  for (const match of input.matchAll(/\b(?:USD|EUR|GBP|AED)\b|[$€£]/gi)) out.add(`c:${match[0].toUpperCase()}`);
  return [...out].sort();
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function hasNegation(tokens: string[]): boolean {
  return tokens.some(token => NEGATION_WORDS.has(token));
}

function compareTextValues(a: Extract<NormalizedEvidenceValue, { kind: "string" }>, b: Extract<NormalizedEvidenceValue, { kind: "string" }>, predicate: string): Comparison {
  if (a.value === b.value) return { relation: "exact_match", conflict: false, severity: "none", explanation: "Strings match exactly." };
  if (a.folded === b.folded) return { relation: "normalized_match", conflict: false, severity: "none", explanation: "Strings match after Unicode/case/punctuation normalization." };

  const at = semanticTokens(a.folded), bt = semanticTokens(b.folded);
  const metrics = setMetrics(at, bt);
  const aAnchors = factualAnchors(a.value), bAnchors = factualAnchors(b.value);
  const anchorsDiffer = aAnchors.length > 0 && bAnchors.length > 0 && !sameStringSet(aAnchors, bAnchors);
  const negationDiffers = hasNegation(at) !== hasNegation(bt);

  if (anchorsDiffer) {
    return { relation: "factual_disagreement", conflict: true, severity: "high", explanation: `Free-text values contain different factual anchors (${aAnchors.join(", ")} vs ${bAnchors.join(", ")}).` };
  }
  if (negationDiffers && (metrics.containment >= 0.55 || metrics.jaccard >= 0.4)) {
    return { relation: "logical_contradiction", conflict: true, severity: "high", explanation: "The statements share the same subject/content but differ in explicit negation or availability polarity." };
  }
  if (metrics.sameSet && at.length >= 2) {
    return { relation: "semantic_equivalent", conflict: false, severity: "none", explanation: "The same meaningful terms are present after normalization; word order or surface phrasing differs." };
  }
  if ((metrics.containment >= 0.84 && metrics.jaccard >= 0.58) || metrics.jaccard >= 0.76) {
    return { relation: "semantic_equivalent", conflict: false, severity: "none", explanation: `High semantic-token overlap (${Math.round(metrics.jaccard * 100)}% Jaccard; ${Math.round(metrics.containment * 100)}% containment) indicates equivalent wording, not a contradiction.` };
  }
  if (TEXT_VARIATION_PREDICATES.test(predicate)) {
    if (metrics.containment >= 0.55 || metrics.jaccard >= 0.35) {
      return { relation: "wording_variation", conflict: false, severity: "low", explanation: `Free-text ${predicate} values express overlapping content with different wording/detail (${Math.round(metrics.containment * 100)}% containment).` };
    }
    return { relation: "wording_variation", conflict: false, severity: "low", explanation: `Free-text ${predicate} wording differs, but no incompatible factual anchor or explicit logical contradiction was detected.` };
  }
  if (IDENTITY_PREDICATES.test(predicate)) {
    return { relation: "factual_disagreement", conflict: true, severity: "high", explanation: "Identity-like text values differ after normalization and semantic token comparison." };
  }
  return { relation: "factual_disagreement", conflict: true, severity: STABLE_PREDICATES.test(predicate) ? "high" : "medium", explanation: "Text values differ materially after normalization and semantic comparison." };
}

function numericRange(value: NormalizedEvidenceValue): { min: number | null; max: number | null; exact: boolean; value: number } | undefined {
  if (value.kind === "number") return { min: value.min ?? (value.exact ? value.value : null), max: value.max ?? (value.exact ? value.value : null), exact: value.exact, value: value.value };
  if (value.kind === "money") return { min: value.min ?? (value.exact ? value.amount : null), max: value.max ?? (value.exact ? value.amount : null), exact: value.exact, value: value.amount };
  return undefined;
}

function overlaps(a: { min: number | null; max: number | null }, b: { min: number | null; max: number | null }): boolean {
  const amin = a.min ?? Number.NEGATIVE_INFINITY;
  const amax = a.max ?? Number.POSITIVE_INFINITY;
  const bmin = b.min ?? Number.NEGATIVE_INFINITY;
  const bmax = b.max ?? Number.POSITIVE_INFINITY;
  return amin <= bmax && bmin <= amax;
}

function compareValues(a: NormalizedEvidenceValue, b: NormalizedEvidenceValue, predicate: string): Comparison {
  if (a.kind !== b.kind) {
    const ar = numericRange(a), br = numericRange(b);
    if (ar && br) return compareValues({ kind: "number", value: ar.value, exact: ar.exact, min: ar.min, max: ar.max, comparator: ar.exact ? "eq" : "range" }, { kind: "number", value: br.value, exact: br.exact, min: br.min, max: br.max, comparator: br.exact ? "eq" : "range" }, predicate);
    return { relation: "type_conflict", conflict: true, severity: "medium", explanation: `Normalized value types differ (${a.kind} vs ${b.kind}).` };
  }
  if (a.kind === "number" && b.kind === "number") {
    if (a.exact && b.exact && a.value === b.value) return { relation: "exact_match", conflict: false, severity: "none", explanation: "Exact numeric values match." };
    if (overlaps({ min: a.min ?? null, max: a.max ?? null }, { min: b.min ?? null, max: b.max ?? null })) {
      return { relation: a.exact === b.exact ? "normalized_match" : "compatible_range", conflict: false, severity: "none", explanation: "Numeric statements are logically compatible after range/approximation normalization." };
    }
    if (VOLATILE_PREDICATES.test(predicate)) return { relation: "numeric_drift", conflict: false, severity: "low", explanation: "Volatile metric values differ; treat as representation/temporal drift rather than an immediate logical contradiction." };
    return { relation: "value_conflict", conflict: true, severity: "high", explanation: "Numeric ranges do not overlap." };
  }
  if (a.kind === "money" && b.kind === "money") {
    if (a.currency && b.currency && a.currency !== b.currency) return { relation: "currency_conflict", conflict: true, severity: "high", explanation: `Currencies differ (${a.currency} vs ${b.currency}).` };
    if (a.cadence && b.cadence && a.cadence !== b.cadence) return { relation: "value_conflict", conflict: true, severity: "medium", explanation: `Billing cadence differs (${a.cadence} vs ${b.cadence}).` };
    if (overlaps({ min: a.min ?? a.amount, max: a.max ?? a.amount }, { min: b.min ?? b.amount, max: b.max ?? b.amount })) return { relation: a.amount === b.amount ? "exact_match" : "compatible_range", conflict: false, severity: "none", explanation: "Price values are compatible after normalization." };
    return { relation: "value_conflict", conflict: true, severity: "high", explanation: "Price values differ." };
  }
  if (a.kind === "date" && b.kind === "date") {
    const da = a.precision === "date" ? a.value.slice(0, 10) : a.value;
    const db = b.precision === "date" ? b.value.slice(0, 10) : b.value;
    if (da === db || a.value.slice(0, 10) === b.value.slice(0, 10)) return { relation: a.value === b.value ? "exact_match" : "normalized_match", conflict: false, severity: "none", explanation: "Dates refer to the same calendar date after precision normalization." };
    return { relation: "date_conflict", conflict: true, severity: "medium", explanation: "Date values differ." };
  }
  if (a.kind === "url" && b.kind === "url") return a.value === b.value ? { relation: "exact_match", conflict: false, severity: "none", explanation: "Canonicalized URLs match." } : { relation: "value_conflict", conflict: true, severity: STABLE_PREDICATES.test(predicate) ? "high" : "medium", explanation: "Canonicalized URLs differ." };
  if (a.kind === "string" && b.kind === "string") return compareTextValues(a, b, predicate);
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value ? { relation: "exact_match", conflict: false, severity: "none", explanation: "Boolean values match." } : { relation: "logical_contradiction", conflict: true, severity: "high", explanation: "Boolean values express opposite truth states." };
  return JSON.stringify(a) === JSON.stringify(b) ? { relation: "exact_match", conflict: false, severity: "none", explanation: "Values match." } : { relation: "value_conflict", conflict: true, severity: "medium", explanation: "Structured values differ." };
}

function observationScore(observation: EvidenceObservation, predicate: string): number {
  let score = observation.quality.extractionConfidence * 0.35 + observation.quality.sourceAuthority * 0.4 + observation.quality.freshnessConfidence * 0.25;
  const normalized = observation.normalizedValue;
  if ((normalized.kind === "number" || normalized.kind === "money") && normalized.exact) score += 0.04;
  if (VOLATILE_PREDICATES.test(predicate) && observation.source.representation === "rendered_dom" && observation.source.layer === "visible_dom") score += 0.08;
  if (/price/i.test(predicate) && observation.source.representation === "rendered_dom" && observation.source.layer === "visible_dom") score += 0.08;
  if (observation.source.layer === "api" && VOLATILE_PREDICATES.test(predicate)) score += 0.06;
  return Math.min(1, score);
}

function resolvedDisplay(normalized: NormalizedEvidenceValue): JsonValue {
  if (normalized.kind === "number") return normalized.exact ? normalized.value : { value: normalized.value, min: normalized.min, max: normalized.max, approximate: Boolean(normalized.approximate), comparator: normalized.comparator } as unknown as JsonValue;
  if (normalized.kind === "money") return { amount: normalized.amount, currency: normalized.currency || null, cadence: normalized.cadence || null, min: normalized.min, max: normalized.max } as unknown as JsonValue;
  if (normalized.kind === "date" || normalized.kind === "url" || normalized.kind === "string") return normalized.value;
  if (normalized.kind === "boolean") return normalized.value;
  return normalized.value;
}

function resolveGroup(subject: string, predicate: string, observations: EvidenceObservation[]): ResolvedClaim {
  const comparisons: ClaimConflict[] = [];
  let hardConflict = false;
  let drift = false;
  let compatible = false;
  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      const a = observations[i], b = observations[j];
      const comparison = compareValues(a.normalizedValue, b.normalizedValue, predicate);
      if (["compatible_range", "semantic_equivalent", "wording_variation"].includes(comparison.relation)) compatible = true;
      if (["numeric_drift", "temporal_drift", "precision_difference"].includes(comparison.relation)) drift = true;
      if (comparison.conflict) hardConflict = true;
      if (comparison.relation !== "exact_match" && comparison.relation !== "normalized_match") comparisons.push({ observationIds: [a.id, b.id], relation: comparison.relation, severity: comparison.severity, explanation: comparison.explanation });
    }
  }

  const flags: string[] = [];
  const relations = new Set(comparisons.map(x => x.relation));
  if (relations.has("semantic_equivalent")) flags.push("semantic_equivalence");
  if (relations.has("wording_variation")) flags.push("wording_variation");
  if (relations.has("factual_disagreement")) flags.push("factual_disagreement");
  if (relations.has("logical_contradiction")) flags.push("logical_contradiction");
  const representations = new Set(observations.map(x => x.source.representation));
  const layers = new Set(observations.map(x => x.source.layer));
  const normalizedStrings = new Set(observations.map(x => JSON.stringify(x.normalizedValue)));
  if (representations.has("source_html") && representations.has("rendered_dom") && normalizedStrings.size > 1) flags.push("representation_drift");
  if ((layers.has("json_ld") || layers.has("microdata") || layers.has("rdfa")) && layers.has("visible_dom") && normalizedStrings.size > 1) flags.push("structured_vs_visible_mismatch");
  if ((layers.has("meta") || layers.has("open_graph") || layers.has("twitter_card")) && layers.has("visible_dom") && normalizedStrings.size > 1) flags.push("metadata_vs_visible_mismatch");
  const numberKinds = observations.map(x => x.normalizedValue).filter((x): x is Extract<NormalizedEvidenceValue, { kind: "number" }> => x.kind === "number");
  if (numberKinds.some(x => x.exact) && numberKinds.some(x => !x.exact)) flags.push("precision_difference");
  if (VOLATILE_PREDICATES.test(predicate) && flags.includes("representation_drift")) flags.push("freshness_divergence");

  const renderedExact = observations.filter(x => x.source.representation === "rendered_dom" && x.source.layer === "visible_dom" && x.normalizedValue.kind === "number" && x.normalizedValue.exact).sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];
  const staticNumeric = observations.filter(x => ["meta", "open_graph", "twitter_card", "source_html"].includes(x.source.layer) && x.normalizedValue.kind === "number").sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate))[0];
  if (renderedExact && staticNumeric && renderedExact.normalizedValue.kind === "number" && staticNumeric.normalizedValue.kind === "number") {
    const current = renderedExact.normalizedValue.value;
    const previous = staticNumeric.normalizedValue.value;
    const delta = Math.abs(current - previous);
    if (current > previous && delta / Math.max(1, previous) >= 0.05) flags.push("stale_metadata_suspected");
  }

  const ranked = [...observations].sort((a, b) => observationScore(b, predicate) - observationScore(a, predicate));
  const preferred = ranked[0];
  const status: ResolvedClaim["status"] = observations.length < 2 ? "insufficient_evidence" : hardConflict ? "conflict" : drift || flags.includes("representation_drift") || flags.includes("metadata_vs_visible_mismatch") ? "drift" : compatible ? "compatible_variation" : "consensus";
  const explanation = [
    `Selected ${preferred.source.layer}/${preferred.source.representation} using extraction, source-authority and freshness dimensions.`,
    observations.length > 1 ? `${observations.length} observations compared across ${representations.size} representation(s) and ${layers.size} evidence layer(s).` : "Only one observation is available for this claim."
  ];
  if (flags.includes("stale_metadata_suspected")) explanation.push("A higher exact rendered value materially exceeds a static metadata value; metadata staleness is suspected, not asserted as fact.");
  if (flags.includes("precision_difference")) explanation.push("Approximate/lower-bound and exact values are treated as compatible when their numeric ranges overlap.");
  if (flags.includes("semantic_equivalence")) explanation.push("Surface wording differs, but deterministic semantic-token comparison found equivalent meaning without conflicting factual anchors.");
  if (flags.includes("wording_variation")) explanation.push("Free-text wording/detail varies without evidence of a factual or logical contradiction.");
  if (flags.includes("logical_contradiction")) explanation.push("A true logical contradiction was detected from explicit polarity/negation over substantially shared content.");
  if (flags.includes("factual_disagreement")) explanation.push("The compared values contain materially different factual content or identity anchors.");
  const claimHash = hash(JSON.stringify({ subject, predicate, observations: observations.map(x => x.id).sort() }));
  return {
    id: `claim_${claimHash.slice(0, 24)}`,
    subject,
    predicate,
    value: preferred.normalizedValue,
    displayValue: resolvedDisplay(preferred.normalizedValue),
    status,
    observationIds: observations.map(x => x.id),
    flags: unique(flags),
    resolution: { preferredObservationId: preferred.id, confidence: observationScore(preferred, predicate), policy: VOLATILE_PREDICATES.test(predicate) ? "field-policy:volatile-metric-v1" : STABLE_PREDICATES.test(predicate) ? "field-policy:stable-field-v1" : "field-policy:generic-v1", explanation },
    conflicts: comparisons
  };
}

export function buildProvenanceReport(pages: PageSignal[]): ProvenanceReport {
  const observations = [...new Map(pages.flatMap(page => page.observations || page.representations?.flatMap(rep => rep.observations) || []).map(obs => [obs.id, obs])).values()];
  const groups = new Map<string, EvidenceObservation[]>();
  for (const observation of observations) {
    const key = `${observation.subject}\u0000${observation.predicate}`;
    const current = groups.get(key) || [];
    current.push(observation);
    groups.set(key, current);
  }
  const claims = [...groups.entries()].map(([key, items]) => {
    const split = key.indexOf("\u0000");
    return resolveGroup(key.slice(0, split), key.slice(split + 1), items);
  }).sort((a, b) => a.predicate.localeCompare(b.predicate) || a.subject.localeCompare(b.subject));
  const warnings: string[] = [];
  const conflictClaims = claims.filter(x => x.status === "conflict");
  const driftClaims = claims.filter(x => x.status === "drift");
  const stale = claims.filter(x => x.flags.includes("stale_metadata_suspected"));
  if (conflictClaims.length) warnings.push(`${conflictClaims.length} claim(s) contain non-compatible field-level conflicts.`);
  if (driftClaims.length) warnings.push(`${driftClaims.length} claim(s) show representation or temporal drift.`);
  if (stale.length) warnings.push(`${stale.length} claim(s) have metadata staleness signals; confirm with repeated observations before treating staleness as definitive.`);
  return {
    schemaVersion: "1.0",
    generatedAt: nowIso(),
    observations,
    claims,
    summary: {
      totalObservations: observations.length,
      totalClaims: claims.length,
      consensusClaims: claims.filter(x => x.status === "consensus").length,
      compatibleClaims: claims.filter(x => x.status === "compatible_variation").length,
      driftClaims: driftClaims.length,
      conflictClaims: conflictClaims.length,
      staleMetadataSuspected: stale.length,
      layers: unique(observations.map(x => x.source.layer)).sort(),
      representations: unique(observations.map(x => x.source.representation)).sort()
    },
    warnings
  };
}

export function inspectProvenance(report: ProvenanceReport, predicate?: string, limit = 100) {
  const query = String(predicate || "").trim().toLowerCase();
  const claims = report.claims.filter(claim => !query || claim.predicate.toLowerCase() === query || claim.predicate.toLowerCase().includes(query)).slice(0, Math.max(1, Math.min(500, limit)));
  const ids = new Set(claims.flatMap(claim => claim.observationIds));
  return { schemaVersion: report.schemaVersion, generatedAt: report.generatedAt, summary: report.summary, claims, observations: report.observations.filter(obs => ids.has(obs.id)), warnings: report.warnings };
}

export function verifyClaim(report: ProvenanceReport, predicate: string, claimedValue: JsonValue) {
  const normalized = normalizeEvidenceValue(claimedValue, predicate);
  const matches = report.claims.filter(claim => claim.predicate.toLowerCase() === predicate.toLowerCase() || claim.predicate.toLowerCase().includes(predicate.toLowerCase()));
  if (!matches.length) return { status: "not_found" as const, predicate, claimedValue, normalized, explanation: "No matching predicate was observed in collected evidence." };
  const evaluated = matches.map(claim => {
    const comparison = compareValues(claim.value, normalized, claim.predicate);
    const status = comparison.conflict ? "contradicted" : comparison.relation === "exact_match" || comparison.relation === "normalized_match" ? "supported" : "compatible";
    return { claimId: claim.id, predicate: claim.predicate, status, relation: comparison.relation, severity: comparison.severity, explanation: comparison.explanation, resolvedValue: claim.displayValue, confidence: claim.resolution.confidence, observationIds: claim.observationIds };
  }).sort((a, b) => ({ supported: 3, compatible: 2, contradicted: 1 }[b.status] || 0) - ({ supported: 3, compatible: 2, contradicted: 1 }[a.status] || 0) || b.confidence - a.confidence);
  return { status: evaluated[0].status, predicate, claimedValue, normalized, matches: evaluated };
}

export function provenanceContradictions(report: ProvenanceReport): string[] {
  return report.claims.filter(claim => claim.status === "conflict").slice(0, 50).map(claim => `Field-level conflict for ${claim.predicate}: ${claim.conflicts.map(x => x.relation).join(", ")}.`);
}

export function provenanceWarnings(report: ProvenanceReport): string[] {
  return [...report.warnings, ...report.claims.filter(claim => claim.flags.includes("structured_vs_visible_mismatch")).slice(0, 25).map(claim => `Structured data and visible content differ for ${claim.predicate}.`), ...report.claims.filter(claim => claim.flags.includes("stale_metadata_suspected")).slice(0, 25).map(claim => `Possible stale metadata for ${claim.predicate}; rendered content is materially newer/higher.`)];
}

export function exportProvJson(report: ProvenanceReport) {
  const entity: Record<string, unknown> = {};
  const activity: Record<string, unknown> = {};
  const wasDerivedFrom: Record<string, unknown> = {};
  for (const observation of report.observations) {
    entity[observation.id] = { "prov:type": "EvidenceObservation", predicate: observation.predicate, value: observation.rawValue, source: observation.source, temporal: observation.temporal, integrity: observation.integrity };
  }
  for (const claim of report.claims) {
    entity[claim.id] = { "prov:type": "ResolvedClaim", predicate: claim.predicate, value: claim.displayValue, status: claim.status, flags: claim.flags };
    const activityId = `resolve_${claim.id}`;
    activity[activityId] = { "prov:type": "ClaimResolution", policy: claim.resolution.policy, confidence: claim.resolution.confidence, generatedAt: report.generatedAt };
    claim.observationIds.forEach((observationId, index) => { wasDerivedFrom[`${claim.id}_${index}`] = { "prov:generatedEntity": claim.id, "prov:usedEntity": observationId, "prov:activity": activityId }; });
  }
  return {
    prefix: { prov: "http://www.w3.org/ns/prov#", uia: `${PROJECT.repo}#` },
    entity,
    activity,
    agent: { "url-intelligence-agent": { "prov:type": "SoftwareAgent", name: PROJECT.name, version: PROJECT.version, creator: PROJECT.creator, repository: PROJECT.repo } },
    wasDerivedFrom
  };
}
