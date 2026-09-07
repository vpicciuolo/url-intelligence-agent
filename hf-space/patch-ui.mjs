import fs from "node:fs";

const file = "/app/index.html";
let html = fs.readFileSync(file, "utf8");

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

  fs.writeFileSync(file, html);
}
