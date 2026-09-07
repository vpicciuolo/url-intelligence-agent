import fs from "node:fs";

const file = "/app/index.html";
let html = fs.readFileSync(file, "utf8");

// Visible branding should use the exact deployed image files. The deploy
// workflow downloads the requested logo and social image into /assets.
// Keep paths relative so they also resolve when the Space is rendered through
// the huggingface.co/spaces/... proxy path.
html = html.replace(
  /src=(['"])\/assets\/logo\.jpg(?:\?[^'\"]*)?\1/g,
  'src="assets/logo.jpg?v=20260908-2"'
);
html = html.replace(
  /src=(['"])\/assets\/og\.jpg(?:\?[^'\"]*)?\1/g,
  'src="assets/og.jpg?v=20260908-2"'
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
console.log("UI branding paths normalized for Hugging Face proxy rendering");
