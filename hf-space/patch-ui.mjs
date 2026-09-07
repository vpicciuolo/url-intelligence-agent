import fs from "node:fs";
import path from "node:path";

const file = "/app/index.html";
const assetDir = "/app/assets";
let html = fs.readFileSync(file, "utf8");

function cleanBase64(value) {
  return String(value || "").replace(/\s+/g, "");
}

function repairJpeg(data, name, minimum) {
  if (data.length < minimum || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error(`${name} is not a valid embedded JPEG (${data.length} bytes)`);
  }

  let end = -1;
  for (let i = data.length - 2; i >= 2; i -= 1) {
    if (data[i] === 0xff && data[i + 1] === 0xd9) {
      end = i + 2;
      break;
    }
  }

  if (end >= 0) return data.subarray(0, end);
  return Buffer.concat([data, Buffer.from([0xff, 0xd9])]);
}

function embeddedBrandImages() {
  const logoSource = cleanBase64(
    fs.readFileSync(path.join(assetDir, "logo.base64.txt"), "utf8")
  );
  const logo = repairJpeg(Buffer.from(logoSource, "base64"), "logo.jpg", 5000);

  const parts = fs.readdirSync(assetDir)
    .filter((name) => /^og\.\d+\.b64$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!parts.length) throw new Error("Open Graph image chunks are missing");

  const ogSource = parts
    .map((name) => cleanBase64(fs.readFileSync(path.join(assetDir, name), "utf8")))
    .join("");
  const og = repairJpeg(Buffer.from(ogSource, "base64"), "og.jpg", 15000);

  return {
    logo: `data:image/jpeg;base64,${logo.toString("base64")}`,
    og: `data:image/jpeg;base64,${og.toString("base64")}`,
  };
}

// Keep visible branding independent from Hugging Face proxy/base-path routing.
// Social/Open Graph metadata intentionally keeps its public absolute hf.space URL.
const images = embeddedBrandImages();
html = html.replace(
  /src=(['"])\/assets\/logo\.jpg(?:\?[^'\"]*)?\1/g,
  `src="${images.logo}"`
);
html = html.replace(
  /src=(['"])\/assets\/og\.jpg(?:\?[^'\"]*)?\1/g,
  `src="${images.og}"`
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
console.log("UI branding images embedded and verified");
