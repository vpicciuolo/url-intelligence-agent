import fs from "node:fs";

const path = "src/provenance.ts";
let source = fs.readFileSync(path, "utf8");

const insertBefore = `function sameStringSet(a: string[], b: string[]): boolean {`;
const helpers = `const EMBEDDED_NUMBER_PATTERN = /(?:about|approximately|around|roughly|over|under|more than|less than|at least|at most|minimum|maximum|min\\.?|max\\.?|>=|<=|>|<|~|≈)?\\s*[-+]?\\d[\\d\\s,.]*(?:\\s*[kmb])?\\+?/giu;\n\nfunction embeddedNumericValues(input: string): Extract<NormalizedEvidenceValue, { kind: "number" }>[] {\n  const out: Extract<NormalizedEvidenceValue, { kind: "number" }>[] = [];\n  for (const match of input.matchAll(EMBEDDED_NUMBER_PATTERN)) {\n    const raw = String(match[0] || "").trim();\n    if (!raw) continue;\n    const normalized = numericCore(raw);\n    if (normalized?.kind === "number") out.push(normalized);\n  }\n  return out;\n}\n\nfunction stripEmbeddedNumbers(input: string): string {\n  return input.replace(EMBEDDED_NUMBER_PATTERN, " ").replace(/\\s+/g, " ").trim();\n}\n\nfunction embeddedNumericStatementsCompatible(a: string, b: string): boolean {\n  const av = embeddedNumericValues(a);\n  const bv = embeddedNumericValues(b);\n  if (!av.length || av.length !== bv.length) return false;\n  const used = new Set<number>();\n  for (const left of av) {\n    let found = -1;\n    for (let i = 0; i < bv.length; i++) {\n      if (used.has(i)) continue;\n      const right = bv[i];\n      if (overlaps({ min: left.min ?? null, max: left.max ?? null }, { min: right.min ?? null, max: right.max ?? null })) {\n        found = i;\n        break;\n      }\n    }\n    if (found < 0) return false;\n    used.add(found);\n  }\n  return true;\n}\n\n${insertBefore}`;
if (!source.includes(insertBefore)) throw new Error("sameStringSet insertion target missing");
source = source.replace(insertBefore, helpers);

const target = `  const anchorsDiffer = aAnchors.length > 0 && bAnchors.length > 0 && !sameStringSet(aAnchors, bAnchors);\n  const negationDiffers = hasNegation(at) !== hasNegation(bt);\n\n  if (anchorsDiffer) {`;
const replacement = `  const anchorsDiffer = aAnchors.length > 0 && bAnchors.length > 0 && !sameStringSet(aAnchors, bAnchors);\n  const negationDiffers = hasNegation(at) !== hasNegation(bt);\n  const embeddedNumbersCompatible = embeddedNumericStatementsCompatible(a.value, b.value);\n  if (embeddedNumbersCompatible && !negationDiffers) {\n    const aWithoutNumbers = semanticTokens(stripEmbeddedNumbers(a.value));\n    const bWithoutNumbers = semanticTokens(stripEmbeddedNumbers(b.value));\n    const textOnlyMetrics = setMetrics(aWithoutNumbers, bWithoutNumbers);\n    if (textOnlyMetrics.sameSet || textOnlyMetrics.containment >= 0.8 || textOnlyMetrics.jaccard >= 0.7) {\n      return { relation: "compatible_range", conflict: false, severity: "none", explanation: "Embedded numeric statements are range-compatible and the surrounding semantic content aligns; the difference is precision/detail rather than contradiction." };\n    }\n  }\n\n  if (anchorsDiffer) {`;
if (!source.includes(target)) throw new Error("compareTextValues target missing");
source = source.replace(target, replacement);

fs.writeFileSync(path, source, "utf8");
console.log("Enabled range-aware comparison for numbers embedded in free text");
