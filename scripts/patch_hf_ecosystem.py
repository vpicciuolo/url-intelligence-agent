from pathlib import Path
import re

p = Path('hf-space/index.html')
text = p.read_text(encoding='utf-8')

text = text.replace('HORNO Network, HORNO ecosystem, HORNO Space, Easy HORNO, URL Metadata Social Profile Fetcher, HRN Innovation Technologies', 'HORNO Network, HORNO ecosystem, HORNO Space, URL Metadata Social Profile Fetcher, HRN Innovation Technologies, Vincenzo Picciuolo')
text = text.replace('"citation":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://easy.horno.net","https://space.horno.net"]', '"citation":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://space.horno.net"]')
text = text.replace('"sameAs":["https://github.com/vpicciuolo","https://huggingface.co/vpicciuolo","https://www.linkedin.com/in/vpicciuolo/"]', '"sameAs":["https://github.com/vpicciuolo","https://huggingface.co/vpicciuolo","https://x.com/vpicciuolo","https://www.linkedin.com/in/vpicciuolo/"]')
text = text.replace('"relatedLink":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://easy.horno.net","https://space.horno.net","https://behot.now"]', '"relatedLink":["https://github.com/vpicciuolo/url-metadata-social-fetcher","https://horno.net","https://space.horno.net"]')

new_section = '''    <section class="section" id="ecosystem">
      <h2>Built inside HORNO Network. Now open source.</h2>
      <p>URL Intelligence Agent was not created as a standalone demo. It was developed, tested and refined inside the HORNO Network ecosystem, where its URL intelligence, evidence collection and enrichment workflows run in real production use cases. After proving the technology in a live ecosystem, HORNO Network founder Vincenzo Picciuolo chose to release the project as open source so developers, AI builders, researchers and companies can inspect it, self-host it, extend it and build with it. The project is developed by Vincenzo Picciuolo / HRN Innovation Technologies Ltd.</p>
      <div class="grid">
        <article class="card"><h3>URL Metadata &amp; Social Profile Fetcher</h3><p>The lightweight deterministic companion for fast URL enrichment, Open Graph and SEO metadata, canonical URLs, images and public social/profile discovery.</p><a class="source-link" href="https://github.com/vpicciuolo/url-metadata-social-fetcher?utm_source=huggingface&amp;utm_medium=referral&amp;utm_campaign=url_intelligence_agent" target="_blank" rel="noopener">Explore URL Metadata &amp; Social Profile Fetcher on GitHub ↗</a></article>
        <article class="card"><h3>HORNO Network</h3><p>The production ecosystem where URL Intelligence Agent has been developed, tested and used across live URL, identity, discovery and intelligence workflows.</p><a class="source-link" href="https://horno.net/?utm_source=huggingface&amp;utm_medium=referral&amp;utm_campaign=url_intelligence_agent" target="_blank" rel="noopener">Explore the HORNO Network ecosystem at horno.net ↗</a></article>
        <article class="card"><h3>HORNO Space</h3><p>HORNO Space is the digital identity and smart-link product connected to the URL enrichment and public-profile intelligence layer.</p><a class="source-link" href="https://space.horno.net/?utm_source=huggingface&amp;utm_medium=referral&amp;utm_campaign=url_intelligence_agent" target="_blank" rel="noopener">Explore HORNO Space digital identity at space.horno.net ↗</a></article>
      </div>
      <div class="panel" style="margin-top:18px;padding:20px">
        <h3 style="margin-top:0">Follow Vincenzo Picciuolo</h3>
        <p class="muted" style="line-height:1.65">Follow the founder for URL Intelligence Agent releases, open-source development and updates from the HORNO Network ecosystem.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <a class="btn" href="https://x.com/vpicciuolo?utm_source=huggingface&amp;utm_medium=social&amp;utm_campaign=url_intelligence_agent" target="_blank" rel="noopener">Follow @vpicciuolo on X ↗</a>
          <a class="btn" href="https://www.linkedin.com/in/vpicciuolo/?utm_source=huggingface&amp;utm_medium=social&amp;utm_campaign=url_intelligence_agent" target="_blank" rel="noopener">Follow Vincenzo Picciuolo on LinkedIn ↗</a>
        </div>
      </div>
    </section>'''

pattern = re.compile(r'    <section class="section" id="ecosystem">.*?    </section>\n\n    <section class="section" id="actions">', re.S)
if not pattern.search(text):
    raise SystemExit('Ecosystem section not found')
text = pattern.sub(new_section + '\n\n    <section class="section" id="actions">', text, count=1)
p.write_text(text, encoding='utf-8')
print('Updated hf-space/index.html')
