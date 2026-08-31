import test from "node:test";
import assert from "node:assert/strict";
import { PROJECT, creditsLine } from "../src/credits.js";
import { parsePage, classifyImportant, pagePriority } from "../src/extract.js";
import { detectTechnologies, extractBrand } from "../src/analyzers.js";
import { discoverApiSurfaces, extractCommerceSignals, structuredDataInventory } from "../src/extensions.js";
import { diffSnapshots } from "../src/monitor.js";
import type { Snapshot } from "../src/types.js";

test("credits are embedded in the unified release", () => {
  assert.match(creditsLine(), /Vincenzo Picciuolo/);
  assert.match(creditsLine(), /horno\.net/);
  assert.equal(PROJECT.version, "1.0.0");
  assert.equal(PROJECT.website, "https://horno.net");
});

test("parses metadata, JSON-LD, social links and contacts", () => {
  const html = `<html lang="en"><head><title>Acme | Home</title><meta name="description" content="Build better"><meta property="og:site_name" content="Acme"><meta name="theme-color" content="#112233"><link rel="canonical" href="https://acme.test/"><script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script></head><body><h1>Acme</h1><a href="https://twitter.com/acme">X</a><a href="/about">About</a><a href="mailto:hi@acme.test">Mail</a><a href="tel:+971555555555">Call</a><script src="https://js.stripe.com/v3/"></script></body></html>`;
  const page = parsePage(html, "https://acme.test/", 200);
  assert.equal(page.title, "Acme | Home");
  assert.ok(page.socials.includes("https://x.com/acme"));
  assert.ok(page.emails.includes("hi@acme.test"));
  assert.ok(page.phones.includes("+971555555555"));
  assert.ok(page.jsonLdTypes.includes("Organization"));
  assert.equal(page.language, "en");
});

test("classifies and prioritizes important pages", () => {
  assert.equal(classifyImportant("https://a.test/pricing"), "pricing");
  assert.equal(classifyImportant("https://a.test/about-us"), "about");
  assert.ok(pagePriority("https://a.test/about") > pagePriority("https://a.test/random/deep/page"));
});

test("detects technology and brand signals deterministically", () => {
  const page = parsePage(`<html><head><meta name="theme-color" content="#112233"></head><body><img src="/logo.png"><script src="https://js.stripe.com/v3/"></script><script src="/_next/static/app.js"></script></body></html>`, "https://acme.test/", 200);
  const technologies = detectTechnologies([page]).map(x => x.name);
  assert.ok(technologies.includes("Stripe"));
  assert.ok(technologies.includes("Next.js"));
  const brand = extractBrand([page]);
  assert.ok(brand.colors.includes("#112233"));
  assert.ok(brand.logos.some(x => x.endsWith("/logo.png")));
});

test("discovers structured data, API surfaces and commerce hints", () => {
  const page = parsePage(`<html><head><script type="application/ld+json">{"@type":"Product","name":"Pro"}</script></head><body><a href="/docs/openapi.json">API</a><p>Plans from $29 per month. Start subscription.</p></body></html>`, "https://acme.test/", 200);
  assert.equal(structuredDataInventory([page]).length, 1);
  assert.ok(discoverApiSurfaces([page]).some(x => x.kind === "openapi"));
  assert.ok(extractCommerceSignals([page]).prices.includes("$29"));
});

test("snapshot diff is explicit and field based", () => {
  const base: Snapshot = { meta: {}, url: "https://a.test/", entityName: "A", fingerprint: "1", contentFingerprint: "c1", seoScore: 90, trustScore: 80, technologies: ["A"], socials: [], contacts: [], importantPages: {}, observedAt: "2026-01-01T00:00:00Z" };
  const current: Snapshot = { ...base, fingerprint: "2", contentFingerprint: "c2", seoScore: 95, technologies: ["A", "B"], observedAt: "2026-01-02T00:00:00Z" };
  const diff = diffSnapshots(base, current);
  assert.equal(diff.changed, true);
  assert.ok(diff.changes.some(x => x.field === "contentFingerprint"));
  assert.ok(diff.changes.some(x => x.field === "technologies"));
});
