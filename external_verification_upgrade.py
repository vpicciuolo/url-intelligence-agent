from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if new in text:
        print(f"already patched: {path}")
        return
    if old not in text:
        raise SystemExit(f"Patch marker not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"patched: {path}")


def insert_before(path: str, marker: str, block: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if block.strip() in text:
        print(f"already inserted: {path}")
        return
    if marker not in text:
        raise SystemExit(f"Insert marker not found in {path}: {marker[:160]!r}")
    p.write_text(text.replace(marker, block + "\n\n" + marker, 1), encoding="utf-8")
    print(f"inserted: {path}")


# ---------------------------------------------------------------------------
# Runtime types: expose what was actually read/verified for external sources.
# ---------------------------------------------------------------------------
replace_once(
    "src/types.ts",
    '''  publishedAt?: string;\n  mentionsEntity: boolean;\n  fetched: boolean;''',
    '''  publishedAt?: string;\n  wordCount?: number;\n  contentSample?: string;\n  linksToTarget?: boolean;\n  verificationStatus?: "unverified" | "search-snippet-match" | "fetched-no-match" | "verified-mention" | "verified-backlink" | "fetch-blocked";\n  mentionsEntity: boolean;\n  fetched: boolean;'''
)
replace_once(
    "src/types.ts",
    '''  platformSources: number;\n  sourceCoverageScore: number;''',
    '''  platformSources: number;\n  verifiedPlatformSources?: number;\n  directReferenceSources?: number;\n  verifiedDirectReferenceSources?: number;\n  sourceCoverageScore: number;'''
)
replace_once(
    "src/types.ts",
    '''  thirdPartyEvidenceDomains: number;\n  searchProvider?: string;''',
    '''  thirdPartyEvidenceDomains: number;\n  verifiedPlatformSources?: number;\n  verifiedDirectReferences?: number;\n  searchProvider?: string;'''
)

# ---------------------------------------------------------------------------
# External web research: every eligible direct external reference gets its own
# verification lane before search-index results. Social/profile URLs are also
# attempted through the normal SSRF-safe fetch path; blocked platforms remain
# visible as unverified rather than being silently counted as confirmation.
# ---------------------------------------------------------------------------
replace_once(
    "src/research.ts",
    '''  const base: WebEvidenceSource = {\n    url: candidate.url,\n    host,\n    sourceClass,\n    discoveredBy: [...candidate.discoveredBy],\n    searchProvider: candidate.searchProvider,\n    searchTitle: candidate.searchTitle,\n    searchSnippet: candidate.searchSnippet,\n    publishedAt: candidate.publishedAt,\n    mentionsEntity: mentionsEntity(`${candidate.searchTitle || ""} ${candidate.searchSnippet || ""}`, entityName, rootDomain),\n    fetched: false,\n    observedAt\n  };\n  if (sourceClass === "platform" && /(?:facebook|instagram|linkedin|tiktok|t\\.me|telegram)/i.test(host)) return base;\n  try {''',
    '''  const snippetMentions = mentionsEntity(`${candidate.searchTitle || ""} ${candidate.searchSnippet || ""}`, entityName, rootDomain);\n  const base: WebEvidenceSource = {\n    url: candidate.url,\n    host,\n    sourceClass,\n    discoveredBy: [...candidate.discoveredBy],\n    searchProvider: candidate.searchProvider,\n    searchTitle: candidate.searchTitle,\n    searchSnippet: candidate.searchSnippet,\n    publishedAt: candidate.publishedAt,\n    mentionsEntity: snippetMentions,\n    verificationStatus: snippetMentions ? "search-snippet-match" : "unverified",\n    fetched: false,\n    observedAt\n  };\n  // Do not silently trust or skip social/profile URLs. Attempt to fetch every\n  // eligible public reference through the same SSRF-safe network layer. If a\n  // platform blocks automated access, the source remains visible as unverified.\n  try {'''
)
replace_once(
    "src/research.ts",
    '''    const text = `${page.title || ""} ${page.description || ""} ${page.textSample.slice(0, 12000)}`;\n    const backlink = pageLinksToTarget(page, rootDomain);\n    return {\n      ...base,\n      finalUrl: fetched.url,\n      host: new URL(fetched.url).hostname.toLowerCase(),\n      status: fetched.status,\n      title: page.title,\n      description: page.description,\n      publishedAt: extractPublishedAt(page) || candidate.publishedAt,\n      mentionsEntity: mentionsEntity(text, entityName, rootDomain),\n      discoveredBy: backlink ? unique([...base.discoveredBy, "backlink-to-target"]) : base.discoveredBy,\n      fetched: true\n    };\n  } catch (error) {\n    return { ...base, error: error instanceof Error ? error.message : String(error) };\n  }''',
    '''    const text = `${page.title || ""} ${page.description || ""} ${page.textSample.slice(0, 12000)}`;\n    const backlink = pageLinksToTarget(page, rootDomain);\n    const mention = mentionsEntity(text, entityName, rootDomain);\n    return {\n      ...base,\n      finalUrl: fetched.url,\n      host: new URL(fetched.url).hostname.toLowerCase(),\n      status: fetched.status,\n      title: page.title,\n      description: page.description,\n      publishedAt: extractPublishedAt(page) || candidate.publishedAt,\n      wordCount: page.wordCount,\n      contentSample: page.textSample.slice(0, 2400),\n      linksToTarget: backlink,\n      mentionsEntity: mention,\n      verificationStatus: backlink ? "verified-backlink" : mention ? "verified-mention" : "fetched-no-match",\n      discoveredBy: backlink ? unique([...base.discoveredBy, "backlink-to-target"]) : base.discoveredBy,\n      fetched: true\n    };\n  } catch (error) {\n    return { ...base, verificationStatus: "fetch-blocked", error: error instanceof Error ? error.message : String(error) };\n  }'''
)
replace_once(
    "src/research.ts",
    '''  for (const page of pages) {\n    for (const link of page.links) addCandidate(candidates, link, "outbound-link", 60);\n    const jsonUrls: string[] = [];\n    page.jsonLd.forEach(doc => collectJsonUrls(doc, jsonUrls));\n    jsonUrls.forEach(url => addCandidate(candidates, url, "structured-data", 85));\n  }''',
    '''  for (const page of pages) {\n    // Direct references published by the target are high-priority evidence leads.\n    // They do not become confirmation until the linked destination is fetched and checked.\n    for (const link of page.links) addCandidate(candidates, link, "outbound-link", 120);\n    for (const social of page.socials) addCandidate(candidates, social, "first-party-social", 140);\n    const jsonUrls: string[] = [];\n    page.jsonLd.forEach(doc => collectJsonUrls(doc, jsonUrls));\n    jsonUrls.forEach(url => addCandidate(candidates, url, "structured-data", 130));\n  }'''
)
replace_once(
    "src/research.ts",
    '''  const maxSources = envInt("URL_AGENT_EXTERNAL_MAX_SOURCES", 24, 1, 60);\n  const selected = [...candidates.values()].sort((a, b) => b.priority - a.priority).slice(0, maxSources);\n  const concurrency = envInt("URL_AGENT_EXTERNAL_CONCURRENCY", 4, 1, 10);''',
    '''  const allCandidates = [...candidates.values()].sort((a, b) => b.priority - a.priority);\n  const directKinds = new Set(["outbound-link", "structured-data", "first-party-social"]);\n  const isDirect = (candidate: Candidate) => [...candidate.discoveredBy].some(kind => directKinds.has(kind));\n  const directCandidates = allCandidates.filter(isDirect);\n  const directMax = envInt("URL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES", 60, 1, 150);\n  const searchMax = envInt("URL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES", envInt("URL_AGENT_EXTERNAL_MAX_SOURCES", 24, 1, 60), 1, 80);\n  const directSelected = directCandidates.slice(0, directMax);\n  const selectedUrls = new Set(directSelected.map(x => x.url));\n  const searchSelected = allCandidates.filter(x => !selectedUrls.has(x.url)).slice(0, searchMax);\n  const selected = [...directSelected, ...searchSelected];\n  if (directCandidates.length > directSelected.length) notes.push(`Direct-reference verification was bounded to ${directSelected.length} of ${directCandidates.length} eligible external URLs for this run. Increase URL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES when running on infrastructure sized for a larger pass.`);\n  const concurrency = envInt("URL_AGENT_EXTERNAL_CONCURRENCY", 6, 1, 12);'''
)
replace_once(
    "src/research.ts",
    '''  const platformSources = sources.filter(s => s.sourceClass === "platform").length;\n  const backlinkSources = sources.filter(s => s.sourceClass === "third-party" && s.fetched && isBacklink(s));\n  const backlinkDomains = new Set(backlinkSources.map(s => registrableDomain(s.host))).size;\n  const score = coverageScore(corroboratingThirdPartyDomains, corroboratingThirdParty.length, platformSources, backlinkDomains);''',
    '''  const platformSources = sources.filter(s => s.sourceClass === "platform").length;\n  const verifiedPlatformSources = sources.filter(s => s.sourceClass === "platform" && s.fetched && (s.mentionsEntity || isBacklink(s)) && (s.status || 0) >= 200 && (s.status || 0) < 400).length;\n  const isDirectReference = (s: WebEvidenceSource) => s.discoveredBy.some(kind => ["outbound-link", "structured-data", "first-party-social"].includes(kind));\n  const directReferenceSources = sources.filter(isDirectReference).length;\n  const verifiedDirectReferenceSources = sources.filter(s => isDirectReference(s) && s.fetched && (s.mentionsEntity || isBacklink(s)) && (s.status || 0) >= 200 && (s.status || 0) < 400).length;\n  const backlinkSources = sources.filter(s => s.sourceClass === "third-party" && s.fetched && isBacklink(s));\n  const backlinkDomains = new Set(backlinkSources.map(s => registrableDomain(s.host))).size;\n  const score = coverageScore(corroboratingThirdPartyDomains, corroboratingThirdParty.length, verifiedPlatformSources, backlinkDomains);'''
)
replace_once(
    "src/research.ts",
    '''  if (backlinkSources.length) notes.push(`${backlinkSources.length} fetched third-party source(s) linked directly back to the target across ${backlinkDomains} independent domain(s).`);\n  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo search fallback. For higher-volume or more reproducible coverage, configure SearXNG, Brave Search, Serper, Tavily or Google CSE.");''',
    '''  if (backlinkSources.length) notes.push(`${backlinkSources.length} fetched third-party source(s) linked directly back to the target across ${backlinkDomains} independent domain(s).`);\n  notes.push(`${verifiedDirectReferenceSources} of ${directReferenceSources} selected direct external reference(s) were fetched and content-verified as an entity mention or backlink. A link published by the target does not increase corroboration unless the destination itself supports the relationship.`);\n  if (platformSources) notes.push(`${verifiedPlatformSources} of ${platformSources} public social/platform reference(s) were directly fetchable and verified. Platforms that block automated public access remain visible but do not count as verified confirmation.`);\n  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo search fallback. For higher-volume or more reproducible coverage, configure SearXNG, Brave Search, Serper, Tavily or Google CSE.");'''
)
replace_once(
    "src/research.ts",
    '''    platformSources,\n    sourceCoverageScore: score,''',
    '''    platformSources,\n    verifiedPlatformSources,\n    directReferenceSources,\n    verifiedDirectReferenceSources,\n    sourceCoverageScore: score,'''
)

# Confidence summary should explain that an outbound/social link is only evidence
# after the destination itself has been checked.
replace_once(
    "src/agent.ts",
    '''    thirdPartyEvidenceDomains: webResearch.corroboratingThirdPartyDomains,\n    searchProvider: webResearch.searchProvider,\n    interpretation: "Extraction confidence measures how strongly the target's observable metadata/content supports the extracted field. External corroboration separately measures coverage across fetched third-party domains. Neither number is a probability that every claim is true."''',
    '''    thirdPartyEvidenceDomains: webResearch.corroboratingThirdPartyDomains,\n    verifiedPlatformSources: webResearch.verifiedPlatformSources || 0,\n    verifiedDirectReferences: webResearch.verifiedDirectReferenceSources || 0,\n    searchProvider: webResearch.searchProvider,\n    interpretation: "Extraction confidence measures how strongly the target's observable metadata/content supports the extracted field. External corroboration separately measures verified evidence outside the target domain. Direct links and social profiles only strengthen corroboration after the destination is fetched and its content, entity mention or backlink relationship is verified. Neither number is a probability that every claim is true."'''
)

# PDF report: surface actual external verification, not only the existence of URLs.
replace_once(
    "src/export-report.ts",
    '''  keyValue(doc, "Platform sources", research.platformSources);''',
    '''  keyValue(doc, "Platform sources", research.platformSources);\n  keyValue(doc, "Verified platform sources", research.verifiedPlatformSources);\n  keyValue(doc, "Direct external references checked", research.directReferenceSources);\n  keyValue(doc, "Direct references verified", research.verifiedDirectReferenceSources);'''
)
replace_once(
    "src/export-report.ts",
    '''        source.publishedAt ? `published ${source.publishedAt}` : ""\n      ].filter(Boolean).join(" · ");''',
    '''        source.publishedAt ? `published ${source.publishedAt}` : "",\n        source.verificationStatus ? `verification: ${source.verificationStatus}` : "",\n        source.wordCount ? `${source.wordCount} words analyzed` : ""\n      ].filter(Boolean).join(" · ");'''
)
replace_once(
    "src/export-report.ts",
    '''      if (source.description || source.searchSnippet) paragraph(doc, asText(source.description || source.searchSnippet), { size: 7.7, after: 0.15 });''',
    '''      if (source.description || source.searchSnippet) paragraph(doc, asText(source.description || source.searchSnippet), { size: 7.7, after: 0.15 });\n      if (source.contentSample) paragraph(doc, `Verified content excerpt: ${asText(source.contentSample)}`, { color: "#475569", size: 7.5, after: 0.15 });'''
)

# Hosted Space resource defaults: reserve a larger lane for direct references.
replace_once(
    "hf-space/Dockerfile",
    '''    URL_AGENT_EXTERNAL_MAX_SOURCES=24 \\\n    URL_AGENT_EXTERNAL_CONCURRENCY=4 \\\n    URL_AGENT_SEARCH_QUERIES=4 \\\n''',
    '''    URL_AGENT_EXTERNAL_MAX_SOURCES=24 \\\n    URL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES=60 \\\n    URL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES=24 \\\n    URL_AGENT_EXTERNAL_CONCURRENCY=6 \\\n    URL_AGENT_SEARCH_QUERIES=4 \\\n'''
)

# ---------------------------------------------------------------------------
# Hugging Face page: stronger SEO/entity relationship metadata + ecosystem links.
# ---------------------------------------------------------------------------
replace_once(
    "hf-space/index.html",
    '''  <meta name="description" content="Open-source evidence-first URL Intelligence Agent. Crawl a target site, expand into third-party web sources and articles, separate extraction confidence from external corroboration, expose contradictions, audit SEO/security/trust, and connect through Remote MCP, API, CLI or Docker." />''',
    '''  <meta name="description" content="Open-source evidence-first URL Intelligence Agent from the HORNO Network ecosystem. Crawl a target, fetch and verify external articles/social sources, compare independent evidence, audit SEO/security/trust, and connect through Remote MCP, API, CLI or Docker." />'''
)
replace_once(
    "hf-space/index.html",
    '''  <meta name="keywords" content="URL intelligence agent, web intelligence, web research agent, backlink discovery, external evidence, third party sources, evidence first AI, source provenance, confidence scoring, remote MCP server, MCP AI agent, URL analyzer, SEO audit AI, security audit, trust signals, entity resolution, social discovery, technology detection, web crawler, RAG, open source AI agent" />''',
    '''  <meta name="keywords" content="URL intelligence agent, web intelligence, web research agent, backlink discovery, external source verification, article verification, social profile verification, third party evidence, evidence first AI, source provenance, confidence scoring, remote MCP server, MCP AI agent, URL analyzer, SEO audit AI, security audit, trust signals, entity resolution, social discovery, technology detection, web crawler, RAG, open source AI agent, HORNO Network, HORNO ecosystem, HORNO Space, Easy HORNO, URL Metadata Social Profile Fetcher, HRN Innovation Technologies" />'''
)
replace_once(
    "hf-space/index.html",
    '''  <meta property="og:description" content="Evidence-first URL intelligence with first-party crawl, third-party source discovery, independent-domain corroboration, visible contradictions and Remote MCP." />''',
    '''  <meta property="og:description" content="Evidence-first URL intelligence from the HORNO Network ecosystem. Crawl the target, read and verify external articles/social profiles, preserve source provenance and contradictions, and connect through Remote MCP." />'''
)
replace_once(
    "hf-space/index.html",
    '''  <meta name="twitter:description" content="Crawl the target. Discover third-party sources. Separate extraction confidence from external corroboration. Keep disagreements visible." />''',
    '''  <meta name="twitter:description" content="Crawl the target, fetch external articles and social sources, verify what they actually say, separate extraction confidence from corroboration, and keep disagreements visible." />'''
)
replace_once(
    "hf-space/index.html",
    '''        "description":"Evidence-first open-source URL and web intelligence agent with first-party crawling, external web evidence discovery, third-party corroboration, entity resolution, provenance, contradiction reporting, SEO, security, trust, technology detection, RAG, HTTP API, CLI and Remote MCP.",''',
    '''        "description":"Evidence-first open-source URL and web intelligence agent from the HORNO Network ecosystem with first-party crawling, direct external-link verification, article and social-profile content checking, third-party corroboration, entity resolution, provenance, contradiction reporting, SEO, security, trust, RAG, HTTP API, CLI and Remote MCP.",'''
)
replace_once(
    "hf-space/index.html",
    '''        "codeRepository":"https://github.com/vpicciuolo/url-intelligence-agent",\n        "image":''',
    '''        "codeRepository":"https://github.com/vpicciuolo/url-intelligence-agent",\n        "citation":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://easy.horno.net","https://space.horno.net"],\n        "image":'''
)
replace_once(
    "hf-space/index.html",
    '''        "featureList":["First-party deep crawl","External web evidence discovery","Third-party article discovery","Independent-domain corroboration","Evidence-linked confidence",''',
    '''        "featureList":["First-party deep crawl","External web evidence discovery","Direct external-link content verification","Public social-profile verification","Third-party article discovery","Independent-domain corroboration","Evidence-linked confidence",'''
)
replace_once(
    "hf-space/index.html",
    '''      {\n        "@type":"FAQPage",''',
    '''      {\n        "@type":"WebPage",\n        "@id":"https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent#webpage",\n        "url":"https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",\n        "name":"URL Intelligence Agent – Evidence-first web research",\n        "about":{"@id":"https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent#software"},\n        "relatedLink":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://easy.horno.net","https://space.horno.net","https://behot.now"]\n      },\n      {\n        "@type":"FAQPage",'''
)
replace_once(
    "hf-space/index.html",
    '''        <article class="pipeline-step"><span class="num">3</span><h3>Discover external evidence</h3><p>Collect outbound links and URLs embedded in structured data. When a search provider is configured, query a web index for additional articles and backlink-style references.</p></article>\n        <article class="pipeline-step"><span class="num">4</span><h3>Fetch third-party pages</h3><p>Selected public external sources are fetched through the same SSRF-safe network layer. Social/platform references are distinguished from third-party domains.</p></article>''',
    '''        <article class="pipeline-step"><span class="num">3</span><h3>Discover every eligible external lead</h3><p>Collect outbound links, public social/profile URLs and URLs embedded in structured data. Direct references from the target receive their own high-priority verification lane, while the selected web index adds independent articles and backlink-style results.</p></article>\n        <article class="pipeline-step"><span class="num">4</span><h3>Open, read and verify the destination</h3><p>The agent does not increase confidence just because the target published a link. It fetches eligible external articles, websites and public social/profile pages through the SSRF-safe network layer, parses the returned content, checks for entity mentions and verifies whether the source links back to the target. If a platform blocks public automated access, that source remains visible but unverified.</p></article>'''
)
replace_once(
    "hf-space/index.html",
    '''      <div class="notice" style="margin-top:16px"><span>ℹ️</span><span><strong>About “all backlinks”:</strong> a crawler cannot enumerate the entire internet by itself. Web-wide backlink/article discovery requires a search index. This project supports SearXNG, Brave Search, Serper, Tavily and Google Custom Search through environment configuration; without one, external research is limited to third-party URLs discoverable from the target itself.</span></div>''',
    '''      <div class="notice" style="margin-top:16px"><span>ℹ️</span><span><strong>External links are leads, not proof:</strong> eligible external URLs found on the target are opened and content-checked before they can strengthen corroboration. Articles are read and parsed; public social/profile pages are also attempted directly. A crawler still cannot enumerate the entire internet by itself, so broad backlink/article discovery additionally uses the selected search index.</span></div>'''
)
replace_once(
    "hf-space/index.html",
    '''      const d=document.createElement('details');d.className='result-section';d.open=true;const s=document.createElement('summary');s.textContent=`External web research · ${wr.corroboratingThirdPartyDomains||0} corroborating third-party domains`;const inside=document.createElement('div');inside.className='inside';''',
    '''      const d=document.createElement('details');d.className='result-section';d.open=true;const s=document.createElement('summary');s.textContent=`External web research · ${wr.corroboratingThirdPartyDomains||0} independent domains · ${wr.verifiedDirectReferenceSources||0}/${wr.directReferenceSources||0} direct refs verified`;const inside=document.createElement('div');inside.className='inside';'''
)
replace_once(
    "hf-space/index.html",
    '''const meta=document.createElement('div');meta.className='meta';meta.textContent=`${src.fetched?'Fetched':'Not fetched'} · ${src.mentionsEntity?'Entity mention detected':'No clear entity mention'} · via ${(src.discoveredBy||[]).join(', ')||'discovery'}${src.publishedAt?' · '+src.publishedAt:''}`;box.appendChild(meta);const a=document.createElement('a');''',
    '''const meta=document.createElement('div');meta.className='meta';meta.textContent=`${src.fetched?'Fetched/read':'Not fetchable'} · ${src.verificationStatus||'unverified'} · ${src.mentionsEntity?'Entity mention detected':'No clear entity mention'}${src.linksToTarget?' · links back to target':''}${src.wordCount?' · '+src.wordCount+' words analyzed':''} · via ${(src.discoveredBy||[]).join(', ')||'discovery'}${src.publishedAt?' · '+src.publishedAt:''}`;box.appendChild(meta);if(src.contentSample){const excerpt=document.createElement('div');excerpt.className='claim-meta';excerpt.textContent='Content checked: '+src.contentSample.slice(0,420)+(src.contentSample.length>420?'…':'');box.appendChild(excerpt)}const a=document.createElement('a');'''
)

ecosystem_block = '''    <section class="section" id="ecosystem">\n      <h2>Related open source & HORNO Network ecosystem</h2>\n      <p>URL Intelligence Agent is an open-source intelligence component developed by Vincenzo Picciuolo / HRN Innovation Technologies Ltd and used within the HORNO Network ecosystem. The projects below are linked intentionally so developers, search engines and AI systems can understand the relationship between the full agent, the lightweight URL-enrichment layer and the products where this engineering pattern is used.</p>\n      <div class="grid">\n        <article class="card"><h3>URL Metadata & Social Profile Fetcher</h3><p>The lightweight deterministic companion project for fast URL enrichment, Open Graph/SEO metadata, canonical URLs, images and public social/profile discovery.</p><a class="source-link" href="https://github.com/vpicciuolo/url-metadata-social-fetcher" target="_blank" rel="noreferrer">GitHub · URL Metadata & Social Profile Fetcher ↗</a></article>\n        <article class="card"><h3>HORNO Network</h3><p>Explore the wider HORNO Network ecosystem and the products that use URL, identity, discovery and intelligence workflows.</p><a class="source-link" href="https://horno.net" target="_blank" rel="noreferrer">HORNO Network · horno.net ↗</a></article>\n        <article class="card"><h3>HORNO Space</h3><p>HORNO Space is the digital identity and smart-link product referenced by the open-source URL enrichment projects.</p><a class="source-link" href="https://space.horno.net" target="_blank" rel="noreferrer">HORNO Space · space.horno.net ↗</a></article>\n        <article class="card"><h3>Easy HORNO</h3><p>HORNO Network onboarding, documentation, academy and account experience.</p><a class="source-link" href="https://easy.horno.net" target="_blank" rel="noreferrer">Easy HORNO · easy.horno.net ↗</a></article>\n        <article class="card"><h3>BeHot.Now</h3><p>The Attention Marketplace uses the same URL-first enrichment pattern for faster listing and discovery workflows.</p><a class="source-link" href="https://behot.now" target="_blank" rel="noreferrer">BeHot.Now · behot.now ↗</a></article>\n      </div>\n    </section>'''
insert_before("hf-space/index.html", '    <section class="section" id="actions">', ecosystem_block)
replace_once(
    "hf-space/index.html",
    '''    <footer class="footer"><span>Created by Vincenzo Picciuolo · HRN Innovation Technologies Ltd</span><span>GitHub: vpicciuolo/url-intelligence-agent · Hugging Face: vpicciuolo/url-intelligence-agent · MIT License</span></footer>''',
    '''    <footer class="footer"><span>Created by Vincenzo Picciuolo · HRN Innovation Technologies Ltd · <a href="https://horno.net" target="_blank" rel="noreferrer">HORNO Network</a></span><span><a href="https://github.com/vpicciuolo/url-intelligence-agent" target="_blank" rel="noreferrer">URL Intelligence Agent</a> · <a href="https://github.com/vpicciuolo/url-metadata-social-fetcher" target="_blank" rel="noreferrer">URL Metadata & Social Profile Fetcher</a> · <a href="https://space.horno.net" target="_blank" rel="noreferrer">HORNO Space</a> · MIT License</span></footer>'''
)

# Hugging Face repository card: make relationships explicit and indexable.
replace_once(
    "hf-space/README.md",
    '''2. **External corroboration** — cross the target-domain boundary, expand public outbound/JSON-LD references, search for independent mentions/articles/backlink-style results, fetch selected external pages and verify whether they mention or link back to the target.''',
    '''2. **External corroboration** — cross the target-domain boundary, expand public outbound links, social/profile URLs and JSON-LD references, then actually fetch/read eligible destinations before they can strengthen confidence. Search-index results add independent articles and backlink-style sources. A direct link from the target is treated only as a lead until the destination itself is verified.'''
)
replace_once(
    "hf-space/README.md",
    '''- Verified direct backlink signals from fetched sources\n- External article/source URLs''',
    '''- Verified direct backlink signals from fetched sources\n- Direct external-reference verification counts\n- Public social/profile verification status\n- Parsed external content samples / source context\n- External article/source URLs'''
)
related_md = '''## Related open source & HORNO Network ecosystem\n\nThis project is one of the open-source intelligence components developed by **Vincenzo Picciuolo / HRN Innovation Technologies Ltd** and used inside the **HORNO Network ecosystem**.\n\n- **URL Metadata & Social Profile Fetcher** — lightweight deterministic companion for URL metadata, Open Graph, canonical URLs, images and social/profile discovery: https://github.com/vpicciuolo/url-metadata-social-fetcher\n- **HORNO Network** — ecosystem: https://horno.net\n- **HORNO Space** — digital identity and smart-link platform: https://space.horno.net\n- **Easy HORNO** — onboarding, documentation and account experience: https://easy.horno.net\n- **BeHot.Now** — attention marketplace using the URL-first enrichment pattern: https://behot.now\n\nThese links are deliberately present on both GitHub and Hugging Face so the relationship between the projects is explicit for developers, search engines and AI indexing systems.\n'''
insert_before("hf-space/README.md", "## Complete runtime action catalog", related_md)

# Developer docs and environment examples.
replace_once(
    "docs/WEB_RESEARCH.md",
    '''3. Collect eligible external URLs from outbound links and structured data / JSON-LD, including public `sameAs` references.\n4. Search beyond the target domain for entity/domain mentions, articles, reviews, interviews and backlink-style references.\n5. Fetch a bounded set of selected public third-party pages through the SSRF-safe network layer.\n6. Inspect fetched external pages for direct links back to the target domain and mark those sources with `backlink-to-target` discovery evidence.''',
    '''3. Collect eligible external URLs from outbound links, public social/profile links and structured data / JSON-LD, including public `sameAs` references. Direct references from the target receive a dedicated high-priority verification lane.\n4. Open and read eligible direct external destinations through the SSRF-safe network layer. A link does not count as confirmation by itself. Articles, websites and public social/profile pages must be fetched and parsed before they can strengthen corroboration.\n5. Search beyond the target domain for additional entity/domain mentions, articles, reviews, interviews and backlink-style references using the selected external index.\n6. Fetch the selected search results and inspect every fetched external page for entity mentions and direct links back to the target domain. Mark verified backlinks with `backlink-to-target` evidence. Platforms that block automated public access stay visible as unverified instead of being silently trusted.'''
)
replace_once(
    "docs/WEB_RESEARCH.md",
    '''- platform source count\n- source coverage score and level''',
    '''- platform source count and verified-platform count\n- direct-reference count and verified-direct-reference count\n- per-source verification status, analyzed word count and bounded content sample\n- source coverage score and level'''
)
replace_once(
    "docs/WEB_RESEARCH.md",
    '''URL_AGENT_EXTERNAL_MAX_SOURCES=24\nURL_AGENT_EXTERNAL_CONCURRENCY=4''',
    '''URL_AGENT_EXTERNAL_MAX_SOURCES=24\nURL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES=60\nURL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES=24\nURL_AGENT_EXTERNAL_CONCURRENCY=6'''
)
replace_once(
    ".env.example",
    '''URL_AGENT_PROFILE=full-intelligence\nURL_AGENT_SAME_ORIGIN=true''',
    '''URL_AGENT_PROFILE=full-intelligence\nURL_AGENT_EXTERNAL_RESEARCH=true\nURL_AGENT_SEARCH_PROVIDER=google-cse\nURL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES=60\nURL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES=24\nURL_AGENT_EXTERNAL_CONCURRENCY=6\nGOOGLE_CSE_API_KEY=\nGOOGLE_CSE_CX=\nBRAVE_SEARCH_API_KEY=\nSERPER_API_KEY=\nTAVILY_API_KEY=\nURL_AGENT_SEARCH_ENDPOINT=\nURL_AGENT_SAME_ORIGIN=true'''
)

print("External verification + ecosystem/SEO upgrade applied successfully.")
