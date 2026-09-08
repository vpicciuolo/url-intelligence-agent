from pathlib import Path
import json


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Upgrade anchor not found: {label}")
    return text.replace(old, new, 1)


# 1) Public relation vocabulary.
p = read("src/types.ts")
p = replace_once(
    p,
    '    | "semantic_equivalent"\n    | "compatible_range"',
    '    | "semantic_equivalent"\n    | "wording_variation"\n    | "compatible_range"',
    "types wording_variation",
)
p = replace_once(
    p,
    '    | "temporal_drift"\n    | "value_conflict"',
    '    | "temporal_drift"\n    | "factual_disagreement"\n    | "logical_contradiction"\n    | "value_conflict"',
    "types semantic conflict relations",
)
write("src/types.ts", p)

# 2) Core deterministic semantic conflict classifier.
p = read("src/provenance.ts")
old = 'const STABLE_PREDICATES = /(?:canonical|title|description|language|robots|currency|availability|published|modified|founding|start_date|end_date|author|name|url)$/i;\n'
new = '''const STABLE_PREDICATES = /(?:canonical|language|robots|currency|availability|published|modified|founding|start_date|end_date|author|name|url)$/i;
const TEXT_VARIATION_PREDICATES = /(?:description|title|headline|summary|tagline|slogan|site_name)$/i;
const IDENTITY_PREDICATES = /(?:^name$|author|creator|publisher|brand|site_name)$/i;
'''
p = replace_once(p, old, new, "predicate policies")

anchor = 'type Comparison = { relation: ClaimConflict["relation"]; conflict: boolean; severity: ClaimConflict["severity"]; explanation: string };\n\n'
helpers = r'''type Comparison = { relation: ClaimConflict["relation"]; conflict: boolean; severity: ClaimConflict["severity"]; explanation: string };

const TEXT_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with",
  "il", "lo", "la", "i", "gli", "le", "di", "da", "del", "della", "e", "un", "una", "per", "con",
  "el", "la", "los", "las", "de", "del", "y", "un", "una", "para", "con",
  "le", "les", "de", "des", "du", "et", "un", "une", "pour", "avec",
  "der", "die", "das", "den", "dem", "des", "und", "ein", "eine", "für", "mit"
]);
const NEGATION_WORDS = new Set(["not", "no", "never", "without", "none", "neither", "nor", "false", "disabled", "unavailable", "non", "senza", "mai", "nunca", "sin", "pas", "sans", "nicht", "kein", "keine", "ohne"]);

function semanticTokens(input: string): string[] {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .split(/\s+/)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x.length > 1)
    .filter(x => !TEXT_STOPWORDS.has(x));
}

function setMetrics(a: string[], b: string[]) {
  const as = new Set(a), bs = new Set(b);
  const intersection = [...as].filter(x => bs.has(x)).length;
  const union = new Set([...as, ...bs]).size;
  const minSize = Math.max(1, Math.min(as.size, bs.size));
  return {
    intersection,
    jaccard: union ? intersection / union : 0,
    containment: intersection / minSize,
    sameSet: as.size === bs.size && intersection === as.size
  };
}

function factualAnchors(input: string): string[] {
  const out = new Set<string>();
  for (const match of input.matchAll(/(?:^|[^\p{L}\p{N}])([-+]?\d[\d\s,.]*)(?:\s*([kmb]))?(?:\b|\+|$)/giu)) {
    const normalized = numericCore(`${match[1]}${match[2] || ""}`);
    if (normalized?.kind === "number") out.add(`n:${normalized.value}`);
  }
  for (const match of input.matchAll(/https?:\/\/[^\s)\]}>]+/gi)) out.add(`u:${normalizeUrl(match[0]) || match[0]}`);
  for (const match of input.matchAll(/\b(?:USD|EUR|GBP|AED)\b|[$€£]/gi)) out.add(`c:${match[0].toUpperCase()}`);
  return [...out].sort();
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function hasNegation(tokens: string[]): boolean {
  return tokens.some(token => NEGATION_WORDS.has(token));
}

function compareTextValues(a: Extract<NormalizedEvidenceValue, { kind: "string" }>, b: Extract<NormalizedEvidenceValue, { kind: "string" }>, predicate: string): Comparison {
  if (a.value === b.value) return { relation: "exact_match", conflict: false, severity: "none", explanation: "Strings match exactly." };
  if (a.folded === b.folded) return { relation: "normalized_match", conflict: false, severity: "none", explanation: "Strings match after Unicode/case/punctuation normalization." };

  const at = semanticTokens(a.folded), bt = semanticTokens(b.folded);
  const metrics = setMetrics(at, bt);
  const aAnchors = factualAnchors(a.value), bAnchors = factualAnchors(b.value);
  const anchorsDiffer = aAnchors.length > 0 && bAnchors.length > 0 && !sameStringSet(aAnchors, bAnchors);
  const negationDiffers = hasNegation(at) !== hasNegation(bt);

  if (anchorsDiffer) {
    return { relation: "factual_disagreement", conflict: true, severity: "high", explanation: `Free-text values contain different factual anchors (${aAnchors.join(", ")} vs ${bAnchors.join(", ")}).` };
  }
  if (negationDiffers && (metrics.containment >= 0.55 || metrics.jaccard >= 0.4)) {
    return { relation: "logical_contradiction", conflict: true, severity: "high", explanation: "The statements share the same subject/content but differ in explicit negation or availability polarity." };
  }
  if (metrics.sameSet && at.length >= 2) {
    return { relation: "semantic_equivalent", conflict: false, severity: "none", explanation: "The same meaningful terms are present after normalization; word order or surface phrasing differs." };
  }
  if ((metrics.containment >= 0.84 && metrics.jaccard >= 0.58) || metrics.jaccard >= 0.76) {
    return { relation: "semantic_equivalent", conflict: false, severity: "none", explanation: `High semantic-token overlap (${Math.round(metrics.jaccard * 100)}% Jaccard; ${Math.round(metrics.containment * 100)}% containment) indicates equivalent wording, not a contradiction.` };
  }
  if (TEXT_VARIATION_PREDICATES.test(predicate)) {
    if (metrics.containment >= 0.55 || metrics.jaccard >= 0.35) {
      return { relation: "wording_variation", conflict: false, severity: "low", explanation: `Free-text ${predicate} values express overlapping content with different wording/detail (${Math.round(metrics.containment * 100)}% containment).` };
    }
    return { relation: "wording_variation", conflict: false, severity: "low", explanation: `Free-text ${predicate} wording differs, but no incompatible factual anchor or explicit logical contradiction was detected.` };
  }
  if (IDENTITY_PREDICATES.test(predicate)) {
    return { relation: "factual_disagreement", conflict: true, severity: "high", explanation: "Identity-like text values differ after normalization and semantic token comparison." };
  }
  return { relation: "factual_disagreement", conflict: true, severity: STABLE_PREDICATES.test(predicate) ? "high" : "medium", explanation: "Text values differ materially after normalization and semantic comparison." };
}

'''
p = replace_once(p, anchor, helpers, "semantic helper insertion")

old_string = '''  if (a.kind === "string" && b.kind === "string") {
    if (a.value === b.value) return { relation: "exact_match", conflict: false, severity: "none", explanation: "Strings match exactly." };
    if (a.folded === b.folded) return { relation: "normalized_match", conflict: false, severity: "none", explanation: "Strings match after Unicode/case/punctuation normalization." };
    return { relation: "value_conflict", conflict: true, severity: STABLE_PREDICATES.test(predicate) ? "high" : "medium", explanation: "String values differ after normalization." };
  }
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value ? { relation: "exact_match", conflict: false, severity: "none", explanation: "Boolean values match." } : { relation: "value_conflict", conflict: true, severity: "high", explanation: "Boolean values differ." };
'''
new_string = '''  if (a.kind === "string" && b.kind === "string") return compareTextValues(a, b, predicate);
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value ? { relation: "exact_match", conflict: false, severity: "none", explanation: "Boolean values match." } : { relation: "logical_contradiction", conflict: true, severity: "high", explanation: "Boolean values express opposite truth states." };
'''
p = replace_once(p, old_string, new_string, "string comparison branch")

p = replace_once(
    p,
    '      if (comparison.relation === "compatible_range") compatible = true;\n',
    '      if (["compatible_range", "semantic_equivalent", "wording_variation"].includes(comparison.relation)) compatible = true;\n',
    "compatible semantic relations",
)

old_flags = '  const flags: string[] = [];\n  const representations = new Set(observations.map(x => x.source.representation));\n'
new_flags = '''  const flags: string[] = [];
  const relations = new Set(comparisons.map(x => x.relation));
  if (relations.has("semantic_equivalent")) flags.push("semantic_equivalence");
  if (relations.has("wording_variation")) flags.push("wording_variation");
  if (relations.has("factual_disagreement")) flags.push("factual_disagreement");
  if (relations.has("logical_contradiction")) flags.push("logical_contradiction");
  const representations = new Set(observations.map(x => x.source.representation));
'''
p = replace_once(p, old_flags, new_flags, "semantic flags")

old_expl = '  if (flags.includes("precision_difference")) explanation.push("Approximate/lower-bound and exact values are treated as compatible when their numeric ranges overlap.");\n'
new_expl = '''  if (flags.includes("precision_difference")) explanation.push("Approximate/lower-bound and exact values are treated as compatible when their numeric ranges overlap.");
  if (flags.includes("semantic_equivalence")) explanation.push("Surface wording differs, but deterministic semantic-token comparison found equivalent meaning without conflicting factual anchors.");
  if (flags.includes("wording_variation")) explanation.push("Free-text wording/detail varies without evidence of a factual or logical contradiction.");
  if (flags.includes("logical_contradiction")) explanation.push("A true logical contradiction was detected from explicit polarity/negation over substantially shared content.");
  if (flags.includes("factual_disagreement")) explanation.push("The compared values contain materially different factual content or identity anchors.");
'''
p = replace_once(p, old_expl, new_expl, "semantic resolution explanations")
write("src/provenance.ts", p)

# 3) Regression tests.
p = read("tests/basic.test.ts")
p = p.replace('assert.equal(PROJECT.version, "1.2.0");', 'assert.equal(PROJECT.version, "1.3.0");')
p = p.replace('assert.equal(PROJECT.release, "Provenance & Consistency Release");', 'assert.equal(PROJECT.release, "Semantic Conflict Intelligence Release");')
tests = r'''

test("description wording differences are compatible, not contradictions", () => {
  const url = "https://artist.test/";
  const html = `<html><head>
    <meta name="description" content="Official website of DeeJay Pico, electronic music DJ and producer. Explore the full discography, watch videos, and listen to the latest releases.">
    <meta property="og:description" content="Official website of DJ and music producer DeeJay Pico. Explore the full discography, watch videos, and listen to the latest releases.">
    <meta name="twitter:description" content="Official website of DeeJay Pico. Explore the full discography, watch videos, and listen to the latest releases.">
  </head><body><h1>DeeJay Pico</h1></body></html>`;
  const representation = analyzeRepresentation(html, url, "source_html", { finalUrl: url, observedAt: "2026-09-08T12:00:00.000Z" });
  const page: PageSignal = { ...parsePage(html, url, 200), representations: [representation], observations: representation.observations };
  const report = buildProvenanceReport([page]);
  const description = report.claims.find(x => x.predicate === "description");
  assert.ok(description);
  assert.notEqual(description.status, "conflict");
  assert.ok(description.conflicts.some(x => x.relation === "semantic_equivalent" || x.relation === "wording_variation"));
});

test("explicit negation over shared content is a logical contradiction", () => {
  const url = "https://feature.test/";
  const html = `<html><head>
    <meta name="description" content="The service supports offline mode for mobile users.">
    <meta property="og:description" content="The service does not support offline mode for mobile users.">
  </head><body><h1>Feature</h1></body></html>`;
  const representation = analyzeRepresentation(html, url, "source_html", { finalUrl: url, observedAt: "2026-09-08T12:00:00.000Z" });
  const page: PageSignal = { ...parsePage(html, url, 200), representations: [representation], observations: representation.observations };
  const report = buildProvenanceReport([page]);
  const description = report.claims.find(x => x.predicate === "description");
  assert.ok(description);
  assert.equal(description.status, "conflict");
  assert.ok(description.conflicts.some(x => x.relation === "logical_contradiction"));
  assert.ok(description.flags.includes("logical_contradiction"));
});

test("strict text fields report factual disagreement instead of generic value conflict", () => {
  const page = provenancePage(
    `<html><head><meta property="product:availability" content="InStock"></head><body>Product</body></html>`,
    `<html><head><meta property="product:availability" content="OutOfStock"></head><body>Product</body></html>`
  );
  const report = buildProvenanceReport([page]);
  const availability = report.claims.find(x => x.predicate === "availability");
  assert.ok(availability);
  assert.equal(availability.status, "conflict");
  assert.ok(availability.conflicts.some(x => x.relation === "factual_disagreement"));
});
'''
if 'description wording differences are compatible, not contradictions' not in p:
    p += tests
write("tests/basic.test.ts", p)

# 4) Release/version metadata.
p = read("src/credits.ts")
p = p.replace('version: "1.2.0"', 'version: "1.3.0"', 1)
p = p.replace('release: "Provenance & Consistency Release"', 'release: "Semantic Conflict Intelligence Release"', 1)
write("src/credits.ts", p)

package = json.loads(read("package.json"))
package["version"] = "1.3.0"
package["description"] = "Evidence-first AI URL intelligence agent with claim-level provenance, semantic conflict classification, representation drift detection, deep crawl, entity resolution, web corroboration, SEO/security/trust audits, monitoring, RAG, MCP, API, batch workers and reports."
keywords = package.get("keywords", [])
for k in ["semantic-conflict-detection", "semantic-equivalence", "contradiction-detection"]:
    if k not in keywords:
        keywords.append(k)
package["keywords"] = keywords
write("package.json", json.dumps(package, indent=2, ensure_ascii=False) + "\n")

# 5) Hosted UI: show compatible semantic relations, not only hard conflicts.
p = read("hf-space/ui-v2.js")
p = p.replace(
    'intro.textContent = "Each important value is preserved as an observation with its source layer, representation, normalization, timestamp and hash. The resolver distinguishes consensus, compatible variation, representation drift and real conflicts.";',
    'intro.textContent = "Each important value is preserved as an observation with its source layer, representation, normalization, timestamp and hash. The resolver now separates semantic equivalence, wording variation, representation drift, factual disagreement and true logical contradiction.";',
)
p = p.replace(
    '    if (claim.status === "conflict" && obs.length) {',
    '    const relationKinds = [...new Set((claim.conflicts || []).map(x => x.relation).filter(x => !["exact_match", "normalized_match"].includes(x)))];\n    relationKinds.slice(0, 4).forEach(relation => { const pill = document.createElement("span"); pill.className = `web-source-pill ${relation === "logical_contradiction" || relation === "factual_disagreement" ? "status-bad" : relation === "wording_variation" ? "status-warn" : "verified"}`; pill.textContent = titleCaseLocal(relation); top.appendChild(pill); });\n    if ((claim.status === "conflict" || claim.status === "compatible_variation") && obs.length) {',
)
p = p.replace(
    '    const notable = claims.filter(c => c.status === "conflict" || c.status === "drift" || (c.flags || []).includes("stale_metadata_suspected"))',
    '    const notable = claims.filter(c => c.status === "conflict" || c.status === "drift" || c.status === "compatible_variation" || (c.flags || []).includes("stale_metadata_suspected"))',
)
p = p.replace(
    's.textContent = `Drift, conflict & freshness signals (${notable.length})`;',
    's.textContent = `Semantic variation, drift, conflict & freshness signals (${notable.length})`;',
)
p = p.replace(
    'ACTION_GUIDE.investigate_url.desc = "Two-stage evidence investigation. It crawls the target, creates field-level provenance observations and resolved claims, detects drift/conflicts/stale metadata, then can cross the domain boundary for public corroboration.";',
    'ACTION_GUIDE.investigate_url.desc = "Two-stage evidence investigation. It crawls the target, creates field-level provenance observations and resolved claims, distinguishes semantic equivalence/wording variation from factual or logical conflicts, detects drift/stale metadata, then can cross the domain boundary for public corroboration.";',
)
write("hf-space/ui-v2.js", p)

# 6) Hosted structured metadata and release docs.
p = read("hf-space/index.html")
p = p.replace('"softwareVersion":"1.0.0"', '"softwareVersion":"1.3.0"')
write("hf-space/index.html", p)

replacements = {
    "VERSIONING.md": [("Current application release: **1.2.0**", "Current application release: **1.3.0**")],
    "docs/REMOTE_MCP.md": [("Current application release: **1.2.0**", "Current application release: **1.3.0**")],
    "docs/API.md": [("A correct v1.2.0 deployment must report version `1.2.0`", "A correct v1.3.0 deployment must report version `1.3.0`")],
    "docs/DEPLOYMENT.md": [("This guide covers URL Intelligence Agent v1.2.0.", "This guide covers URL Intelligence Agent v1.3.0."), ("Application version: **1.2.0**", "Application version: **1.3.0**")],
    "SECURITY.md": [("Current release: **1.2.0**", "Current release: **1.3.0**")],
}
for path, pairs in replacements.items():
    text = read(path)
    for old_value, new_value in pairs:
        text = text.replace(old_value, new_value)
    write(path, text)

# README: retain v1.2 history, add focused current release section.
p = read("README.md")
marker = "Version **1.2.0** adds a new evidence layer without replacing the original URL intelligence workflow or interfaces."
release_note = '''## v1.3.0 — Semantic Conflict Intelligence

Version **1.3.0** makes conflict detection meaning-aware and substantially reduces false positives in free-text metadata. The resolver now distinguishes:

- `semantic_equivalent` — same meaning after deterministic token/anchor analysis;
- `wording_variation` — compatible copy/detail differences with no contradictory factual anchor;
- representation/temporal drift — different layers or observation times without an immediate contradiction;
- `factual_disagreement` — materially different stable facts or identity anchors;
- `logical_contradiction` — explicit opposite truth/polarity such as negation over substantially shared content.

Numeric, money, date, URL and boolean semantics remain field-aware. The hosted Evidence Inspector surfaces these relation types directly so users can tell copy variation from a real contradiction.

'''
if "## v1.3.0 — Semantic Conflict Intelligence" not in p:
    if marker in p:
        p = p.replace(marker, release_note + marker, 1)
    else:
        p = release_note + p
write("README.md", p)

# CHANGELOG new release entry.
p = read("CHANGELOG.md")
section = '''## 1.3.0 — Semantic Conflict Intelligence Release

### Conflict intelligence
- Added deterministic semantic comparison for free-text claims.
- Added `semantic_equivalent`, `wording_variation`, `factual_disagreement` and `logical_contradiction` relation handling.
- Free-text descriptions/titles no longer become hard conflicts merely because Meta, Open Graph and Twitter copy use different wording.
- Added factual-anchor checks for numbers, currencies and URLs inside prose.
- Added multilingual negation-aware contradiction detection for substantially shared statements.
- Identity/stable text fields remain strict and now report factual disagreement rather than a generic string conflict.

### Evidence Inspector
- Compatible semantic relations are now visible in claim cards, not hidden behind the final resolved value.
- Semantic variation is surfaced alongside drift, freshness and hard conflicts.

### Tests
- Added regression coverage for Meta/Open Graph/Twitter description variation, explicit logical negation, and strict availability disagreement.

'''
if "## 1.3.0 — Semantic Conflict Intelligence Release" not in p:
    first = p.find("\n## ")
    if first >= 0:
        p = p[: first + 1] + "\n" + section + p[first + 1 :]
    else:
        p += "\n\n" + section
write("CHANGELOG.md", p)

# HF Space README current release markers.
p = read("hf-space/README.md")
p = p.replace("release-v1.2.0", "release-v1.3.0")
p = p.replace("v1.2.0", "v1.3.0")
if "semantic conflict intelligence" not in p.lower():
    insert = "\n## Semantic conflict intelligence\n\nThe v1.3 resolver distinguishes semantic equivalence and wording variation from factual disagreement and explicit logical contradiction, reducing false-positive conflicts in metadata while preserving provenance and source-level evidence.\n\n"
    pos = p.find("\n## ")
    if pos >= 0:
        p = p[:pos] + insert + p[pos:]
    else:
        p += insert
write("hf-space/README.md", p)

# Deployment workflow validates and publishes the new application version.
p = read(".github/workflows/deploy-huggingface.yml")
p = p.replace("package.get('version') != '1.2.0'", "package.get('version') != '1.3.0'")
p = p.replace("if 'v1.2.0' not in readme or 'Claim Provenance' not in readme:", "if 'v1.3.0' not in readme or 'Claim Provenance' not in readme:")
p = p.replace("Hugging Face README is not synchronized with v1.2 provenance release", "Hugging Face README is not synchronized with v1.3 semantic conflict release")
p = p.replace("print('Hugging Face v1.2 payload metadata OK')", "print('Hugging Face v1.3 payload metadata OK')")
p = p.replace("Deploy URL Intelligence Agent v1.2.0 from GitHub", "Deploy URL Intelligence Agent v1.3.0 from GitHub")
p = p.replace("url-intelligence-agent-deploy-check/1.2", "url-intelligence-agent-deploy-check/1.3")
p = p.replace("attribution.get('version') != '1.2.0'", "attribution.get('version') != '1.3.0'")
p = p.replace("print('Live /health OK: v1.2.0')", "print('Live /health OK: v1.3.0')")
p = p.replace("embedded v1.2 enhancement code", "embedded v1.3 enhancement code")
p = p.replace("Live UI missing v1.2 marker", "Live UI missing v1.3 marker")
p = p.replace("Visible UI contains v1.2 Evidence Inspector and approved branding.", "Visible UI contains v1.3 Evidence Inspector and approved branding.")
write(".github/workflows/deploy-huggingface.yml", p)

print("Semantic conflict intelligence upgrade applied.")
