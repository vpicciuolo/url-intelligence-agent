import fs from "node:fs";

const file = "/app/index.html";
let html = fs.readFileSync(file, "utf8");

if (!html.includes("url-agent-ui-enhancement-v2")) {
  const css = String.raw`
<style id="url-agent-ui-enhancement-v2">
/* Polished floating navigation */
.top{
  top:12px!important;
  margin-top:6px!important;
  padding:10px 12px!important;
  border:1px solid rgba(75,123,174,.52)!important;
  border-radius:22px!important;
  background:linear-gradient(135deg,rgba(9,25,43,.94),rgba(7,19,34,.90))!important;
  box-shadow:0 18px 55px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.055)!important;
  backdrop-filter:blur(18px) saturate(145%)!important;
  -webkit-backdrop-filter:blur(18px) saturate(145%)!important;
}
.top:after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(110deg,rgba(31,224,255,.055),transparent 35%,rgba(164,88,255,.055));}
.brand,.nav{position:relative;z-index:1}.brand img{width:50px!important;height:50px!important;border-radius:15px!important;border-color:#315a82!important;box-shadow:0 0 0 1px rgba(255,255,255,.035),0 0 28px rgba(31,224,255,.16)!important}
.nav{flex-wrap:nowrap!important;overflow-x:auto!important;overscroll-behavior-inline:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:2px!important}
.nav::-webkit-scrollbar{display:none}.nav .btn{white-space:nowrap;border-radius:999px!important;background:rgba(10,27,46,.88)!important;border-color:rgba(52,91,132,.72)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
.nav .btn:hover{border-color:rgba(79,223,255,.65)!important;background:rgba(14,36,60,.96)!important}

/* External evidence panel */
.web-evidence-panel{margin:0 0 16px;border:1px solid #28517a;border-radius:16px;background:linear-gradient(180deg,#0b1d31,#071522);overflow:hidden;box-shadow:0 14px 38px rgba(0,0,0,.2)}
.web-evidence-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #203f61;background:linear-gradient(90deg,rgba(31,224,255,.055),rgba(164,88,255,.045))}
.web-evidence-head h3{margin:0;font-size:16px}.web-evidence-head p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.coverage-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.035em;border:1px solid #38658d;background:#0a2137}
.coverage-strong{color:#7ef2c9;border-color:#286d5c}.coverage-moderate{color:#7fdfff}.coverage-limited{color:#ffd984;border-color:#6c5a2c}.coverage-none{color:#ffb0b0;border-color:#704048}
.web-evidence-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:13px}.web-evidence-metric{padding:11px;border:1px solid #1d3d5d;border-radius:11px;background:#071827}.web-evidence-metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em}.web-evidence-metric strong{display:block;margin-top:4px;font-size:18px}
.evidence-scope-note{margin:0 13px 13px;padding:11px 12px;border:1px solid #31577f;border-radius:10px;background:#081a2d;color:#c7daed;font-size:12px;line-height:1.55}.evidence-scope-note.warn{border-color:#66572b;background:#1b180d;color:#eadb9e}
.web-source-list{padding:0 13px 13px;display:grid;gap:8px}.web-source{padding:11px;border:1px solid #203e5e;border-radius:11px;background:#06131f}.web-source-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.web-source-title{font-size:13px;font-weight:780;line-height:1.35;word-break:break-word}.web-source-domain{color:#78dff2;font-size:11px;margin-top:3px;word-break:break-all}.web-source-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.web-source-meta span{font-size:10px;border:1px solid #254462;border-radius:999px;padding:4px 7px;color:#b9caDC;background:#091827}.web-source a{font-size:11px;color:#78e7ff;white-space:nowrap}.web-source-failed{opacity:.68}.web-evidence-notes{margin:0 13px 13px;border:1px solid #223f5f;border-radius:10px;background:#06121e}.web-evidence-notes summary{cursor:pointer;padding:10px 11px;font-size:12px;font-weight:760}.web-evidence-notes ul{margin:0;padding:0 24px 12px;color:var(--muted);font-size:11px;line-height:1.55}
.extraction-note{margin:0 0 12px;padding:11px 12px;border:1px solid #3b5170;border-radius:11px;background:#0a1728;color:#b9caDC;font-size:12px;line-height:1.55}.extraction-note strong{color:#fff}

@media(max-width:720px){
  .wrap{padding-top:10px!important}.top{top:8px!important;padding:8px!important;gap:8px!important;border-radius:18px!important;align-items:center!important}.brand{gap:0!important;flex:0 0 auto}.brand span{display:none!important}.brand img{width:48px!important;height:48px!important;border-radius:14px!important}.nav{min-width:0!important;flex:1 1 auto!important;gap:6px!important}.nav .btn{padding:9px 11px!important;font-size:12px!important}.web-evidence-metrics{grid-template-columns:repeat(2,1fr)}.web-evidence-head{padding:13px}.web-evidence-head p{font-size:11px}.coverage-badge{font-size:10px}.web-source-top{flex-direction:column}.web-source a{white-space:normal}
}
</style>`;

  const js = String.raw`
<script id="url-agent-ui-enhancement-v2-script">
(()=>{
  const q=id=>document.getElementById(id);
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
  const safeResult=()=>{try{const raw=q('resultPre')?.textContent||'';if(!raw.trim())return null;const data=JSON.parse(raw);return data?.result||data;}catch{return null;}};
  const metric=(label,value)=>{const box=make('div','web-evidence-metric');box.append(make('span','',label),make('strong','',value));return box;};
  function renderWebEvidence(){
    const result=safeResult();const host=q('evidenceSummary');if(!host||!result)return;
    host.querySelector('#webEvidencePanel')?.remove();host.querySelector('#extractionConfidenceNote')?.remove();
    const note=make('div','extraction-note');note.id='extractionConfidenceNote';
    const strong=make('strong','','Important: ');note.append(strong,document.createTextNode('percentages on individual claim cards are extraction confidence from observed page signals, not a probability that the claim is true. Independent/external corroboration is shown separately below.'));
    host.prepend(note);
    const wr=result.webResearch;if(!wr)return;
    const panel=make('section','web-evidence-panel');panel.id='webEvidencePanel';
    const head=make('div','web-evidence-head');const titleBox=make('div');titleBox.append(make('h3','','External web evidence & source diversity'));
    const subtitle=wr.searchConfigured?`Cross-web discovery is active through ${wr.searchProvider||'configured search'} plus off-site links exposed by the target.`:'External research follows off-site sources exposed by the target. A search provider is not configured, so this run cannot claim complete web-wide discovery.';
    titleBox.append(make('p','',subtitle));
    const badge=make('span',`coverage-badge coverage-${wr.coverageLevel||'none'}`,`${wr.coverageLevel||'none'} coverage`);head.append(titleBox,badge);panel.append(head);
    const metrics=make('div','web-evidence-metrics');metrics.append(metric('First-party pages',result.confidenceAssessment?.firstPartyEvidencePages??result.pages?.length??0),metric('Third-party evidence',wr.corroboratingThirdPartySources??0),metric('Independent domains',wr.corroboratingThirdPartyDomains??0),metric('Coverage score',`${wr.sourceCoverageScore??0}/100`));panel.append(metrics);
    const scope=make('div',`evidence-scope-note${wr.searchConfigured?'':' warn'}`);
    scope.textContent=wr.searchConfigured?'The full investigation now separates first-party extraction from third-party corroboration. Search-discovered pages, structured-data references and outbound sources are fetched and evaluated independently.':'This run can still inspect external articles, profiles and references explicitly linked by the target, but pages that never appear in those links require an external search index. Configure Brave, Serper, Tavily, Google CSE or a SearXNG endpoint for broader backlink/article discovery.';panel.append(scope);
    const list=make('div','web-source-list');
    const sources=[...(wr.sources||[])].sort((a,b)=>Number(b.sourceClass==='third-party')-Number(a.sourceClass==='third-party')||Number(b.mentionsEntity)-Number(a.mentionsEntity)).slice(0,14);
    for(const s of sources){const row=make('article',`web-source${s.error?' web-source-failed':''}`);const top=make('div','web-source-top');const left=make('div');left.append(make('div','web-source-title',s.title||s.searchTitle||s.finalUrl||s.url),make('div','web-source-domain',s.host||''));const a=make('a','','Open source ↗');a.href=s.finalUrl||s.url;a.target='_blank';a.rel='noopener noreferrer';top.append(left,a);row.append(top);const meta=make('div','web-source-meta');meta.append(make('span','',s.sourceClass||'external'),make('span','',s.mentionsEntity?'entity mention':'no explicit mention'),make('span','',s.fetched?`HTTP ${s.status||''}`:'not fetched'));if(s.searchProvider)meta.append(make('span','',`search: ${s.searchProvider}`));if(Array.isArray(s.discoveredBy)&&s.discoveredBy.length)meta.append(make('span','',s.discoveredBy.slice(0,2).join(' · ')));row.append(meta);if(s.error)row.append(make('div','muted',s.error));list.append(row);}
    if(!sources.length)list.append(make('div','evidence-scope-note warn','No external sources were fetched in this run. First-party extraction can still be useful, but it is not independent corroboration.'));
    panel.append(list);
    if(Array.isArray(wr.notes)&&wr.notes.length){const details=make('details','web-evidence-notes');const sum=make('summary','','Coverage notes & limitations');details.append(sum);const ul=make('ul');wr.notes.forEach(x=>{const li=make('li','',x);ul.append(li)});details.append(ul);panel.append(details);}
    note.after(panel);
  }
  const raw=q('resultPre');if(raw){new MutationObserver(renderWebEvidence).observe(raw,{childList:true,subtree:true,characterData:true});}
  document.addEventListener('DOMContentLoaded',renderWebEvidence);setTimeout(renderWebEvidence,350);
})();
</script>`;

  html = html.replace("+'% confidence';head.append(path,conf);", "+'% extraction confidence';head.append(path,conf);");
  html = html.replace("</head>", `${css}\n</head>`);
  html = html.replace("</body>", `${js}\n</body>`);
  fs.writeFileSync(file, html);
}
