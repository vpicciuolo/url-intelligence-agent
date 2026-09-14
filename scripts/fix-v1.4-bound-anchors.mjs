import fs from "node:fs";

const path = "src/provenance.ts";
let source = fs.readFileSync(path, "utf8");
const oldLine = '  for (const match of input.matchAll(/(?:^|[^\\p{L}\\p{N}])([-+]?\\d[\\d\\s,.]*)(?:\\s*([kmb]))?(\\+)?(?:\\b|$)/giu)) {';
const newLine = '  for (const match of input.matchAll(/(?:^|[^\\p{L}\\p{N}])([-+]?\\d[\\d\\s,.]*)(?:\\s*([kmb]))?(\\+)?(?!\\+)(?:\\b|$)/giu)) {';
if (!source.includes(oldLine)) throw new Error("v1.4 factual-anchor regex target not found");
source = source.replace(oldLine, newLine);
fs.writeFileSync(path, source, "utf8");
console.log("Preserved + lower-bound qualifier in free-text factual anchors");
