import test from "node:test";
import assert from "node:assert/strict";
import { PROJECT, creditsLine } from "../src/credits.js";
import { parsePage, classifyImportant } from "../src/extract.js";

test("credits are embedded",()=>{
  assert.match(creditsLine(),/Vincenzo Picciuolo/);
  assert.equal(PROJECT.website,"https://horno.net");
});

test("parses metadata and social links",()=>{
  const html=`<html><head><title>Acme | Home</title><meta name="description" content="Build better"><link rel="canonical" href="https://acme.test/"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Acme</h1><a href="https://x.com/acme">X</a><a href="/about">About</a><a href="mailto:hi@acme.test">Mail</a></body></html>`;
  const page=parsePage(html,"https://acme.test/",200);
  assert.equal(page.title,"Acme | Home");
  assert.ok(page.socials.includes("https://x.com/acme"));
  assert.ok(page.emails.includes("hi@acme.test"));
  assert.ok(page.jsonLdTypes.includes("Organization"));
});

test("classifies important pages",()=>{
  assert.equal(classifyImportant("https://a.test/pricing"),"pricing");
  assert.equal(classifyImportant("https://a.test/about-us"),"about");
});
