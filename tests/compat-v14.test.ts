import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "../src/extract.js";
import { analyzeRepresentation, buildProvenanceReport, normalizeEvidenceValue } from "../src/provenance.js";
import { buildUrlIntelligenceExtension } from "../src/intelligence-v15.js";
import { mcpTools } from "../src/mcp.js";
import type { IntelligenceResult, PageSignal } from "../src/types.js";

function pricingResult(): IntelligenceResult {
  const url = "https://shop.example/pricing";
  const html = `<html lang="en"><head>
    <link rel="alternate" hreflang="en" href="https://shop.example/pricing">
    <link rel="alternate" hreflang="de" href="https://shop.example/de/pricing">
    <script type="application/ld+json">{"@type":"Product","name":"Pro","offers":{"@type":"Offer","price":"29","priceCurrency":"USD"}}</script>
  </head><body><h1>Pricing</h1><p>US$29 per month</p></body></html>`;
  const representation = analyzeRepresentation(html, url, "source_html", { finalUrl: url, observedAt: "2026-09-29T12:00:00.000Z" });
  const page: PageSignal = { ...parsePage(html, url, 200), representations: [representation], observations: representation.observations };
  const provenance = buildProvenanceReport([page]);
  return {
    meta: { project: "URL Intelligence Agent", version: "1.5.0", provenanceSchema: provenance.schemaVersion },
    inputUrl: url,
    finalUrl: url,
    profile: "full",
    entity: {
      type: { value: "software", confidence: 0.8, method: "fixture", sources: [url] },
      name: { value: "Example", confidence: 0.8, method: "fixture", sources: [url] }
    },
    confidenceAssessment: {
      extractionConfidence: 0.8,
      externalCorroboration: 0,
      firstPartyEvidencePages: 1,
      thirdPartyEvidenceSources: 0,
      thirdPartyEvidenceDomains: 0,
      interpretation: "fixture"
    },
    webResearch: {
      enabled: true,
      searchConfigured: false,
      queries: [],
      candidateUrls: 0,
      fetchedSources: 0,
      thirdPartySources: 0,
      thirdPartyDomains: 0,
      corroboratingThirdPartySources: 0,
      corroboratingThirdPartyDomains: 0,
      platformSources: 0,
      sourceCoverageScore: 0,
      coverageLevel: "none",
      sources: [],
      notes: []
    },
    provenance,
    seo: { score: 80, issues: [], warnings: [], checks: {} },
    security: { score: 70, issues: [], warnings: [], checks: {} },
    quality: { score: 90, issues: [], warnings: [], checks: {} },
    trust: { score: 75, issues: [], warnings: [], checks: {} },
    socials: [],
    contacts: { emails: [], phones: [] },
    importantPages: { pricing: url },
    pages: [page],
    sitemapUrls: [],
    technologies: [],
    brand: { logos: [], favicons: [], colors: [], socialProfiles: [], handles: [], taglines: [] },
    graph: { nodes: [], edges: [] },
    competitors: [],
    rag: [],
    contradictions: [],
    warnings: [],
    fingerprint: "fixture",
    contentFingerprint: "fixture-content",
    observedAt: "2026-09-29T12:00:00.000Z"
  };
}

test("v1.4 compatibility: v1.5 extension is additive and leaves legacy structures untouched", () => {
  const result = pricingResult();
  const before = JSON.stringify({
    entity: result.entity,
    provenance: result.provenance,
    seo: result.seo,
    security: result.security,
    quality: result.quality,
    trust: result.trust,
    contradictions: result.contradictions,
    warnings: result.warnings
  });
  const extension = buildUrlIntelligenceExtension(result) as any;
  const after = JSON.stringify({
    entity: result.entity,
    provenance: result.provenance,
    seo: result.seo,
    security: result.security,
    quality: result.quality,
    trust: result.trust,
    contradictions: result.contradictions,
    warnings: result.warnings
  });
  assert.equal(after, before);
  assert.equal(extension.schemaVersion, "1.0");
  assert.equal(extension.compatibilityBase, "1.4.0");
  assert.ok(["info","low","medium","high","critical"].includes(extension.severityAssessment.band));
  for (const claim of result.provenance.claims) {
    for (const conflict of claim.conflicts) assert.ok(["none","low","medium","high"].includes(conflict.severity));
  }
});

test("v1.5 commerce expands currencies while preserving v1.4 bare-dollar semantics", () => {
  const jpy = normalizeEvidenceValue("JPY 4,900", "price");
  assert.equal(jpy.kind, "money");
  if (jpy.kind === "money") assert.equal(jpy.currency, "JPY");

  const cad = normalizeEvidenceValue("CAD 29 per month", "price");
  assert.equal(cad.kind, "money");
  if (cad.kind === "money") {
    assert.equal(cad.currency, "CAD");
    assert.equal(cad.cadence, "month");
  }

  const legacyDollar = normalizeEvidenceValue("$29", "price");
  assert.equal(legacyDollar.kind, "money");
  if (legacyDollar.kind === "money") assert.equal(legacyDollar.currency, "USD");

  const extension = buildUrlIntelligenceExtension(pricingResult()) as any;
  assert.ok(extension.commerce.entries.some((x: any) => x.currency === "USD"));
});

test("v1.5 extracts hreflang alternates for discovery intelligence", () => {
  const page = pricingResult().pages[0];
  assert.equal(page.alternates?.length, 2);
  assert.ok(page.alternates?.some(x => x.hreflang === "de" && x.href.includes("/de/pricing")));
});

test("v1.5 MCP annotations describe side effects instead of response determinism", () => {
  const tools = mcpTools(undefined, true) as any[];
  const investigate = tools.find(x => x.name === "investigate_url");
  const createSnapshot = tools.find(x => x.name === "create_snapshot");
  const diffSnapshot = tools.find(x => x.name === "diff_snapshot");
  const listPlugins = tools.find(x => x.name === "list_plugins");

  assert.equal(investigate.annotations.readOnlyHint, true);
  assert.equal(Object.hasOwn(investigate.annotations, "idempotentHint"), false);
  assert.equal(createSnapshot.annotations.readOnlyHint, false);
  assert.equal(createSnapshot.annotations.idempotentHint, false);
  assert.equal(diffSnapshot.annotations.idempotentHint, false);
  assert.equal(listPlugins.annotations.openWorldHint, false);
});

test("v1.5 MCP investigate schema exposes the optional namespaced extension", () => {
  const investigate = (mcpTools(undefined, true) as any[]).find(x => x.name === "investigate_url");
  const ext = investigate.outputSchema?.properties?.meta?.properties?.extensions?.properties?.urlIntelligence;
  assert.equal(ext?.properties?.compatibilityBase?.const, "1.4.0");
  assert.ok(ext?.properties?.severityAssessment?.properties?.band?.enum?.includes("critical"));
});
