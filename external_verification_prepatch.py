from pathlib import Path

# Normalize the provider note so the main idempotent upgrade script can apply
# across the already-deployed provider-selector revision.
p = Path('src/research.ts')
text = p.read_text(encoding='utf-8')
needle = '''  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo index. Google Custom Search is the preferred hosted provider when GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX are configured; users can choose an available provider in the web interface.");'''
inserted = '''  notes.push(`${verifiedDirectReferenceSources} of ${directReferenceSources} selected direct external reference(s) were fetched and content-verified as an entity mention or backlink. A link published by the target does not increase corroboration unless the destination itself supports the relationship.`);\n  if (platformSources) notes.push(`${verifiedPlatformSources} of ${platformSources} public social/platform reference(s) were directly fetchable and verified. Platforms that block automated public access remain visible but do not count as verified confirmation.`);\n  if (provider === "duckduckgo") notes.push("Web-wide discovery used the built-in public DuckDuckGo search fallback. For higher-volume or more reproducible coverage, configure SearXNG, Brave Search, Serper, Tavily or Google CSE.");'''
if inserted not in text:
    if needle not in text:
        raise SystemExit('Current DuckDuckGo provider note marker not found')
    text = text.replace(needle, inserted, 1)
    p.write_text(text, encoding='utf-8')
    print('normalized src/research.ts provider note block')
else:
    print('provider note block already normalized')

# Normalize the current provider-aware backlink notice to the older marker used
# by the main upgrade script. The main script immediately replaces this with
# the stronger "external links are leads, not proof" copy.
p = Path('hf-space/index.html')
text = p.read_text(encoding='utf-8')
current_notice = '''      <div class="notice" style="margin-top:16px"><span>ℹ️</span><span><strong>About “all backlinks”:</strong> a crawler cannot enumerate the entire internet by itself. Web-wide backlink/article discovery requires a search index. The hosted Space prefers Google Custom Search and lets signed-in users choose the external index for each Full Investigation. Available alternatives include DuckDuckGo, Brave Search, Serper, Tavily and SearXNG. Provider availability is detected server-side and recorded in the report.</span></div>'''
legacy_notice = '''      <div class="notice" style="margin-top:16px"><span>ℹ️</span><span><strong>About “all backlinks”:</strong> a crawler cannot enumerate the entire internet by itself. Web-wide backlink/article discovery requires a search index. This project supports SearXNG, Brave Search, Serper, Tavily and Google Custom Search through environment configuration; without one, external research is limited to third-party URLs discoverable from the target itself.</span></div>'''
final_notice = '''      <div class="notice" style="margin-top:16px"><span>ℹ️</span><span><strong>External links are leads, not proof:</strong> eligible external URLs found on the target are opened and content-checked before they can strengthen corroboration. Articles are read and parsed; public social/profile pages are also attempted directly. A crawler still cannot enumerate the entire internet by itself, so broad backlink/article discovery additionally uses the selected search index.</span></div>'''
if final_notice not in text and legacy_notice not in text:
    if current_notice not in text:
        raise SystemExit('Current backlink notice marker not found')
    text = text.replace(current_notice, legacy_notice, 1)
    p.write_text(text, encoding='utf-8')
    print('normalized hf-space/index.html backlink notice')
else:
    print('backlink notice already normalized/final')
