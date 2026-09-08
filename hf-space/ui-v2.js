/* URL Intelligence Agent — hosted UI enhancement layer */
(() => {
  const pct = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : "—";
  const text = value => value === undefined || value === null || value === "" ? "—" : String(value);
  const isBacklink = source => Array.isArray(source?.discoveredBy) && source.discoveredBy.includes("backlink-to-target");

  function makeMetric(label, value, className = "") {
    const box = document.createElement("div"); box.className = "web-metric";
    const l = document.createElement("div"); l.className = "label"; l.textContent = label;
    const v = document.createElement("div"); v.className = `value ${className}`.trim(); v.textContent = value;
    box.append(l, v); return box;
  }

  function sourceCard(source) {
    const card = document.createElement("article"); card.className = "web-source-card";
    const top = document.createElement("div"); top.className = "web-source-top";
    const sourceClass = document.createElement("span"); sourceClass.className = "web-source-pill"; sourceClass.textContent = source.sourceClass === "third-party" ? "Independent domain" : "Public platform"; top.appendChild(sourceClass);
    if (source.mentionsEntity) { const verified = document.createElement("span"); verified.className = "web-source-pill verified"; verified.textContent = "Entity mentioned"; top.appendChild(verified); }
    if (isBacklink(source)) { const backlink = document.createElement("span"); backlink.className = "web-source-pill backlink"; backlink.textContent = "Links to target"; top.appendChild(backlink); }
    if (source.searchProvider) { const discovered = document.createElement("span"); discovered.className = "web-source-pill"; discovered.textContent = `Search: ${source.searchProvider}`; top.appendChild(discovered); }
    const title = document.createElement("div"); title.className = "web-source-title"; title.textContent = source.title || source.searchTitle || source.host || source.url;
    const meta = document.createElement("div"); meta.className = "web-source-meta"; meta.textContent = [source.host, source.status ? `HTTP ${source.status}` : "", source.publishedAt ? `Published ${source.publishedAt}` : "", source.fetched ? "Fetched live" : "Discovered"].filter(Boolean).join(" · ");
    const link = document.createElement("a"); link.className = "web-source-url"; link.href = source.finalUrl || source.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = `Open source ↗  ${source.finalUrl || source.url}`;
    card.append(top, title, meta, link); return card;
  }

  function openWebPanel(result) {
    const research = result?.webResearch, assessment = result?.confidenceAssessment;
    if (!research || research.enabled === false) return null;
    const sources = Array.isArray(research.sources) ? research.sources : [];
    const externalSources = sources.filter(s => s?.sourceClass === "third-party" || s?.sourceClass === "platform");
    const backlinkSources = externalSources.filter(isBacklink), backlinkDomains = new Set(backlinkSources.map(s => s.host).filter(Boolean));
    const panel = document.createElement("section"); panel.className = "open-web-panel";
    const head = document.createElement("div"); head.className = "open-web-head";
    const hgroup = document.createElement("div"), h3 = document.createElement("h3"), intro = document.createElement("p"), badge = document.createElement("span");
    h3.textContent = "Open-web corroboration";
    intro.textContent = "Full Investigation first crawls the target site, then crosses the domain boundary to inspect public external references, search-index results, independent articles and pages that link back to the target.";
    badge.className = "web-badge"; badge.textContent = "Independent evidence"; hgroup.append(h3, intro); head.append(hgroup, badge); panel.appendChild(head);
    const metrics = document.createElement("div"); metrics.className = "open-web-metrics";
    metrics.append(makeMetric("First-party extraction", pct(assessment?.extractionConfidence), "status-good"), makeMetric("External corroboration", pct(assessment?.externalCorroboration ?? (research.sourceCoverageScore || 0) / 100), research.coverageLevel === "strong" ? "status-good" : research.coverageLevel === "none" ? "status-bad" : "status-warn"), makeMetric("Independent domains", text(research.corroboratingThirdPartyDomains ?? 0)), makeMetric("Corroborating sources", text(research.corroboratingThirdPartySources ?? 0)), makeMetric("Direct backlinks", `${backlinkSources.length} / ${backlinkDomains.size} domains`));
    panel.appendChild(metrics);
    const explanation = document.createElement("div"); explanation.className = "web-explanation"; explanation.textContent = `Search provider: ${research.searchProvider === "duckduckgo" ? "built-in public DuckDuckGo fallback" : research.searchProvider || "not available"}. Extraction confidence measures target-side evidence. External corroboration measures independent coverage. Neither score means “probability this is true.”`; panel.appendChild(explanation);
    if (externalSources.length) {
      const details = document.createElement("details"); details.className = "web-source-section"; details.open = true;
      const summary = document.createElement("summary"); summary.textContent = `Independent/public sources inspected (${externalSources.length})`;
      const grid = document.createElement("div"); grid.className = "web-source-grid";
      [...externalSources].sort((a, b) => Number(isBacklink(b)) - Number(isBacklink(a)) || Number(Boolean(b.mentionsEntity)) - Number(Boolean(a.mentionsEntity)) || Number(Boolean(b.fetched)) - Number(Boolean(a.fetched))).slice(0, 30).forEach(source => grid.appendChild(sourceCard(source)));
      details.append(summary, grid); panel.appendChild(details);
    }
    return panel;
  }

  function displayClaimValue(claim) {
    const value = claim?.displayValue;
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") {
      if (typeof value.amount === "number") return `${value.currency || ""} ${value.amount}`.trim();
      if (typeof value.value === "number") return String(value.value);
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }

  function provenanceClaimCard(claim, observations) {
    const card = document.createElement("article"); card.className = "web-source-card provenance-claim";
    const top = document.createElement("div"); top.className = "web-source-top";
    const status = document.createElement("span"); status.className = `web-source-pill ${claim.status === "conflict" ? "status-bad" : claim.status === "drift" ? "status-warn" : "verified"}`; status.textContent = String(claim.status || "unknown").replace(/_/g, " "); top.appendChild(status);
    (claim.flags || []).slice(0, 4).forEach(flag => { const pill = document.createElement("span"); pill.className = "web-source-pill"; pill.textContent = String(flag).replace(/_/g, " "); top.appendChild(pill); });
    const title = document.createElement("div"); title.className = "web-source-title"; title.textContent = `${claim.predicate}: ${displayClaimValue(claim)}`;
    const obs = (claim.observationIds || []).map(id => observations.get(id)).filter(Boolean);
    const layers = [...new Set(obs.map(x => `${x.source?.representation || "?"}/${x.source?.layer || "?"}`))];
    const meta = document.createElement("div"); meta.className = "web-source-meta"; meta.textContent = `${claim.observationIds?.length || 0} observation(s) · ${layers.join(" · ")} · resolution ${pct(claim.resolution?.confidence)}`;
    card.append(top, title, meta);
    if (claim.resolution?.explanation?.length) { const note = document.createElement("div"); note.className = "web-explanation"; note.textContent = claim.resolution.explanation.join(" "); card.appendChild(note); }
    return card;
  }

  function provenancePanel(result) {
    const provenance = result?.provenance;
    if (!provenance?.summary) return null;
    const summary = provenance.summary, claims = Array.isArray(provenance.claims) ? provenance.claims : [], observations = Array.isArray(provenance.observations) ? provenance.observations : [];
    const observationMap = new Map(observations.map(obs => [obs.id, obs]));
    const panel = document.createElement("section"); panel.className = "open-web-panel provenance-panel";
    const head = document.createElement("div"); head.className = "open-web-head";
    const hgroup = document.createElement("div"), h3 = document.createElement("h3"), intro = document.createElement("p"), badge = document.createElement("span");
    h3.textContent = "Evidence Inspector · Claim Provenance";
    intro.textContent = "Each important value is preserved as an observation with its source layer, representation, normalization, timestamp and hash. The resolver distinguishes consensus, compatible variation, representation drift and real conflicts.";
    badge.className = "web-badge"; badge.textContent = `Schema ${provenance.schemaVersion || "1.0"}`; hgroup.append(h3, intro); head.append(hgroup, badge); panel.appendChild(head);
    const metrics = document.createElement("div"); metrics.className = "open-web-metrics";
    metrics.append(makeMetric("Observations", text(summary.totalObservations || 0)), makeMetric("Resolved claims", text(summary.totalClaims || 0)), makeMetric("Drift", text(summary.driftClaims || 0), summary.driftClaims ? "status-warn" : "status-good"), makeMetric("Conflicts", text(summary.conflictClaims || 0), summary.conflictClaims ? "status-bad" : "status-good"), makeMetric("Stale metadata signals", text(summary.staleMetadataSuspected || 0), summary.staleMetadataSuspected ? "status-warn" : "status-good"));
    panel.appendChild(metrics);
    const explanation = document.createElement("div"); explanation.className = "web-explanation"; explanation.textContent = `Representations: ${(summary.representations || []).join(", ") || "source only"}. Layers: ${(summary.layers || []).join(", ") || "none"}. Example semantics: “80,000+” and “100,502” can be compatible while still producing freshness/representation drift. Conflict does not mean the agent guesses which website claim is true; resolution explains which observation it selected and why.`; panel.appendChild(explanation);
    const notable = claims.filter(c => c.status === "conflict" || c.status === "drift" || (c.flags || []).includes("stale_metadata_suspected")).sort((a, b) => Number(b.status === "conflict") - Number(a.status === "conflict") || Number((b.flags || []).includes("stale_metadata_suspected")) - Number((a.flags || []).includes("stale_metadata_suspected")));
    if (notable.length) {
      const details = document.createElement("details"); details.className = "web-source-section"; details.open = true;
      const s = document.createElement("summary"); s.textContent = `Drift, conflict & freshness signals (${notable.length})`;
      const grid = document.createElement("div"); grid.className = "web-source-grid"; notable.slice(0, 30).forEach(claim => grid.appendChild(provenanceClaimCard(claim, observationMap))); details.append(s, grid); panel.appendChild(details);
    }
    const all = document.createElement("details"); all.className = "web-source-section";
    const as = document.createElement("summary"); as.textContent = `All resolved claims (${claims.length})`;
    const grid = document.createElement("div"); grid.className = "web-source-grid"; claims.slice(0, 50).forEach(claim => grid.appendChild(provenanceClaimCard(claim, observationMap))); all.append(as, grid); panel.appendChild(all);
    return panel;
  }

  try {
    if (typeof ACTION_GUIDE !== "undefined") {
      if (ACTION_GUIDE.investigate_url) {
        ACTION_GUIDE.investigate_url.desc = "Two-stage evidence investigation. It crawls the target, creates field-level provenance observations and resolved claims, detects drift/conflicts/stale metadata, then can cross the domain boundary for public corroboration.";
        ACTION_GUIDE.investigate_url.output = "Complete IntelligenceResult + provenance + webResearch + confidenceAssessment";
        ACTION_GUIDE.investigate_url.best = "Best for due diligence, claim verification, provenance inspection and the broadest public-web picture.";
      }
      ACTION_GUIDE.inspect_provenance = { title: "Inspect provenance", desc: "Inspect claim-level source layers, raw/normalized values, representations, hashes, drift/conflicts and resolution policy.", output: "Provenance claims + observations (+ optional PROV export)", best: "Best when an AI agent needs to know exactly where a value came from." };
      ACTION_GUIDE.verify_claim = { title: "Verify claim", desc: "Compare a supplied predicate/value against normalized collected evidence.", output: "supported / compatible / contradicted / not_found", best: "Best for deterministic claim checks over a URL." };
    }
  } catch { /* enhancement only */ }

  try {
    if (typeof claimNode === "function") {
      const originalClaimNode = claimNode;
      claimNode = function enhancedClaimNode(claim) {
        const node = originalClaimNode(claim), confidence = node?.querySelector?.(".confidence");
        if (confidence && String(claim?.method || "").startsWith("first-party-extraction:")) confidence.textContent = `${Math.round(Number(claim.confidence || 0) * 100)}% extraction confidence`;
        return node;
      };
    }
  } catch { /* enhancement only */ }

  try {
    if (typeof renderEvidenceSummary === "function") {
      const originalRenderEvidenceSummary = renderEvidenceSummary;
      renderEvidenceSummary = function enhancedEvidenceSummary(result) {
        originalRenderEvidenceSummary(result);
        const target = document.getElementById("evidenceSummary"); if (!target) return;
        const prov = provenancePanel(result), web = openWebPanel(result);
        if (web) target.insertBefore(web, target.firstChild);
        if (prov) target.insertBefore(prov, target.firstChild);
      };
    }
  } catch { /* enhancement only */ }

  window.addEventListener("DOMContentLoaded", () => {
    try { if (typeof renderActionGuide === "function") renderActionGuide(); } catch { /* noop */ }
    const loading = document.getElementById("loading"); if (loading) loading.textContent = "Collecting source layers, resolving claim provenance, checking drift/conflicts and searching independent public evidence… this can take a little time.";
    const lead = document.querySelector(".hero .lead"); if (lead) lead.textContent = "Evidence-first URL and web intelligence for AI agents, developers and research workflows. v1.2 resolves field-level claim provenance across metadata, structured data and visible content, detects drift/conflicts, and separates target-side extraction from independent public corroboration.";
    const faq = document.querySelector("#faq .faq");
    if (faq && !document.getElementById("faq-provenance")) {
      const provenance = document.createElement("details"); provenance.className = "faq-item"; provenance.id = "faq-provenance";
      const sp = document.createElement("summary"); sp.textContent = "What does claim-level provenance mean?";
      const pp = document.createElement("p"); pp.textContent = "Instead of returning only one flattened value, the agent preserves observations from metadata, Open Graph, JSON-LD, Microdata, RDFa, HTTP and visible content, normalizes them, compares them and explains why a preferred value was selected. A difference is not automatically a contradiction: 80,000+ and 100,502 are compatible but can still reveal stale metadata or representation drift."; provenance.append(sp, pp);
      const beyond = document.createElement("details"); beyond.className = "faq-item";
      const s1 = document.createElement("summary"); s1.textContent = "Does Full Investigation search beyond the target website?";
      const p1 = document.createElement("p"); p1.textContent = "Yes. It first builds first-party provenance, then can search and fetch public third-party references, entity mentions and backlinks so external corroboration remains separate from target-side extraction confidence."; beyond.append(s1, p1);
      faq.insertBefore(beyond, faq.firstChild); faq.insertBefore(provenance, faq.firstChild);
    }
  });
})();
