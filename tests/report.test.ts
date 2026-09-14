import test from "node:test";
import assert from "node:assert/strict";
import { generateHtml, generateJson, generateMarkdown, generatePdf } from "../src/export-report.js";

const sampleResult = {
  observedAt: "2026-09-14T17:23:00.790Z",
  finalUrl: "https://example.test/",
  profile: "full-intelligence",
  entity: {
    name: { value: "Example Entity", confidence: 0.92, method: "og-site-name", sources: ["https://example.test/"] },
    type: { value: "company", confidence: 0.81, method: "content-heuristics", sources: ["https://example.test/about"] },
    description: { value: "Example evidence-first entity.", confidence: 0.9, method: "claim-resolution", sources: ["https://example.test/"] }
  },
  confidenceAssessment: {
    extractionConfidence: 0.88,
    externalCorroboration: 0.5,
    firstPartyEvidencePages: 3,
    thirdPartyEvidenceDomains: 2,
    interpretation: "Extraction and corroboration are separate evidence dimensions."
  },
  seo: { score: 90, issues: [], warnings: ["Example warning"], checks: { title: true, description: true } },
  security: { score: 82, issues: [], warnings: ["Missing CSP"], checks: { https: true, csp: false } },
  quality: { score: 91, issues: [], warnings: [], checks: { language: true, wordCount: 450 } },
  trust: { score: 75, issues: [], warnings: ["No security page"], checks: { contact: true, legal: true } },
  webResearch: {
    coverageLevel: "moderate",
    sourceCoverageScore: 60,
    searchConfigured: true,
    searchProvider: "test",
    fetchedSources: 2,
    corroboratingThirdPartyDomains: 2,
    verifiedPlatformSources: 1,
    verifiedDirectReferenceSources: 1,
    sources: [
      { title: "Independent source", url: "https://source.test/a", sourceClass: "article", verificationStatus: "verified", mentionsEntity: true, fetched: true }
    ]
  },
  pages: Array.from({ length: 8 }, (_, i) => ({ title: `Page ${i + 1}`, url: `https://example.test/p${i + 1}`, status: 200, wordCount: 100 + i, rendered: i % 2 === 0 })),
  rag: Array.from({ length: 8 }, (_, i) => ({ title: `Document ${i + 1}`, url: `https://example.test/p${i + 1}`, wordCount: 100 + i, checksum: `checksum-${i}` })),
  sitemapUrls: Array.from({ length: 8 }, (_, i) => `https://example.test/p${i + 1}`),
  contradictions: ["One example contradiction"],
  warnings: ["One example warning"],
  provenance: {
    schemaVersion: "1.0",
    generatedAt: "2026-09-14T17:23:00.790Z",
    summary: { totalObservations: 4, totalClaims: 2, consensusClaims: 0, compatibleClaims: 1, driftClaims: 1, conflictClaims: 0, staleMetadataSuspected: 1 },
    observations: [
      { id: "o1", predicate: "metric:servers", rawValue: "80,000+", normalizedValue: { kind: "number", value: 80000, exact: false, min: 80000, max: null }, source: { layer: "open_graph", representation: "source_html" }, temporal: { observedAt: "2026-09-14T17:22:00Z" }, quality: { extractionConfidence: 0.9 } },
      { id: "o2", predicate: "server_count", rawValue: "100,502", normalizedValue: { kind: "number", value: 100502, exact: true, min: 100502, max: 100502 }, source: { layer: "visible_dom", representation: "rendered_dom" }, temporal: { observedAt: "2026-09-14T17:23:00Z" }, quality: { extractionConfidence: 0.95 } },
      { id: "o3", predicate: "description", rawValue: "Current description", normalizedValue: { kind: "string", value: "Current description" }, source: { layer: "visible_dom", representation: "rendered_dom" }, temporal: { observedAt: "2026-09-14T17:23:00Z" }, quality: { extractionConfidence: 0.9 } },
      { id: "o4", predicate: "description", rawValue: "Old description", normalizedValue: { kind: "string", value: "Old description" }, source: { layer: "open_graph", representation: "source_html" }, temporal: { observedAt: "2026-09-14T17:22:00Z" }, quality: { extractionConfidence: 0.85 } }
    ],
    claims: [
      { id: "c1", predicate: "metric:mcp_servers", displayValue: "100502", value: { kind: "number", value: 100502, exact: true }, status: "compatible_variation", observationIds: ["o1", "o2"], flags: ["semantic_cross_field_reconciliation", "precision_difference", "stale_metadata_suspected"], resolution: { preferredObservationId: "o2", confidence: 0.95, policy: "test", explanation: ["Semantically equivalent metric labels were reconciled.", "Dynamic exact evidence advances beyond metadata; stale metadata is suspected."] }, conflicts: [] },
      { id: "c2", predicate: "description", displayValue: "Current description", value: { kind: "string", value: "Current description" }, status: "drift", observationIds: ["o3", "o4"], flags: ["representation_drift"], resolution: { preferredObservationId: "o3", confidence: 0.9, policy: "test", explanation: ["Rendered content differs from source metadata."] }, conflicts: [{ observationIds: ["o3", "o4"], relation: "wording_variation", severity: "low", explanation: "Copy changed." }] }
    ],
    warnings: []
  }
};

const report = {
  id: "report-12345678",
  userSub: "1",
  username: "vpicciuolo",
  url: "https://example.test/",
  action: "investigate_url",
  createdAt: "2026-09-14T17:23:00.790Z",
  result: sampleResult
};

function pdfPageCount(buffer: Buffer): number {
  const source = buffer.toString("latin1");
  return (source.match(/\/Type\s*\/Page\b/g) || []).length;
}

test("v1.4 report suite keeps PDF pagination bounded and adds visual evidence sections", async () => {
  const pdf = await generatePdf(report);
  const pages = pdfPageCount(pdf);
  assert.ok(pdf.length > 10_000, `PDF unexpectedly small: ${pdf.length}`);
  assert.ok(pages >= 3, `Expected a multi-page report, got ${pages}`);
  assert.ok(pages <= 12, `Footer/watermark regression created too many pages: ${pages}`);
});

test("HTML report exposes the new v1.4 visual evidence sections", () => {
  const html = generateHtml(report);
  assert.match(html, /Semantic cross-field reconciliation/);
  assert.match(html, /Suspected stale metadata/);
  assert.match(html, /Conflict and drift register/);
  assert.match(html, /Evidence distribution/);
  assert.match(html, /<table>/);
});

test("Markdown and JSON reports include v1.4 reconciliation and summary data", () => {
  const markdown = generateMarkdown(report);
  const json = JSON.parse(generateJson(report));
  assert.match(markdown, /Semantic cross-field reconciliation/);
  assert.match(markdown, /Suspected stale metadata/);
  assert.equal(json.report.version, "1.4.0");
  assert.equal(json.summary.conflicts, 0);
  assert.equal(json.summary.staleMetadataSuspected, 1);
});
