from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)
    print(f"patched {path}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing expected text for {label}")
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# Runtime search-provider selection
# -----------------------------------------------------------------------------
research_path = "src/research.ts"
research = read(research_path)
provider_block = '''export type SearchProviderName = "google-cse" | "duckduckgo" | "brave" | "serper" | "tavily" | "searxng";

const SEARCH_PROVIDER_LABELS: Record<SearchProviderName, string> = {
  "google-cse": "Google Custom Search",
  duckduckgo: "DuckDuckGo",
  brave: "Brave Search",
  serper: "Serper (Google index)",
  tavily: "Tavily",
  searxng: "SearXNG"
};

function normalizeProvider(value: unknown): SearchProviderName | undefined {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "google" || raw === "google-cse" || raw === "google_custom_search") return "google-cse";
  if (raw === "ddg" || raw === "duckduckgo") return "duckduckgo";
  if (raw === "brave") return "brave";
  if (raw === "serper") return "serper";
  if (raw === "tavily") return "tavily";
  if (raw === "searx" || raw === "searxng") return "searxng";
  return undefined;
}

function providerAvailable(provider: SearchProviderName): boolean {
  if (provider === "duckduckgo") return true;
  if (provider === "google-cse") return Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX);
  if (provider === "brave") return Boolean(process.env.BRAVE_SEARCH_API_KEY);
  if (provider === "serper") return Boolean(process.env.SERPER_API_KEY);
  if (provider === "tavily") return Boolean(process.env.TAVILY_API_KEY);
  if (provider === "searxng") return Boolean(process.env.URL_AGENT_SEARCH_ENDPOINT);
  return false;
}

export function searchProviderStatus() {
  const preferred = normalizeProvider(process.env.URL_AGENT_SEARCH_PROVIDER) || "google-cse";
  const providers = (Object.keys(SEARCH_PROVIDER_LABELS) as SearchProviderName[]).map(id => ({
    id,
    label: SEARCH_PROVIDER_LABELS[id],
    available: providerAvailable(id),
    requiresConfiguration: id !== "duckduckgo"
  }));
  const fallback = providers.find(p => p.id === preferred && p.available)?.id
    || providers.find(p => p.id === "google-cse" && p.available)?.id
    || "duckduckgo";
  return { preferred, default: fallback, providers };
}

function configuredProvider(requestedProvider?: string): SearchProviderName | undefined {
  const explicit = normalizeProvider(requestedProvider);
  if (requestedProvider && !explicit) throw new Error(`Unsupported search provider: ${requestedProvider}`);
  if (explicit) {
    if (!providerAvailable(explicit)) throw new Error(`${SEARCH_PROVIDER_LABELS[explicit]} is not configured on this runtime.`);
    return explicit;
  }
  return searchProviderStatus().default as SearchProviderName;
}'''
research, n = re.subn(
    r'function configuredProvider\(\): string \| undefined \{.*?\n\}',
    provider_block,
    research,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f"Could not replace configuredProvider; matches={n}")
research = replace_once(
    research,
    'export async function researchExternalWeb(rootUrl: string, entityName: string, pages: PageSignal[]): Promise<WebResearchReport> {',
    'export async function researchExternalWeb(rootUrl: string, entityName: string, pages: PageSignal[], requestedProvider?: string): Promise<WebResearchReport> {',
    "researchExternalWeb signature",
)
research = replace_once(research, '  const provider = configuredProvider();', '  const provider = configuredProvider(requestedProvider);', "provider request")
research = replace_once(
    research,
    '  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo search fallback. For higher-volume or more reproducible coverage, configure SearXNG, Brave Search, Serper, Tavily or Google CSE.");',
    '  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo index. Google Custom Search is the preferred hosted provider when GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX are configured; users can choose an available provider in the web interface.");\n  if (provider === "google-cse") notes.push("Web-wide discovery used Google Custom Search as the external index selected for this investigation.");',
    "provider notes",
)
write(research_path, research)


# -----------------------------------------------------------------------------
# Agent carries provider per request (no process-global mutation / no races)
# -----------------------------------------------------------------------------
agent_path = "src/agent.ts"
agent = read(agent_path)
agent = replace_once(
    agent,
    'export type InvestigateOptions = { profile?: string; crawl?: Partial<CrawlPolicy>; force?: boolean; externalResearch?: boolean };',
    'export type InvestigateOptions = { profile?: string; crawl?: Partial<CrawlPolicy>; force?: boolean; externalResearch?: boolean; searchProvider?: string };',
    "InvestigateOptions",
)
agent = replace_once(
    agent,
    '  const cacheKey = `investigate:${rawUrl}:${profile}:${externalResearch ? "web" : "site"}:${JSON.stringify(options.crawl || {})}`;',
    '  const cacheKey = `investigate:${rawUrl}:${profile}:${externalResearch ? "web" : "site"}:${options.searchProvider || "default"}:${JSON.stringify(options.crawl || {})}`;',
    "cache provider",
)
agent = replace_once(
    agent,
    '  const webResearch = externalResearch ? await researchExternalWeb(root.url, name.value, pages) : disabledWebResearch();',
    '  const webResearch = externalResearch ? await researchExternalWeb(root.url, name.value, pages, options.searchProvider) : disabledWebResearch();',
    "research provider",
)
agent = replace_once(
    agent,
    '  const result = await investigate(args.url, { profile: args.profile, force: Boolean(args.force), crawl: args.crawl, externalResearch });',
    '  const result = await investigate(args.url, { profile: args.profile, force: Boolean(args.force), crawl: args.crawl, externalResearch, searchProvider: args.searchProvider });',
    "runAction provider",
)
write(agent_path, agent)


# -----------------------------------------------------------------------------
# HTTP API provider discovery + pre-quota validation
# -----------------------------------------------------------------------------
server_path = "src/server.ts"
server = read(server_path)
server = replace_once(
    server,
    'import { exportFilename, generateHtml, generateJson, generateMarkdown, generatePdf, type ExportReport } from "./export-report.js";',
    'import { exportFilename, generateHtml, generateJson, generateMarkdown, generatePdf, type ExportReport } from "./export-report.js";\nimport { searchProviderStatus } from "./research.js";',
    "server provider import",
)
helper = '''function validateSearchProvider(value: unknown): { ok: true; provider?: string } | { ok: false; message: string } {
  if (value === undefined || value === null || String(value).trim() === "") return { ok: true };
  const requested = String(value).trim().toLowerCase();
  const aliases: Record<string, string> = { google: "google-cse", "google_custom_search": "google-cse", ddg: "duckduckgo", searx: "searxng" };
  const id = aliases[requested] || requested;
  const status = searchProviderStatus();
  const provider = status.providers.find(p => p.id === id);
  if (!provider) return { ok: false, message: `Unsupported external search provider: ${requested}` };
  if (!provider.available) return { ok: false, message: `${provider.label} is not configured on this Hugging Face runtime. Choose an available provider or configure its Space secret(s).` };
  return { ok: true, provider: provider.id };
}

'''
server = replace_once(server, 'function recent(entry: UsageEntry | undefined, now = Date.now()): boolean {', helper + 'function recent(entry: UsageEntry | undefined, now = Date.now()): boolean {', "provider validator insertion")
server = replace_once(
    server,
    '''      if (u.pathname === "/actions") {
        json(res, 200, { actions: actionNames(), publicDemoActions: [...PUBLIC_DEMO_ACTIONS], remoteMcp: meta.mcp, attribution: attributionObject() });
        return;
      }

      const actionMatch''',
    '''      if (u.pathname === "/actions") {
        json(res, 200, { actions: actionNames(), publicDemoActions: [...PUBLIC_DEMO_ACTIONS], remoteMcp: meta.mcp, attribution: attributionObject() });
        return;
      }
      if (u.pathname === "/search-providers" && req.method === "GET") {
        json(res, 200, { ...searchProviderStatus(), note: "Google Custom Search is the preferred hosted index. The runtime falls back to DuckDuckGo when Google credentials are not configured." });
        return;
      }

      const actionMatch''',
    "provider endpoint",
)
old_investigate = '''        args.url = url;
        const before = currentDemoStatus(req, user);
        if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user);
        const result = await runAction("investigate_url", args as any);'''
new_investigate = '''        args.url = url;
        const selected = validateSearchProvider(args.searchProvider);
        if (!selected.ok) { json(res, 400, { error: selected.message, providers: searchProviderStatus(), attribution: attributionObject() }); return; }
        if (selected.provider) args.searchProvider = selected.provider;
        const before = currentDemoStatus(req, user);
        if (!before.allowed) { rateLimited(res, before); return; }
        const demo = await reserveDemoRequest(req, user);
        const result = await runAction("investigate_url", args as any);'''
server = replace_once(server, old_investigate, new_investigate, "investigate provider validation")
server = server.replace('["/", "/health", "/me", "/actions", "/investigate", "/action/:name", "/mcp", "/.well-known/mcp.json", "/llms.txt"]', '["/", "/health", "/me", "/actions", "/search-providers", "/investigate", "/action/:name", "/mcp", "/.well-known/mcp.json", "/llms.txt"]')
write(server_path, server)


# -----------------------------------------------------------------------------
# Hugging Face Docker defaults to Google CSE when configured
# -----------------------------------------------------------------------------
docker_path = "hf-space/Dockerfile"
docker = read(docker_path)
docker = replace_once(
    docker,
    '    URL_AGENT_ASSET_DIR=/app/assets \\\n    URL_AGENT_OWNER_USERNAME=vpicciuolo',
    '    URL_AGENT_ASSET_DIR=/app/assets \\\n    URL_AGENT_OWNER_USERNAME=vpicciuolo \\\n    URL_AGENT_SEARCH_PROVIDER=google-cse',
    "docker google preference",
)
write(docker_path, docker)


# -----------------------------------------------------------------------------
# Hugging Face web UI provider dropdown
# -----------------------------------------------------------------------------
ui_path = "hf-space/index.html"
ui = read(ui_path)
ui = replace_once(
    ui,
    '.form-grid{display:grid;grid-template-columns:minmax(0,1fr) 285px auto;gap:10px}',
    '.form-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px 240px auto;gap:10px}.provider-help{grid-column:1/-1;color:var(--muted);font-size:12px;line-height:1.5;margin-top:-2px}.provider-help strong{color:#d8efff}',
    "provider form css",
)
ui = replace_once(
    ui,
    '''          </select>
          <button id="runBtn" class="btn primary" disabled>Run analysis</button>
        </div>''',
    '''          </select>
          <select id="providerSelect" class="select" aria-label="External search index">
            <option value="google-cse">Google Custom Search · preferred</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="brave">Brave Search</option>
            <option value="serper">Serper · Google index</option>
            <option value="tavily">Tavily</option>
            <option value="searxng">SearXNG</option>
          </select>
          <button id="runBtn" class="btn primary" disabled>Run analysis</button>
          <div id="providerHelp" class="provider-help"><strong>External index:</strong> Google Custom Search is preferred for the hosted Space. Availability is detected from server-side configuration; unavailable providers are disabled automatically.</div>
        </div>''',
    "provider select",
)
ui = ui.replace(
    'This project supports SearXNG, Brave Search, Serper, Tavily and Google Custom Search through environment configuration; without one, external research is limited to third-party URLs discoverable from the target itself.',
    'The hosted Space prefers Google Custom Search and lets signed-in users choose the external index for each Full Investigation. Available alternatives include DuckDuckGo, Brave Search, Serper, Tavily and SearXNG. Provider availability is detected server-side and recorded in the report.',
)
ui = ui.replace(
    '<details class="faq-item"><summary>What if no search provider is configured?</summary><p>The report says so clearly. External evidence is then limited to public third-party URLs discoverable from the target\'s own pages and structured data. For broader web discovery configure SearXNG, Brave Search, Serper, Tavily or Google CSE.</p></details>',
    '<details class="faq-item"><summary>Which external search index does the hosted demo use?</summary><p>Google Custom Search is the preferred hosted index. The selector beside the analysis type lists every supported provider and disables providers that are not configured. DuckDuckGo is available as the built-in fallback. The selected provider is recorded in the result and exported report.</p></details>',
)
old_guide = "function renderActionGuide(){const info=ACTION_GUIDE[currentActionName()] || ACTION_GUIDE.investigate_url;$('actionGuide').innerHTML=`<div class=\"guide-top\"><div><h3>${info.title}</h3><p>${info.desc}</p></div><span class=\"mode ${currentActionName()==='investigate_url'?'web':'hosted'}\">${currentActionName()==='investigate_url'?'Web-wide':'Hosted demo'}</span></div><div class=\"guide-meta\"><span>Input: ${info.input}</span><span>Returns: ${info.output}</span><span>${info.best}</span></div>`;}"
new_guide = "function renderActionGuide(){const info=ACTION_GUIDE[currentActionName()] || ACTION_GUIDE.investigate_url;const usesIndex=currentActionName()==='investigate_url';$('providerSelect').disabled=!usesIndex;$('providerSelect').title=usesIndex?'Choose the external web index for this investigation':'External index is used by Full investigation';$('actionGuide').innerHTML=`<div class=\"guide-top\"><div><h3>${info.title}</h3><p>${info.desc}</p></div><span class=\"mode ${usesIndex?'web':'hosted'}\">${usesIndex?'Web-wide':'Hosted demo'}</span></div><div class=\"guide-meta\"><span>Input: ${info.input}</span><span>Returns: ${info.output}</span><span>${info.best}</span>${usesIndex?`<span>External index: ${$('providerSelect').selectedOptions[0]?.textContent||'auto'}</span>`:''}</div>`;}"
ui = replace_once(ui, old_guide, new_guide, "action guide provider")
old_refresh = "async function refreshStatus(){try{const [healthRes,meRes]=await Promise.all([fetch('/health',{cache:'no-store'}),fetch('/me',{cache:'no-store'})]);const health=await healthRes.json();const me=await meRes.json();session=me;"
new_refresh = "function renderProviders(status){const select=$('providerSelect');const previous=select.value;clear(select);(status.providers||[]).forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.disabled=!p.available;opt.textContent=p.label+(p.id===status.preferred?' · preferred':'')+(p.available?'':' · not configured');select.appendChild(opt)});const desired=(status.providers||[]).some(p=>p.id===previous&&p.available)?previous:status.default;select.value=desired||'duckduckgo';$('providerHelp').innerHTML=`<strong>External index:</strong> ${select.selectedOptions[0]?.textContent||'None'}. Google Custom Search is the preferred hosted index; unavailable providers stay visible but disabled.`;renderActionGuide();}\n\n    async function refreshStatus(){try{const [healthRes,meRes,providersRes]=await Promise.all([fetch('/health',{cache:'no-store'}),fetch('/me',{cache:'no-store'}),fetch('/search-providers',{cache:'no-store'})]);const health=await healthRes.json();const me=await meRes.json();const providers=await providersRes.json();session=me;renderProviders(providers);"
ui = replace_once(ui, old_refresh, new_refresh, "refresh provider status")
ui = replace_once(
    ui,
    "const res=await fetch($('actionSelect').value,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:url.toString()})});",
    "const payload={url:url.toString()};if(currentActionName()==='investigate_url')payload.searchProvider=$('providerSelect').value;const res=await fetch($('actionSelect').value,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});",
    "send provider",
)
ui = replace_once(
    ui,
    "$('actionSelect').addEventListener('change',renderActionGuide);",
    "$('actionSelect').addEventListener('change',renderActionGuide);$('providerSelect').addEventListener('change',()=>{$('providerHelp').innerHTML='<strong>External index:</strong> '+$('providerSelect').selectedOptions[0].textContent+'. The selected provider will be recorded in the Full Investigation result and exports.';renderActionGuide();});",
    "provider change listener",
)
ui = ui.replace('</style>', '@media(max-width:760px){.provider-help{grid-column:1}}\n  </style>', 1)
write(ui_path, ui)

print("provider selector upgrade complete")
