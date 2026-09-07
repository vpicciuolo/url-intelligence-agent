/* URL Intelligence Agent — hosted UI enhancement layer */
(() => {
  const pct = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : "—";
  const text = value => value === undefined || value === null || value === "" ? "—" : String(value);
  const isBacklink = source => Array.isArray(source?.discoveredBy) && source.discoveredBy.includes("backlink-to-target");

  function makeMetric(label, value, className = "") {
    const box = document.createElement("div");
    box.className = "web-metric";
    const l = document.createElement("div");
    l.className = "label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = `value ${className}`.trim();
    v.textContent = value;
    box.append(l, v);
    return box;
  }

  function sourceCard(source) {
    const card = document.createElement("article");
    card.className = "web-source-card";

    const top = document.createElement("div");
    top.className = "web-source-top";
    const sourceClass = document.createElement("span");
    sourceClass.className = "web-source-pill";
    sourceClass.textContent = source.sourceClass === "third-party" ? "Independent domain" : "Public platform";
    top.appendChild(sourceClass);

    if (source.mentionsEntity) {
      const verified = document.createElement("span");
      verified.className = "web-source-pill verified";
      verified.textContent = "Entity mentioned";
      top.appendChild(verified);
    }
    if (isBacklink(source)) {
      const backlink = document.createElement("span");
      backlink.className = "web-source-pill backlink";
      backlink.textContent = "Links to target";
      top.appendChild(backlink);
    }
    if (source.searchProvider) {
      const discovered = document.createElement("span");
      discovered.className = "web-source-pill";
      discovered.textContent = `Search: ${source.searchProvider}`;
      top.appendChild(discovered);
    }

    const title = document.createElement("div");
    title.className = "web-source-title";
    title.textContent = source.title || source.searchTitle || source.host || source.url;

    const meta = document.createElement("div");
    meta.className = "web-source-meta";
    const bits = [source.host, source.status ? `HTTP ${source.status}` : "", source.publishedAt ? `Published ${source.publishedAt}` : "", source.fetched ? "Fetched live" : "Discovered"].filter(Boolean);
    meta.textContent = bits.join(" · ");

    const link = document.createElement("a");
    link.className = "web-source-url";
    link.href = source.finalUrl || source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `Open source ↗  ${source.finalUrl || source.url}`;

    card.append(top, title, meta, link);
    return card;
  }

  function openWebPanel(result) {
    const research = result?.webResearch;
    const assessment = result?.confidenceAssessment;
    if (!research || research.enabled === false) return null;

    const sources = Array.isArray(research.sources) ? research.sources : [];
    const externalSources = sources.filter(s => s?.sourceClass === "third-party" || s?.sourceClass === "platform");
    const backlinkSources = externalSources.filter(isBacklink);
    const backlinkDomains = new Set(backlinkSources.map(s => s.host).filter(Boolean));
    const provider = research.searchProvider || "not available";

    const panel = document.createElement("section");
    panel.className = "open-web-panel";

    const head = document.createElement("div");
    head.className = "open-web-head";
    const hgroup = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = "Open-web corroboration";
    const intro = document.createElement("p");
    intro.textContent = "Full Investigation first crawls the target site, then crosses the domain boundary to inspect public external references, search-index results, independent articles and pages that link back to the target.";
    hgroup.append(h3, intro);
    const badge = document.createElement("span");
    badge.className = "web-badge";
    badge.textContent = "Independent evidence";
    head.append(hgroup, badge);
    panel.appendChild(head);

    const metrics = document.createElement("div");
    metrics.className = "open-web-metrics";
    metrics.append(
      makeMetric("First-party extraction", pct(assessment?.extractionConfidence), "status-good"),
      makeMetric("External corroboration", pct(assessment?.externalCorroboration ?? (research.sourceCoverageScore || 0) / 100), research.coverageLevel === "strong" ? "status-good" : research.coverageLevel === "none" ? "status-bad" : "status-warn"),
      makeMetric("Independent domains", text(research.corroboratingThirdPartyDomains ?? 0)),
      makeMetric("Corroborating sources", text(research.corroboratingThirdPartySources ?? 0)),
      makeMetric("Direct backlinks", `${backlinkSources.length} / ${backlinkDomains.size} domains`)
    );
    panel.appendChild(metrics);

    const explanation = document.createElement("div");
    explanation.className = "web-explanation";
    const providerText = provider === "duckduckgo" ? "built-in public DuckDuckGo fallback" : provider;
    explanation.textContent = `Search provider: ${providerText}. Extraction confidence measures how strongly the target itself supports an extracted value. External corroboration is separate and measures independent-domain coverage. Neither score means “probability this is true.”`;
    panel.appendChild(explanation);

    if (externalSources.length) {
      const details = document.createElement("details");
      details.className = "web-source-section";
      details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = `Independent/public sources inspected (${externalSources.length})`;
      const grid = document.createElement("div");
      grid.className = "web-source-grid";
      [...externalSources]
        .sort((a, b) => Number(isBacklink(b)) - Number(isBacklink(a)) || Number(Boolean(b.mentionsEntity)) - Number(Boolean(a.mentionsEntity)) || Number(Boolean(b.fetched)) - Number(Boolean(a.fetched)))
        .slice(0, 30)
        .forEach(source => grid.appendChild(sourceCard(source)));
      details.append(summary, grid);
      panel.appendChild(details);
    }

    if (Array.isArray(research.notes) && research.notes.length) {
      const details = document.createElement("details");
      details.className = "web-source-section";
      const summary = document.createElement("summary");
      summary.textContent = "Coverage notes & limitations";
      const list = document.createElement("ul");
      list.className = "array";
      research.notes.forEach(note => {
        const li = document.createElement("li");
        li.textContent = String(note);
        list.appendChild(li);
      });
      details.append(summary, list);
      panel.appendChild(details);
    }
    return panel;
  }

  try {
    if (typeof ACTION_GUIDE !== "undefined" && ACTION_GUIDE.investigate_url) {
      ACTION_GUIDE.investigate_url.desc = "Two-stage investigation. Stage 1 crawls the target website. Stage 2 crosses the domain boundary: follows public citations/sameAs/outbound references, searches the public web, fetches independent sources, detects pages linking back to the target and measures external corroboration separately from first-party extraction confidence.";
      ACTION_GUIDE.investigate_url.output = "Complete IntelligenceResult + webResearch + confidenceAssessment";
      ACTION_GUIDE.investigate_url.best = "Best for due diligence, source verification and the broadest public-web picture.";
    }
  } catch { /* enhancement only */ }

  try {
    if (typeof claimNode === "function") {
      const originalClaimNode = claimNode;
      claimNode = function enhancedClaimNode(claim) {
        const node = originalClaimNode(claim);
        const badge = node?.querySelector?.(".confidence");
        if (badge && String(claim?.method || "").startsWith("first-party-extraction:")) badge.textContent = `${Math.round(Number(claim.confidence || 0) * 100)}% extraction confidence`;
        return node;
      };
    }
  } catch { /* enhancement only */ }

  try {
    if (typeof renderEvidenceSummary === "function") {
      const originalRenderEvidenceSummary = renderEvidenceSummary;
      renderEvidenceSummary = function enhancedEvidenceSummary(result) {
        originalRenderEvidenceSummary(result);
        const target = document.getElementById("evidenceSummary");
        const panel = openWebPanel(result);
        if (target && panel) target.insertBefore(panel, target.firstChild);
      };
    }
  } catch { /* enhancement only */ }

  window.addEventListener("DOMContentLoaded", () => {
    try { if (typeof renderActionGuide === "function") renderActionGuide(); } catch { /* noop */ }

    const loading = document.getElementById("loading");
    if (loading) loading.textContent = "Crawling the target site, resolving the entity, searching independent web sources, checking backlinks and collecting evidence… this can take a little time.";

    const lead = document.querySelector(".hero .lead");
    if (lead) lead.textContent = "Evidence-first URL and web intelligence for AI agents, developers and research workflows. Full Investigation crawls the target, then searches beyond it for independent public sources, articles, references and backlinks so first-party extraction confidence can be separated from external corroboration.";

    const faq = document.querySelector("#faq .faq");
    if (faq && !document.getElementById("faq-open-web")) {
      const beyond = document.createElement("details");
      beyond.className = "faq-item";
      beyond.id = "faq-open-web";
      const s1 = document.createElement("summary");
      s1.textContent = "Does Full Investigation search beyond the target website?";
      const p1 = document.createElement("p");
      p1.textContent = "Yes. It uses a two-stage process: a bounded same-site crawl first, then an external research stage that follows public external references and structured-data URLs, searches the public web, fetches third-party pages, checks entity mentions and detects pages that link back to the target.";
      beyond.append(s1, p1);

      const backlinks = document.createElement("details");
      backlinks.className = "faq-item";
      const s2 = document.createElement("summary");
      s2.textContent = "Does it find every backlink on the internet?";
      const p2 = document.createElement("p");
      p2.textContent = "No crawler can guarantee every backlink on the public web. Full Investigation performs bounded live discovery plus search-index discovery. Coverage improves when a larger external index such as SearXNG, Brave Search, Serper, Tavily or Google CSE is configured.";
      backlinks.append(s2, p2);

      faq.insertBefore(backlinks, faq.firstChild);
      faq.insertBefore(beyond, faq.firstChild);
    }
  });
})();
