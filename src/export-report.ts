import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const EXPORT_BRAND = {
  name: "URL Intelligence Agent",
  creator: "Vincenzo Picciuolo",
  company: "HRN Innovation Technologies Ltd",
  github: "https://github.com/vpicciuolo/url-intelligence-agent",
  huggingFace: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",
  remoteMcp: "https://vpicciuolo-url-intelligence-agent.hf.space/mcp",
  tagline: "URL in. Identity, evidence and intelligence out."
} as const;

export type ExportReport = {
  id: string;
  userSub: string;
  username: string;
  url: string;
  action: string;
  createdAt: string;
  result: unknown;
};

type AnyRecord = Record<string, any>;

const safeJson = (value: unknown): string => {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

const actionTitle = (action: string): string => action === "investigate_url"
  ? "Full URL Investigation"
  : action.replace(/^audit_/, "").replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase());

const isRecord = (value: unknown): value is AnyRecord => Boolean(value && typeof value === "object" && !Array.isArray(value));
const asRecord = (value: unknown): AnyRecord => isRecord(value) ? value : {};
const asArray = <T = any>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const asText = (value: unknown, fallback = "Not available"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};
const humanize = (value: string): string => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());
const percentage = (value: unknown): string => typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "Not available";

export function exportAttribution(): Record<string, string> {
  return { ...EXPORT_BRAND };
}

async function logoBuffer(): Promise<Buffer | undefined> {
  const dir = process.env.URL_AGENT_ASSET_DIR;
  if (!dir) return undefined;
  try {
    const encoded = (await readFile(join(dir, "logo.base64.txt"), "utf8")).trim();
    if (encoded.length > 100) return Buffer.from(encoded, "base64");
  } catch { /* optional brand asset */ }
  try {
    const raw = await readFile(join(dir, "logo.jpg"));
    if (raw.length > 100) return raw;
  } catch { /* optional brand asset */ }
  return undefined;
}

function watermark(doc: any, page: number, count: number): void {
  const w = doc.page.width;
  const h = doc.page.height;
  const line = `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`;
  doc.save();
  doc.fillColor("#334155").fillOpacity(0.045).font("Helvetica-Bold").fontSize(10);
  doc.rotate(-28, { origin: [w / 2, h / 2] });
  doc.text(line, 52, h / 2 - 12, { width: w - 104, align: "center" });
  doc.restore();
  doc.save();
  doc.fillOpacity(1).strokeColor("#CBD5E1").lineWidth(0.5).moveTo(42, h - 44).lineTo(w - 42, h - 44).stroke();
  doc.fillColor("#64748B").font("Helvetica").fontSize(6.2).text(line, 42, h - 37, { width: w - 84, align: "center" });
  doc.text(`Page ${page} / ${count}`, 42, h - 23, { width: w - 84, align: "center" });
  doc.restore();
}

function ensureRoom(doc: any, needed = 90): void {
  const bottom = doc.page.height - 66;
  if (doc.y + needed > bottom) doc.addPage();
}

function sectionTitle(doc: any, title: string, subtitle?: string): void {
  ensureRoom(doc, subtitle ? 84 : 56);
  doc.moveDown(0.75);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(15).text(title);
  doc.moveTo(48, doc.y + 4).lineTo(doc.page.width - 48, doc.y + 4).strokeColor("#D7E2EE").lineWidth(0.8).stroke();
  doc.moveDown(0.65);
  if (subtitle) doc.fillColor("#64748B").font("Helvetica").fontSize(8.7).text(subtitle, { lineGap: 1.5 });
}

function subsection(doc: any, title: string): void {
  ensureRoom(doc, 42);
  doc.moveDown(0.55);
  doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(10.8).text(title);
  doc.moveDown(0.25);
}

function paragraph(doc: any, text: string, opts: AnyRecord = {}): void {
  if (!text) return;
  ensureRoom(doc, 34);
  doc.fillColor(opts.color || "#334155").font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 8.8).text(text, {
    lineGap: opts.lineGap ?? 2,
    link: opts.link,
    underline: Boolean(opts.link),
    width: doc.page.width - 96
  });
  doc.moveDown(opts.after ?? 0.3);
}

function bullet(doc: any, text: string, color = "#334155"): void {
  if (!text) return;
  ensureRoom(doc, 28);
  doc.fillColor(color).font("Helvetica").fontSize(8.6).text(`• ${text}`, 60, doc.y, { width: doc.page.width - 120, lineGap: 1.6 });
  doc.moveDown(0.2);
}

function keyValue(doc: any, label: string, value: unknown, opts: AnyRecord = {}): void {
  const text = asText(value);
  ensureRoom(doc, 25);
  const x = 48;
  const width = doc.page.width - 96;
  doc.fillColor("#64748B").font("Helvetica-Bold").fontSize(7.5).text(label.toUpperCase(), x, doc.y, { width: 128 });
  const y = doc.y - 8.5;
  doc.fillColor(opts.color || "#1E293B").font("Helvetica").fontSize(8.7).text(text, x + 134, y, {
    width: width - 134,
    link: opts.link,
    underline: Boolean(opts.link),
    lineGap: 1.2
  });
  doc.moveDown(0.45);
}

function callout(doc: any, title: string, text: string, tone: "info" | "warn" | "good" = "info"): void {
  ensureRoom(doc, 72);
  const palette = tone === "warn"
    ? { bg: "#FFF8E6", border: "#D7A62A", title: "#7A5600", text: "#5D4A20" }
    : tone === "good"
      ? { bg: "#ECFDF5", border: "#4CAF8A", title: "#176B52", text: "#24584A" }
      : { bg: "#EFF8FF", border: "#5BA7D8", title: "#1E5B85", text: "#31566E" };
  const width = doc.page.width - 96;
  const height = Math.max(62, doc.heightOfString(text, { width: width - 24, lineGap: 1.5 }) + 35);
  const y = doc.y;
  doc.roundedRect(48, y, width, height, 8).fillAndStroke(palette.bg, palette.border);
  doc.fillColor(palette.title).font("Helvetica-Bold").fontSize(9).text(title, 60, y + 10, { width: width - 24 });
  doc.fillColor(palette.text).font("Helvetica").fontSize(8.2).text(text, 60, y + 26, { width: width - 24, lineGap: 1.5 });
  doc.y = y + height + 8;
}

function scoreTone(score: number): string {
  if (score >= 80) return "#14866D";
  if (score >= 60) return "#2C6DA4";
  if (score >= 40) return "#A66B00";
  return "#B64242";
}

function auditBlock(doc: any, name: string, value: unknown): void {
  const audit = asRecord(value);
  if (!Object.keys(audit).length) return;
  const score = typeof audit.score === "number" ? Math.round(audit.score) : undefined;
  ensureRoom(doc, 72);
  const y = doc.y;
  const width = doc.page.width - 96;
  doc.roundedRect(48, y, width, 52, 8).fillAndStroke("#F8FAFC", "#D8E2EC");
  doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(10.5).text(name, 60, y + 10);
  doc.fillColor(score === undefined ? "#64748B" : scoreTone(score)).font("Helvetica-Bold").fontSize(17).text(score === undefined ? "N/A" : `${score}/100`, 60, y + 25);
  const issueCount = asArray(audit.issues).length;
  const warningCount = asArray(audit.warnings).length;
  doc.fillColor("#64748B").font("Helvetica").fontSize(8).text(`${issueCount} issue${issueCount === 1 ? "" : "s"} · ${warningCount} warning${warningCount === 1 ? "" : "s"}`, 152, y + 28);
  doc.y = y + 60;
  if (asArray(audit.issues).length) {
    subsection(doc, `${name} — issues`);
    asArray(audit.issues).slice(0, 12).forEach(item => bullet(doc, asText(item), "#7F1D1D"));
  }
  if (asArray(audit.warnings).length) {
    subsection(doc, `${name} — warnings`);
    asArray(audit.warnings).slice(0, 12).forEach(item => bullet(doc, asText(item), "#7C5A00"));
  }
  const checks = asRecord(audit.checks);
  if (Object.keys(checks).length) {
    subsection(doc, `${name} — observed checks`);
    Object.entries(checks).slice(0, 30).forEach(([key, v]) => keyValue(doc, humanize(key), typeof v === "object" ? safeJson(v) : v));
  }
}

function evidenceField(doc: any, label: string, value: unknown): void {
  const field = asRecord(value);
  if (!Object.keys(field).length) return;
  subsection(doc, label);
  keyValue(doc, "Observed value", field.value);
  keyValue(doc, "Extraction confidence", percentage(field.confidence));
  keyValue(doc, "Method", field.method);
  const sources = asArray<string>(field.sources).filter(Boolean);
  if (sources.length) {
    paragraph(doc, "Supporting first-party sources", { bold: true, size: 8.2, after: 0.1 });
    sources.slice(0, 20).forEach(url => paragraph(doc, url, { color: "#2563EB", link: url, size: 7.8, after: 0.08 }));
  }
}

function renderWebResearch(doc: any, result: AnyRecord): void {
  const research = asRecord(result.webResearch);
  if (!Object.keys(research).length) return;
  sectionTitle(doc, "Independent web evidence & source diversity", "External corroboration is reported separately from extraction confidence so first-party claims are not mistaken for independent verification.");
  keyValue(doc, "Coverage level", asText(research.coverageLevel, "none").toUpperCase());
  keyValue(doc, "Coverage score", typeof research.sourceCoverageScore === "number" ? `${research.sourceCoverageScore}/100` : "Not available");
  keyValue(doc, "Search provider", research.searchProvider || (research.searchConfigured ? "Configured" : "Not configured"));
  keyValue(doc, "Candidate external URLs", research.candidateUrls);
  keyValue(doc, "Fetched external sources", research.fetchedSources);
  keyValue(doc, "Corroborating third-party sources", research.corroboratingThirdPartySources);
  keyValue(doc, "Independent third-party domains", research.corroboratingThirdPartyDomains);
  keyValue(doc, "Platform sources", research.platformSources);

  if (!research.searchConfigured) {
    callout(doc, "Coverage limitation", "No external search provider was configured for this run. The agent can still inspect off-site URLs exposed by the target, but it cannot claim broad web-wide backlink or article discovery from those links alone.", "warn");
  } else {
    callout(doc, "Cross-web discovery active", `External search discovery was active through ${asText(research.searchProvider, "the configured provider")}. Search results and off-site references were fetched and evaluated separately from the target website.`, "good");
  }

  const queries = asArray<string>(research.queries);
  if (queries.length) {
    subsection(doc, "Research queries");
    queries.forEach(q => bullet(doc, q));
  }

  const sources = asArray<AnyRecord>(research.sources);
  if (sources.length) {
    subsection(doc, `External source register (${sources.length})`);
    sources.forEach((source, index) => {
      ensureRoom(doc, 82);
      const title = asText(source.title || source.searchTitle || source.url, `Source ${index + 1}`);
      doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(8.8).text(`${index + 1}. ${title}`);
      const finalUrl = asText(source.finalUrl || source.url, "");
      if (finalUrl) paragraph(doc, finalUrl, { color: "#2563EB", link: finalUrl, size: 7.5, after: 0.08 });
      const meta = [
        asText(source.sourceClass, "external"),
        source.mentionsEntity ? "entity mention observed" : "no explicit entity mention",
        source.fetched ? `fetched${source.status ? ` · HTTP ${source.status}` : ""}` : "not fetched",
        source.publishedAt ? `published ${source.publishedAt}` : ""
      ].filter(Boolean).join(" · ");
      paragraph(doc, meta, { color: "#64748B", size: 7.5, after: 0.08 });
      if (source.description || source.searchSnippet) paragraph(doc, asText(source.description || source.searchSnippet), { size: 7.7, after: 0.15 });
      if (source.error) paragraph(doc, `Collection note: ${asText(source.error)}`, { color: "#9A6700", size: 7.6, after: 0.2 });
    });
  }

  const notes = asArray<string>(research.notes);
  if (notes.length) {
    subsection(doc, "Research notes & limitations");
    notes.forEach(note => bullet(doc, note));
  }
}

function renderTechnologies(doc: any, result: AnyRecord): void {
  const technologies = asArray<AnyRecord>(result.technologies);
  if (!technologies.length) return;
  sectionTitle(doc, `Technology intelligence (${technologies.length})`, "Detected technologies are observable public fingerprints, not proof of private infrastructure or implementation details.");
  technologies.forEach((tech, index) => {
    ensureRoom(doc, 58);
    doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(9).text(`${index + 1}. ${asText(tech.name, "Technology")}`);
    const meta = [asText(tech.category, "uncategorized"), typeof tech.confidence === "number" ? `${Math.round(tech.confidence * 100)}% confidence` : "", tech.version ? `version ${tech.version}` : ""].filter(Boolean).join(" · ");
    paragraph(doc, meta, { color: "#64748B", size: 7.7, after: 0.08 });
    asArray<string>(tech.evidence).slice(0, 6).forEach(ev => bullet(doc, ev));
  });
}

function renderGraph(doc: any, result: AnyRecord): void {
  const graph = asRecord(result.graph);
  const nodes = asArray<AnyRecord>(graph.nodes);
  const edges = asArray<AnyRecord>(graph.edges);
  if (!nodes.length && !edges.length) return;
  sectionTitle(doc, "Entity & relationship graph", "Relationship signals remain evidence-linked where the runtime provides supporting URLs or observations.");
  if (nodes.length) {
    subsection(doc, `Nodes (${nodes.length})`);
    nodes.slice(0, 60).forEach((node, index) => {
      const line = `${index + 1}. ${asText(node.label || node.id, "Node")} · ${asText(node.type, "unknown type")}${typeof node.confidence === "number" ? ` · ${Math.round(node.confidence * 100)}% confidence` : ""}`;
      bullet(doc, line);
      if (node.url) paragraph(doc, asText(node.url), { color: "#2563EB", link: asText(node.url), size: 7.5, after: 0.06 });
    });
  }
  if (edges.length) {
    subsection(doc, `Edges (${edges.length})`);
    edges.slice(0, 80).forEach((edge, index) => {
      bullet(doc, `${index + 1}. ${asText(edge.from)} → ${asText(edge.to)} · ${asText(edge.type)}${typeof edge.confidence === "number" ? ` · ${Math.round(edge.confidence * 100)}% confidence` : ""}`);
      asArray<string>(edge.evidence).slice(0, 3).forEach(url => paragraph(doc, url, { color: "#2563EB", link: url, size: 7.3, after: 0.05 }));
    });
  }
}

function renderPages(doc: any, result: AnyRecord): void {
  const pages = asArray<AnyRecord>(result.pages);
  if (!pages.length) return;
  sectionTitle(doc, `Crawl inventory (${pages.length} pages)`, "This appendix records the pages observed during the bounded crawl. It is intended for traceability, not as a raw code dump.");
  pages.forEach((page, index) => {
    ensureRoom(doc, 52);
    const status = typeof page.status === "number" ? `HTTP ${page.status}` : "status unavailable";
    doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(8.5).text(`${index + 1}. ${asText(page.title || page.url, "Observed page")}`);
    if (page.url) paragraph(doc, asText(page.url), { color: "#2563EB", link: asText(page.url), size: 7.4, after: 0.06 });
    paragraph(doc, `${status}${page.language ? ` · language ${page.language}` : ""}${typeof page.wordCount === "number" ? ` · ${page.wordCount} words` : ""}${page.rendered ? " · rendered" : ""}`, { color: "#64748B", size: 7.4, after: 0.12 });
  });
}

function renderCompetitors(doc: any, result: AnyRecord): void {
  const competitors = asArray<AnyRecord>(result.competitors);
  if (!competitors.length) return;
  sectionTitle(doc, `Competitive / alternative signals (${competitors.length})`, "Candidates are surfaced from observable evidence and should be reviewed rather than treated as definitive market classification.");
  competitors.forEach((item, index) => {
    ensureRoom(doc, 60);
    doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(8.8).text(`${index + 1}. ${asText(item.name, "Candidate")}`);
    if (item.url) paragraph(doc, asText(item.url), { color: "#2563EB", link: asText(item.url), size: 7.5, after: 0.06 });
    paragraph(doc, `${typeof item.confidence === "number" ? `${Math.round(item.confidence * 100)}% confidence · ` : ""}${asText(item.reason, "No reason supplied")}`, { size: 7.8, after: 0.1 });
    asArray<string>(item.evidence).slice(0, 6).forEach(ev => bullet(doc, ev));
  });
}

function renderRagInventory(doc: any, result: AnyRecord): void {
  const docs = asArray<AnyRecord>(result.rag);
  if (!docs.length) return;
  sectionTitle(doc, `RAG document inventory (${docs.length})`, "The PDF lists retrieval documents for traceability. Full machine-readable text remains available in the JSON/Markdown exports.");
  docs.forEach((item, index) => {
    ensureRoom(doc, 50);
    doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(8.5).text(`${index + 1}. ${asText(item.title || item.url, "RAG document")}`);
    if (item.url) paragraph(doc, asText(item.url), { color: "#2563EB", link: asText(item.url), size: 7.4, after: 0.05 });
    paragraph(doc, `${typeof item.wordCount === "number" ? `${item.wordCount} words` : "word count unavailable"}${item.checksum ? ` · checksum ${String(item.checksum).slice(0, 18)}…` : ""}`, { color: "#64748B", size: 7.3, after: 0.12 });
  });
}

function renderGenericReadable(doc: any, title: string, value: unknown, depth = 0): void {
  if (value === null || value === undefined) return;
  if (depth === 0) sectionTitle(doc, title);
  if (Array.isArray(value)) {
    if (!value.length) { paragraph(doc, "No items reported.", { color: "#64748B" }); return; }
    value.slice(0, 150).forEach((item, index) => {
      if (isRecord(item)) {
        subsection(doc, `${humanize(title)} ${index + 1}`);
        Object.entries(item).slice(0, 40).forEach(([key, child]) => {
          if (child === null || child === undefined || child === "") return;
          if (typeof child === "object") renderGenericReadable(doc, humanize(key), child, depth + 1);
          else keyValue(doc, humanize(key), child);
        });
      } else bullet(doc, asText(item));
    });
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).slice(0, 100).forEach(([key, child]) => {
      if (child === null || child === undefined || child === "") return;
      if (typeof child === "object") {
        subsection(doc, humanize(key));
        renderGenericReadable(doc, humanize(key), child, depth + 1);
      } else keyValue(doc, humanize(key), child);
    });
    return;
  }
  paragraph(doc, asText(value));
}

function renderInvestigationPdf(doc: any, report: ExportReport, result: AnyRecord): void {
  const entity = asRecord(result.entity);
  const nameField = asRecord(entity.name);
  const typeField = asRecord(entity.type);
  const confidence = asRecord(result.confidenceAssessment);
  const contradictions = asArray<string>(result.contradictions).filter(Boolean);
  const warnings = asArray<string>(result.warnings).filter(Boolean);

  sectionTitle(doc, "Executive summary", "A due-diligence style overview of the public evidence collected by this run. This document is designed for normal readers; machine-oriented raw data is intentionally kept in the JSON and Markdown exports.");
  keyValue(doc, "Entity", nameField.value || "Not resolved");
  keyValue(doc, "Entity type", typeField.value || "Not resolved");
  keyValue(doc, "Target", result.finalUrl || report.url, { link: result.finalUrl || report.url, color: "#2563EB" });
  keyValue(doc, "Observed", result.observedAt || report.createdAt);
  keyValue(doc, "Profile", result.profile || "full-intelligence");
  keyValue(doc, "First-party evidence pages", confidence.firstPartyEvidencePages ?? asArray(result.pages).length);
  keyValue(doc, "Extraction confidence", percentage(confidence.extractionConfidence));
  keyValue(doc, "External corroboration", percentage(confidence.externalCorroboration));
  keyValue(doc, "External coverage", asText(confidence.externalCoverageLevel, "none").toUpperCase());
  keyValue(doc, "Independent evidence domains", confidence.thirdPartyEvidenceDomains ?? 0);

  if (contradictions.length) callout(doc, "Contradictory evidence detected", `${contradictions.length} explicit contradiction${contradictions.length === 1 ? " was" : "s were"} reported. Review the contradiction register before relying on disputed claims.`, "warn");
  else callout(doc, "No explicit contradiction reported", "This run did not flag an explicit contradiction. That is not proof that every source agrees; it only describes what the current evidence pipeline detected.", "info");

  if (confidence.interpretation) callout(doc, "How to read confidence", asText(confidence.interpretation), "info");

  sectionTitle(doc, "Identity & entity resolution", "Identity fields show the observed value, extraction method and first-party sources supporting the extraction.");
  evidenceField(doc, "Entity name", entity.name);
  evidenceField(doc, "Entity type", entity.type);
  evidenceField(doc, "Description", entity.description);

  const audits = [
    ["SEO", result.seo],
    ["Security posture", result.security],
    ["Quality", result.quality],
    ["Trust & transparency", result.trust]
  ] as const;
  if (audits.some(([, value]) => Object.keys(asRecord(value)).length)) {
    sectionTitle(doc, "Assessment dashboard", "Scores summarize explainable public observations. They are not legal, financial, compliance or penetration-testing conclusions.");
    audits.forEach(([name, value]) => auditBlock(doc, name, value));
  }

  renderWebResearch(doc, result);

  const socials = asArray<string>(result.socials).filter(Boolean);
  const contacts = asRecord(result.contacts);
  const importantPages = asRecord(result.importantPages);
  if (socials.length || asArray(contacts.emails).length || asArray(contacts.phones).length || Object.keys(importantPages).length) {
    sectionTitle(doc, "Public presence, contacts & important pages");
    if (socials.length) {
      subsection(doc, `Social profiles (${socials.length})`);
      socials.forEach(url => paragraph(doc, url, { color: "#2563EB", link: url, size: 7.8, after: 0.08 }));
    }
    if (asArray<string>(contacts.emails).length) {
      subsection(doc, "Public emails");
      asArray<string>(contacts.emails).forEach(x => bullet(doc, x));
    }
    if (asArray<string>(contacts.phones).length) {
      subsection(doc, "Public phone signals");
      asArray<string>(contacts.phones).forEach(x => bullet(doc, x));
    }
    if (Object.keys(importantPages).length) {
      subsection(doc, "Important pages");
      Object.entries(importantPages).forEach(([key, url]) => keyValue(doc, humanize(key), url, { color: "#2563EB", link: typeof url === "string" ? url : undefined }));
    }
  }

  const brand = asRecord(result.brand);
  if (Object.keys(brand).length) {
    sectionTitle(doc, "Brand intelligence");
    if (brand.name) keyValue(doc, "Brand name", brand.name);
    for (const [label, values] of [["Taglines", brand.taglines], ["Colors", brand.colors], ["Handles", brand.handles], ["Logos", brand.logos], ["Favicons", brand.favicons]] as const) {
      const arr = asArray<string>(values).filter(Boolean);
      if (!arr.length) continue;
      subsection(doc, label);
      arr.slice(0, 30).forEach(item => /^https?:\/\//i.test(item) ? paragraph(doc, item, { color: "#2563EB", link: item, size: 7.7, after: 0.08 }) : bullet(doc, item));
    }
  }

  renderTechnologies(doc, result);
  renderCompetitors(doc, result);
  renderGraph(doc, result);

  if (contradictions.length || warnings.length) {
    sectionTitle(doc, "Risk, contradiction & warning register", "These items are deliberately kept visible so uncertainty is not hidden behind a single clean answer.");
    if (contradictions.length) {
      subsection(doc, `Contradictions (${contradictions.length})`);
      contradictions.forEach((item, index) => bullet(doc, `${index + 1}. ${item}`, "#8A2D2D"));
    }
    if (warnings.length) {
      subsection(doc, `Warnings (${warnings.length})`);
      warnings.forEach((item, index) => bullet(doc, `${index + 1}. ${item}`, "#7A5A00"));
    }
  }

  renderPages(doc, result);
  renderRagInventory(doc, result);

  const sitemapUrls = asArray<string>(result.sitemapUrls).filter(Boolean);
  if (sitemapUrls.length) {
    sectionTitle(doc, `Sitemap URL register (${sitemapUrls.length})`);
    sitemapUrls.slice(0, 300).forEach(url => paragraph(doc, url, { color: "#2563EB", link: url, size: 7.3, after: 0.05 }));
  }

  sectionTitle(doc, "Document methodology & limitations");
  bullet(doc, "The PDF is a human-readable presentation of the collected public evidence. It intentionally avoids a raw JSON/code dump.");
  bullet(doc, "Extraction confidence describes how strongly observable page signals support an extracted field. It is not a probability that a claim is true.");
  bullet(doc, "External corroboration measures breadth of independent third-party evidence observed by the configured research pipeline.");
  bullet(doc, "Public websites, search results, DNS records and platform pages can change after the observation timestamp.");
  bullet(doc, "Security scoring is not penetration testing; compliance signals are not legal advice; trust scoring is not a guarantee of an organization or person.");
  bullet(doc, "The JSON and Markdown exports preserve the machine-readable representation for reproducibility, downstream processing and developer review.");
}

export async function generatePdf(report: ExportReport): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    info: {
      Title: `${EXPORT_BRAND.name} — ${report.url}`,
      Author: EXPORT_BRAND.creator,
      Subject: `${actionTitle(report.action)} report`,
      Keywords: "URL intelligence, web intelligence, AI agent, MCP, SEO, security, trust, entity resolution, due diligence",
      Creator: `${EXPORT_BRAND.name} by ${EXPORT_BRAND.creator}`,
      Producer: `${EXPORT_BRAND.name} Hugging Face Space`
    }
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.rect(0, 0, doc.page.width, 136).fill("#07101C");
  const logo = await logoBuffer();
  if (logo) {
    try { doc.image(logo, 48, 25, { width: 78, height: 78, fit: [78, 78] }); } catch { /* keep report generation resilient */ }
  }
  const titleX = logo ? 142 : 48;
  doc.fillColor("#22D3EE").font("Helvetica-Bold").fontSize(8.5).text("PUBLIC WEB INTELLIGENCE · EVIDENCE REPORT", titleX, 34);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22).text(EXPORT_BRAND.name, titleX, 51);
  doc.fillColor("#CBD5E1").font("Helvetica").fontSize(8.5).text(EXPORT_BRAND.tagline, titleX, 81, { width: doc.page.width - titleX - 48 });
  doc.fillColor("#8EEFFF").font("Helvetica-Bold").fontSize(7.6).text("HUMAN-READABLE · DUE-DILIGENCE STYLE · SOURCE-TRACEABLE", titleX, 101);

  doc.y = 158;
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(19).text(actionTitle(report.action));
  doc.moveDown(0.25);
  doc.fillColor("#334155").font("Helvetica").fontSize(9).text(report.url, { width: doc.page.width - 96, link: report.url, underline: true });
  doc.moveDown(0.8);

  const result = asRecord(report.result);
  const entity = asRecord(asRecord(result.entity).name);
  const entityName = asText(entity.value, "Entity not resolved");
  const observedAt = asText(result.observedAt, report.createdAt);
  keyValue(doc, "Subject / entity", entityName);
  keyValue(doc, "Generated", new Date(report.createdAt).toUTCString());
  keyValue(doc, "Observed", observedAt);
  keyValue(doc, "Generated for", `@${report.username}`);
  keyValue(doc, "Report ID", report.id);

  callout(doc, "Report purpose", "This PDF is designed to read like a professional evidence and due-diligence document. Findings are organized into executive summary, identity, source corroboration, assessments, evidence registers and appendices rather than presenting the raw result as code.", "info");

  if (report.action === "investigate_url" && Object.keys(result).length) {
    renderInvestigationPdf(doc, report, result);
  } else if (Object.keys(result).length) {
    sectionTitle(doc, "Analysis findings", "This action returned structured data. The PDF formats it into readable sections; the raw machine representation remains available through JSON and Markdown export.");
    Object.entries(result).forEach(([key, value]) => renderGenericReadable(doc, humanize(key), value));
  } else {
    sectionTitle(doc, "Analysis result");
    paragraph(doc, asText(report.result, "No result was returned."));
  }

  sectionTitle(doc, "Project attribution");
  keyValue(doc, "Creator", EXPORT_BRAND.creator);
  keyValue(doc, "Company", EXPORT_BRAND.company);
  keyValue(doc, "GitHub", EXPORT_BRAND.github, { color: "#2563EB", link: EXPORT_BRAND.github });
  keyValue(doc, "Hugging Face", EXPORT_BRAND.huggingFace, { color: "#2563EB", link: EXPORT_BRAND.huggingFace });
  keyValue(doc, "Remote MCP", EXPORT_BRAND.remoteMcp, { color: "#2563EB", link: EXPORT_BRAND.remoteMcp });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    watermark(doc, i - range.start + 1, range.count);
  }
  doc.end();
  return finished;
}

export function generateJson(report: ExportReport): string {
  return JSON.stringify({
    report: { id: report.id, url: report.url, action: report.action, analysis: actionTitle(report.action), generatedAt: report.createdAt, generatedFor: `@${report.username}` },
    attribution: exportAttribution(),
    watermark: `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`,
    result: report.result
  }, null, 2);
}

export function generateMarkdown(report: ExportReport): string {
  const mark = `${EXPORT_BRAND.name} | GitHub: ${EXPORT_BRAND.github} | Hugging Face: ${EXPORT_BRAND.huggingFace} | Creator: ${EXPORT_BRAND.creator}`;
  return `# ${EXPORT_BRAND.name}\n\n**${EXPORT_BRAND.tagline}**\n\n> ${mark}\n\n## Report\n\n- Target: ${report.url}\n- Analysis: ${actionTitle(report.action)}\n- Generated: ${report.createdAt}\n- Hugging Face user: @${report.username}\n- Report ID: ${report.id}\n\n## Attribution\n\n- Creator: ${EXPORT_BRAND.creator}\n- Company: ${EXPORT_BRAND.company}\n- GitHub: ${EXPORT_BRAND.github}\n- Hugging Face: ${EXPORT_BRAND.huggingFace}\n- Remote MCP: ${EXPORT_BRAND.remoteMcp}\n\n## Complete analysis result\n\n\`\`\`json\n${safeJson(report.result)}\n\`\`\`\n\n---\n${mark}\n`;
}

export function generateHtml(report: ExportReport): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  const mark = `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(EXPORT_BRAND.name)} Report</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;background:#07101c;color:#eaf2ff}.wrap{max-width:1000px;margin:auto;padding:40px 40px 72px}.brand{display:flex;align-items:center;gap:18px}.brand img{width:76px;height:76px;border-radius:14px}.card{background:#0c1828;border:1px solid #263a57;border-radius:14px;padding:20px;margin:18px 0}pre{white-space:pre-wrap;word-break:break-word;background:#040912;padding:18px;border-radius:10px}.wm{position:fixed;bottom:0;left:0;right:0;background:#040912;color:#8da1bb;font-size:10px;padding:9px;text-align:center;border-top:1px solid #263a57}a{color:#22d3ee}@media print{body{background:#fff;color:#111}.card{background:#fff;border-color:#ccc}pre{background:#f5f5f5;color:#111}.wm{background:#fff;color:#777}}</style></head><body><main class="wrap"><div class="brand"><img src="https://vpicciuolo-url-intelligence-agent.hf.space/assets/logo.jpg" alt=""><div><h1>${esc(EXPORT_BRAND.name)}</h1><p>${esc(EXPORT_BRAND.tagline)}</p></div></div><section class="card"><h2>${esc(actionTitle(report.action))}</h2><p><b>Target:</b> ${esc(report.url)}</p><p><b>Generated:</b> ${esc(report.createdAt)}</p><p><b>User:</b> @${esc(report.username)}</p><p><b>Report ID:</b> ${esc(report.id)}</p></section><section class="card"><h2>Attribution</h2><p>Creator: ${esc(EXPORT_BRAND.creator)}</p><p>Company: ${esc(EXPORT_BRAND.company)}</p><p><a href="${EXPORT_BRAND.github}">${EXPORT_BRAND.github}</a></p><p><a href="${EXPORT_BRAND.huggingFace}">${EXPORT_BRAND.huggingFace}</a></p><p><a href="${EXPORT_BRAND.remoteMcp}">${EXPORT_BRAND.remoteMcp}</a></p></section><section class="card"><h2>Complete result</h2><pre>${esc(safeJson(report.result))}</pre></section></main><div class="wm">${esc(mark)}</div></body></html>`;
}

export function exportFilename(report: ExportReport, ext: string): string {
  let host = "url";
  try { host = new URL(report.url).hostname.replace(/[^a-z0-9.-]+/gi, "-"); } catch { /* noop */ }
  return `url-intelligence-${host}-${report.id.slice(0, 8)}.${ext}`;
}
