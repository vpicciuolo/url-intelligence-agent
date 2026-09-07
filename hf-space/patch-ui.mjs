import fs from "node:fs";

const file = "/app/index.html";
let html = fs.readFileSync(file, "utf8");

const logo = fs.readFileSync('/app/assets/logo.jpg').toString('base64');
const og = fs.readFileSync('/app/assets/og.jpg').toString('base64');

// Embed the approved production images directly in the visible UI so they do
// not depend on Hugging Face proxy/base-path routing. Metadata continues to
// use the public /assets URLs for social crawlers and previews.
html = html.replace(
  /src=(['"])\/assets\/logo\.jpg(?:\?[^'\"]*)?\1/g,
  `src="data:image/jpeg;base64,${logo}"`
);
html = html.replace(
  /src=(['"])\/assets\/og\.jpg(?:\?[^'\"]*)?\1/g,
  `src="data:image/jpeg;base64,${og}"`
);

if (!html.includes("url-agent-ui-enhancement-v3")) {
  const css = fs.readFileSync("/app/ui-v2.css", "utf8");
  const js = fs.readFileSync("/app/ui-v2.js", "utf8");

  html = html.replace(
    "</head>",
    `<style id="url-agent-ui-enhancement-v3">\n${css}\n</style>\n</head>`
  );
  html = html.replace(
    "</body>",
    `<script id="url-agent-ui-enhancement-v3-script">\n${js}\n</script>\n</body>`
  );
}

fs.writeFileSync(file, html);
console.log("Approved branding embedded into visible Hugging Face UI");
