from pathlib import Path
import re

APP = "https://vpicciuolo-url-intelligence-agent.hf.space/"
APP_NO_SLASH = APP.rstrip("/")
HF = "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"
OG = f"{APP_NO_SLASH}/assets/og.jpg?v=20260908-1"
LOGO = "/assets/logo.jpg?v=20260908-1"
SHORT_DESCRIPTION = "Evidence-first URL intelligence, reports and Remote MCP."


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Expected {label} not found")
    return text.replace(old, new, 1)


# ---- Hugging Face Space card metadata / SEO ----
readme_path = Path("hf-space/README.md")
readme = readme_path.read_text(encoding="utf-8")

frontmatter_match = re.match(r"^---\n(.*?)\n---\n", readme, re.S)
if not frontmatter_match:
    raise SystemExit("Space README frontmatter not found")
front = frontmatter_match.group(1)

# Add/replace supported Hugging Face Space card metadata.
front = re.sub(r"^title:.*$", "title: URL Intelligence Agent", front, flags=re.M)
front = re.sub(r"^short_description:.*$", f"short_description: {SHORT_DESCRIPTION}", front, flags=re.M)
if len(SHORT_DESCRIPTION) > 60:
    raise SystemExit(f"Hugging Face short_description is too long: {len(SHORT_DESCRIPTION)}")
if re.search(r"^colorFrom:", front, re.M):
    front = re.sub(r"^colorFrom:.*$", "colorFrom: blue", front, flags=re.M)
else:
    front = front.replace("emoji: 🧠", "emoji: 🧠\ncolorFrom: blue")
if re.search(r"^colorTo:", front, re.M):
    front = re.sub(r"^colorTo:.*$", "colorTo: purple", front, flags=re.M)
else:
    front = front.replace("colorFrom: blue", "colorFrom: blue\ncolorTo: purple")
if re.search(r"^thumbnail:", front, re.M):
    front = re.sub(r"^thumbnail:.*$", f"thumbnail: {OG}", front, flags=re.M)
else:
    front = front.replace(
        f"short_description: {SHORT_DESCRIPTION}",
        f"short_description: {SHORT_DESCRIPTION}\nthumbnail: {OG}"
    )

extra_tags = [
    "ai-agent",
    "web-crawler",
    "source-verification",
    "due-diligence",
    "open-graph",
    "social-discovery",
    "competitive-intelligence",
    "website-monitoring",
]
for tag in extra_tags:
    if f"  - {tag}" not in front:
        front += f"\n  - {tag}"

readme = "---\n" + front + "\n---\n" + readme[frontmatter_match.end():]

live_marker = "## Live hosted demo\n\n"
live_links = (
    "## Live hosted demo\n\n"
    f"**Live app:** {APP}\n\n"
    f"**Public Remote MCP:** {APP_NO_SLASH}/mcp\n\n"
    f"**Hugging Face Space:** {HF}\n\n"
)
if "**Live app:**" not in readme and live_marker in readme:
    readme = replace_once(readme, live_marker, live_links, "Live hosted demo heading")

readme_path.write_text(readme, encoding="utf-8")


# ---- Direct hf.space app metadata / social cards ----
index_path = Path("hf-space/index.html")
html = index_path.read_text(encoding="utf-8")
head_end = html.find("</head>")
if head_end < 0:
    raise SystemExit("index.html head not found")
head = html[:head_end]
body = html[head_end:]

head = re.sub(
    r"<title>.*?</title>",
    "<title>URL Intelligence Agent | Evidence-First Web Intelligence & Remote MCP</title>",
    head,
    count=1,
    flags=re.S,
)
head = re.sub(
    r'<meta name="description" content="[^"]*"\s*/>',
    '<meta name="description" content="Open-source evidence-first URL and web intelligence agent. Crawl sites, verify external sources, resolve entities, audit SEO/security/trust, export due-diligence reports and connect through Remote MCP." />',
    head,
    count=1,
)
head = re.sub(r'<link rel="canonical" href="[^"]*"\s*/>', f'<link rel="canonical" href="{APP}" />', head, count=1)

# Search bot directives, kept explicit for major crawlers while respecting robots.txt.
robots_tag = '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />'
if 'name="googlebot"' not in head:
    head = head.replace(
        robots_tag,
        robots_tag + '\n  <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="bingbot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />'
    )

head = re.sub(r'<link rel="icon" type="image/jpeg" href="[^"]*"\s*/>', f'<link rel="icon" type="image/jpeg" href="{LOGO}" />', head, count=1)
head = re.sub(r'<link rel="apple-touch-icon" href="[^"]*"\s*/>', f'<link rel="apple-touch-icon" href="{LOGO}" />', head, count=1)
head = re.sub(r'<link rel="preload" as="image" href="[^"]*" fetchpriority="high"\s*/>', f'<link rel="preload" as="image" href="{LOGO}" fetchpriority="high" />', head, count=1)
if 'rel="preload" as="image"' not in head:
    head = head.replace(
        f'<link rel="apple-touch-icon" href="{LOGO}" />',
        f'<link rel="apple-touch-icon" href="{LOGO}" />\n  <link rel="preload" as="image" href="{LOGO}" fetchpriority="high" />'
    )

# Open Graph metadata.
head = re.sub(r'<meta property="og:title" content="[^"]*"\s*/>', '<meta property="og:title" content="URL Intelligence Agent | Evidence-First Web Intelligence" />', head, count=1)
head = re.sub(r'<meta property="og:description" content="[^"]*"\s*/>', '<meta property="og:description" content="URL in. Evidence out. Crawl the target, read and verify external sources, measure corroboration, expose contradictions, export reports and connect through Remote MCP." />', head, count=1)
head = re.sub(r'<meta property="og:url" content="[^"]*"\s*/>', f'<meta property="og:url" content="{APP}" />', head, count=1)
head = re.sub(r'<meta property="og:image" content="[^"]*"\s*/>', f'<meta property="og:image" content="{OG}" />', head, count=1)
head = re.sub(r'<meta property="og:image:secure_url" content="[^"]*"\s*/>', f'<meta property="og:image:secure_url" content="{OG}" />', head, count=1)
head = re.sub(r'<meta property="og:image:alt" content="[^"]*"\s*/>', '<meta property="og:image:alt" content="URL Intelligence Agent — evidence-first web intelligence, live Hugging Face demo and Remote MCP" />', head, count=1)
if 'property="og:image:width"' not in head:
    head = head.replace(
        '<meta property="og:image:type" content="image/jpeg" />',
        '<meta property="og:image:type" content="image/jpeg" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />'
    )
if 'property="og:locale"' not in head:
    head = head.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n  <meta property="og:locale" content="en_US" />')

# X / Twitter card metadata.
head = re.sub(r'<meta name="twitter:title" content="[^"]*"\s*/>', '<meta name="twitter:title" content="URL Intelligence Agent | Evidence-First Web Intelligence" />', head, count=1)
head = re.sub(r'<meta name="twitter:description" content="[^"]*"\s*/>', '<meta name="twitter:description" content="Crawl websites, verify external articles and social sources, preserve provenance and contradictions, export reports and connect through Remote MCP." />', head, count=1)
head = re.sub(r'<meta name="twitter:image" content="[^"]*"\s*/>', f'<meta name="twitter:image" content="{OG}" />', head, count=1)
head = re.sub(r'<meta name="twitter:image:alt" content="[^"]*"\s*/>', '<meta name="twitter:image:alt" content="URL Intelligence Agent — evidence-first web intelligence on Hugging Face" />', head, count=1)

# Canonical structured-data URLs belong to the public app. Keep the Hugging Face
# repository as an explicit identity/discovery relationship rather than canonical.
software_repo_line = '"codeRepository":"https://github.com/vpicciuolo/url-intelligence-agent",'
if '"sameAs":["https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"' not in head:
    head = head.replace(
        software_repo_line,
        software_repo_line + '\n        "sameAs":["https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent","https://github.com/vpicciuolo/url-intelligence-agent"],'
    )

html = head + body

# Public logo is present regardless of OAuth/session state. The Docker patcher
# replaces visible logo/hero image src attributes with verified embedded data URIs,
# while metadata keeps absolute public URLs for crawlers and social previews.
html = html.replace(
    '<img src="/assets/logo.jpg" alt="URL Intelligence Agent logo" />',
    f'<img src="{LOGO}" alt="URL Intelligence Agent logo" width="52" height="52" fetchpriority="high" decoding="async" />',
)
html = html.replace(
    '.brand img{width:52px;height:52px;object-fit:cover;',
    '.brand img{width:52px;height:52px;object-fit:contain;background:#02060c;padding:2px;',
)
index_path.write_text(html, encoding="utf-8")


# ---- Header polish / reliable logo rendering ----
css_path = Path("hf-space/ui-v2.css")
css = css_path.read_text(encoding="utf-8")
css = css.replace(
    '  border-radius:24px;\n  background:linear-gradient(135deg,rgba(7,21,38,.94),rgba(7,15,27,.88) 58%,rgba(22,15,48,.86))!important;',
    '  border-radius:26px;\n  background:linear-gradient(135deg,rgba(7,21,38,.96),rgba(7,15,27,.91) 58%,rgba(22,15,48,.89))!important;'
)
brand_img = '''.brand img{\n  width:48px!important;\n  height:48px!important;\n  border-radius:15px!important;\n  border-color:rgba(77,132,185,.68)!important;\n}'''
brand_img_new = '''.brand img{\n  width:48px!important;\n  height:48px!important;\n  object-fit:contain!important;\n  background:#02060c!important;\n  padding:2px!important;\n  border-radius:15px!important;\n  border-color:rgba(77,132,185,.68)!important;\n}'''
if brand_img in css:
    css = css.replace(brand_img, brand_img_new)
elif 'object-fit:contain!important' not in css:
    raise SystemExit("Expected brand image CSS not found")
css_path.write_text(css, encoding="utf-8")


# ---- Asset documentation: keep only relevant ecosystem relationships ----
assets_readme = Path("hf-space/assets/README.txt")
assets_readme.write_text(
    "Brand assets for the Hugging Face Space. The Docker build reconstructs logo.jpg and og.jpg from text-safe embedded base64 sources so branding never depends on login state or an external image host.\n\n"
    "logo.jpg: URL Intelligence Agent project logo.\n"
    "og.jpg: 1200x630 social/Open Graph preview, kept below 800 KB.\n\n"
    "Project relationships: URL Intelligence Agent is an open-source intelligence component developed and production-tested inside the HORNO Network ecosystem. Related: https://github.com/vpicciuolo/url-metadata-social-fetcher · https://horno.net · https://space.horno.net\n",
    encoding="utf-8",
)

print("Hugging Face branding, SEO and social metadata updated")
