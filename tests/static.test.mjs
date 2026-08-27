import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { BRAND_LOGOS } from "../lib/brand-logos.js";

const files = ["index.html", "app.js", "lib/catalog.js", "lib/shared-config.js", "lib/brand-logos.js"];

test("public source is masked and contains no client-context remnants", async () => {
  const source = (await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")))).join("\n");
  for (const forbidden of ["Tim Branthover", "Pollen Capital", "M59D", "Client context", "Client fit", "client eligibility", "UBS"]) {
    assert.equal(source.includes(forbidden), false, `found forbidden public string: ${forbidden}`);
  }
});

test("governed model-delivery language is current everywhere", async () => {
  const source = (await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")))).join("\n");
  assert.equal(source.includes("Model Enabled"), false);
  assert.match(source, /Model Delivered/);
});

test("removed prototype controls do not remain in the markup or event code", async () => {
  const source = `${await readFile(new URL("../index.html", import.meta.url), "utf8")}\n${await readFile(new URL("../app.js", import.meta.url), "utf8")}`;
  assert.equal(source.includes("addCriteriaButton"), false);
  assert.equal(source.includes("criteriaModal"), false);
  assert.equal(source.includes("100+ available criteria"), false);
});

test("search rendering is cancellation-safe and avoids loader flicker", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="resultsPanel"[^>]+aria-busy="false"/);
  assert.match(html, /rel="modulepreload" href="\/app\.js"/);
  assert.match(app, /setTimeout\(showLoading, 180\)/);
  assert.match(app, /140 - \(performance\.now\(\) - loadingShownAt\)/);
  assert.match(app, /setTimeout\(\(\) => runSearch\(\), 260\)/);
  assert.match(app, /state\.controller\?\.abort\(\)/);
  assert.match(app, /class="match-reason"/);
  assert.match(app, /state\.appliedCategory = data\.appliedCategory \|\| state\.category/);
  assert.match(app, /function updateHtml\(/);
  assert.doesNotMatch(app, /data\.appliedCategory[^\n]+state\.category = data\.appliedCategory/);
});

test("investment profiles support a shared canvas and standalone URLs", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(html, /class="detail-drawer"[^>]+role="dialog"/);
  assert.match(app, /href="\$\{escapeHtml\(profileHref\(item\)\)\}" data-detail-id/);
  assert.match(app, /target="_blank" rel="noopener"/);
  assert.match(app, /window\.addEventListener\("popstate"/);
  assert.match(app, /setTimeout\(\(\) => fetchDetail[^\n]+160\)/);
  assert.match(css, /width: min\(1120px, calc\(100vw - 250px\)\)/);
  assert.match(css, /\.profile-actions \.secondary-button \{ color: #111; \}/);
  assert.match(app, /<th>Excess<\/th>/);
  assert.match(app, /profile-data-table paired-facts/);
  assert.match(css, /\.profile-data-table \{/);
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/investment/:slug" && rule.destination === "/"));
});

test("every allowlisted brand mark is local, unique and present", async () => {
  const logos = Object.values(BRAND_LOGOS);
  assert.equal(logos.length, 18);
  assert.equal(new Set(logos.map((logo) => logo.src)).size, logos.length);
  for (const logo of logos) {
    assert.match(logo.src, /^\/assets\/brands\/[a-z0-9-]+\.(?:svg|png)$/);
    const asset = await stat(new URL(`..${logo.src}`, import.meta.url));
    assert.ok(asset.size > 100, `brand asset is unexpectedly empty: ${logo.src}`);
  }
});
