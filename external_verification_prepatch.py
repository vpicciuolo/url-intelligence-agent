from pathlib import Path

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
