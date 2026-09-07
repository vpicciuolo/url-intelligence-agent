from pathlib import Path
import re

APP = "https://vpicciuolo-url-intelligence-agent.hf.space/"
APP_NO_SLASH = APP.rstrip("/")
HF = "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent"
ASSET_VERSION = "20260908-2"
OG = f"{APP_NO_SLASH}/assets/og.jpg?v={ASSET_VERSION}"
LOGO = f"/assets/logo.jpg?v={ASSET_VERSION}"
SHORT_DESCRIPTION = "Evidence-first URL intelligence, reports and Remote MCP."

readme_path = Path("hf-space/README.md")
readme = readme_path.read_text(encoding="utf-8")
frontmatter_match = re.match(r"^---\n(.*?)\n---\n", readme, re.S)
if not frontmatter_match:
    raise SystemExit("Space README frontmatter not found")
front = frontmatter_match.group(1)
front = re.sub(r"^title:.*$", "title: URL Intelligence Agent", front, flags=re.M)
front = re.sub(r"^short_description:.*$", f"short_description: {SHORT_DESCRIPTION}", front, flags=re.M)
front = re.sub(r"^thumbnail:.*$", f"thumbnail: {OG}", front, flags=re.M)
readme = "---\n" + front + "\n---\n" + readme[frontmatter_match.end():]
readme_path.write_text(readme, encoding="utf-8")

index_path = Path("hf-space/index.html")
html = index_path.read_text(encoding="utf-8")
html = re.sub(r'<link rel="icon" type="image/jpeg" href="[^"]*"\s*/>', f'<link rel="icon" type="image/jpeg" href="{LOGO}" />', html, count=1)
html = re.sub(r'<link rel="apple-touch-icon" href="[^"]*"\s*/>', f'<link rel="apple-touch-icon" href="{LOGO}" />', html, count=1)
html = re.sub(r'<link rel="preload" as="image" href="[^"]*" fetchpriority="high"\s*/>', f'<link rel="preload" as="image" href="{LOGO}" fetchpriority="high" />', html, count=1)
html = re.sub(r'<meta property="og:image" content="[^"]*"\s*/>', f'<meta property="og:image" content="{OG}" />', html, count=1)
html = re.sub(r'<meta property="og:image:secure_url" content="[^"]*"\s*/>', f'<meta property="og:image:secure_url" content="{OG}" />', html, count=1)
html = re.sub(r'<meta name="twitter:image" content="[^"]*"\s*/>', f'<meta name="twitter:image" content="{OG}" />', html, count=1)
index_path.write_text(html, encoding="utf-8")

print("Hugging Face branding metadata updated to approved production assets")
