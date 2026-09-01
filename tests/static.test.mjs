import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { BRAND_LOGOS } from "../lib/brand-logos.js";

const files = ["index.html", "app.js", "lib/catalog.js", "lib/shared-config.js", "lib/brand-logos.js", "lib/column-config.js", "lib/sort-config.js", "lib/range-config.js", "lib/decision-data.js", "lib/proposal-data.js"];

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

test("CIO Select naming and active-filter spacing stay consistent", async () => {
  const source = (await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")))).join("\n");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.equal(source.includes("SMA Select"), false);
  assert.match(source, /CIO Select/);
  assert.match(css, /\.active-chips:not\(:empty\) \{ padding-top: 8px; \}/);
});

test("removed prototype controls do not remain in the markup or event code", async () => {
  const source = `${await readFile(new URL("../index.html", import.meta.url), "utf8")}\n${await readFile(new URL("../app.js", import.meta.url), "utf8")}`;
  assert.equal(source.includes("addCriteriaButton"), false);
  assert.equal(source.includes("criteriaModal"), false);
  assert.equal(source.includes("100+ available criteria"), false);
  assert.equal(source.includes("profile-documents"), false);
  assert.equal(source.includes("documentModal"), false);
  assert.equal(source.includes("data-document-index"), false);
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
  assert.match(app, /class="profile-control-band"/);
  assert.match(app, /id="profile-changes"/);
  assert.match(css, /\.change-log \{/);
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/investment/:slug" && rule.destination === "/"));
});

test("proposal selection builds a durable client-ready workflow", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  const localServer = await readFile(new URL("../local-server.mjs", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(html, /id="proposalTray"/);
  assert.match(html, /id="proposalView" hidden/);
  assert.match(html, /id="proposalReadyModal"/);
  assert.match(app, /Add to proposal/);
  assert.match(app, /function openProposalBuilder/);
  assert.match(app, /setDecisionCandidates/);
  assert.match(css, /\.proposal-builder-layout/);
  assert.match(css, /\.proposal-tray[^}]+transform: translateX\(-50%\)/);
  assert.match(css, /@media print/);
  assert.match(build, /"proposal-data\.js"/);
  assert.match(localServer, /proposal/);
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/proposal/:id" && rule.destination === "/"));
});

test("comparison chart stays lazy, local and additive to the decision table", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  assert.match(html, /data-compare-range="1M"/);
  assert.match(html, /data-compare-range="MAX"/);
  assert.match(html, /id="compareBenchmark"/);
  assert.match(html, /id="compareTableWrap"/);
  assert.doesNotMatch(html, /lightweight-charts/);
  assert.match(app, /import\("\/vendor\/lightweight-charts\.mjs"\)/);
  assert.match(app, /\/api\/history\?ids=/);
  assert.match(app, /Rebased|normalizeComparisonPoints/);
  assert.match(css, /\.compare-chart-stage \{ height: 315px/);
  assert.match(app, /class="compare-legend-item series-color-\$\{index\}"/);
  assert.match(css, /series-color-0 \{ --series-color: #b51f35; \}/);
  assert.match(css, /series-color-1 \{ --series-color: #246a58; \}/);
  assert.match(css, /benchmark-sp500[^\n]+border-top: 2px dashed var\(--series-color\)/);
  assert.match(build, /lightweight-charts\.standalone\.production\.mjs/);
});

test("results table uses capped, vehicle-aware configurable columns", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const config = await readFile(new URL("../lib/column-config.js", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  assert.match(html, /id="columnsModal"/);
  assert.match(html, /id="resultsHeader"/);
  assert.match(app, /function renderColumnConfigurator/);
  assert.match(app, /columns: selectedColumns\(\), columnCategory: state\.appliedCategory/);
  assert.match(app, /params\.set\("columns", columns\.join\(","\)\)/);
  assert.match(config, /MAX_RESULT_COLUMNS = 5/);
  assert.match(config, /Precious Metals[^\n]+custodyFee/);
  assert.doesNotMatch(config.match(/Equities: \[[^\n]+/)[0], /custodyFee/);
  assert.match(app, /function marketSparkline/);
  assert.match(app, /\/api\/snapshots\?/);
  assert.match(app, /requestAnimationFrame\(\(\) => loadMarketSnapshots/);
  assert.match(css, /\.market-sparkline \{/);
  assert.doesNotMatch(css, /\.compact-columns/);
  assert.match(css, /\.column-config-grid/);
  assert.match(build, /"column-config\.js"/);
});

test("sorting is adaptive, column-aware and shareable", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const config = await readFile(new URL("../lib/sort-config.js", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  assert.match(html, /id="sortSelect"[^>]+aria-label="Sort results"/);
  assert.match(app, /data-sort-header/);
  assert.match(app, /sort: state\.sort/);
  assert.match(app, /params\.set\("sort", state\.sort\)/);
  assert.match(config, /yieldToWorst/);
  assert.match(config, /defaultSort/);
  assert.match(build, /"sort-config\.js"/);
});

test("numeric range filters stay compact, adaptive and shareable", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const config = await readFile(new URL("../lib/range-config.js", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../lib/catalog.js", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  assert.match(html, /id="rangeFilters"/);
  assert.doesNotMatch(html, /id="maxMinimum"|id="maxFee"/);
  assert.match(app, /function renderRangeFilters/);
  assert.match(app, /data-range-slider/);
  assert.match(app, /import\("\/vendor\/nouislider\.mjs"\)/);
  assert.doesNotMatch(app, /import noUiSlider from/);
  assert.match(app, /behaviour: "tap-drag-smooth-steps"/);
  assert.match(app, /change\.compactRange[\s\S]+runSearch\(\)/);
  assert.match(app, /function setRangeSelection[\s\S]+rangeInputValue/);
  assert.match(app, /activeRange \|\| definitions\[0\]\?\.field/);
  assert.match(app, /data-range-group\] > summary[\s\S]+data-range-group\]\[open\]/);
  assert.match(app, /document\.addEventListener\("focusout"[\s\S]+data-range-number[\s\S]+runSearch\(\)/);
  assert.match(app, /event\.key !== "Enter"[\s\S]+target\.blur\(\)/);
  assert.match(app, /serializeRanges\(state\.ranges\)/);
  assert.doesNotMatch(app, /distribution-bars|distribution-foot|rangeEstimate/);
  assert.doesNotMatch(css, /\.distribution-bars|\.distribution-foot/);
  assert.match(css, /\.range-slider\.noUi-target/);
  assert.match(css, /\.range-slider\.noUi-horizontal \.noUi-handle \{[^}]*width: 14px;[^}]*background: #fff;/);
  assert.match(css, /\.range-slider \.noUi-touch-area \{[^}]*inset: -9px;/);
  assert.match(css, /\.compact-range-values/);
  assert.match(app, /class="range-value-pair"/);
  assert.match(app, /class="range-input-sizer" data-range-input-sizer data-value=/);
  assert.match(app, /closest\("\[data-range-input-sizer\]"\)\.dataset\.value/);
  assert.match(css, /\.range-value-pair \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(css, /\.range-input-sizer::after \{[^}]*content: attr\(data-value\)/);
  assert.match(css, /\.range-bound-min \{[^}]*justify-self: start/);
  assert.match(css, /\.range-bound-max \{[^}]*justify-self: end/);
  assert.match(css, /\.range-clear/);
  assert.match(app, /aria-label="Clear \$\{escapeHtml\(definition\.label\)\} range"/);
  assert.match(app, /if \(!selected\) return "All values"/);
  assert.doesNotMatch(css, /\.dual-range-track/);
  assert.match(config, /Fixed Income[\s\S]+yieldToWorst/);
  assert.match(config, /Precious Metals[\s\S]+custody fee/i);
  assert.match(catalog, /baselineRangeFacetCache/);
  assert.match(build, /"range-config\.js"/);
  assert.match(build, /nouislider\.min\.mjs/);
  assert.match(html, /vendor\/nouislider\.css/);
});

test("compare closes from its backdrop while preserving explicit controls", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /compareModal"\)\.addEventListener\("pointerdown"/);
  assert.match(app, /event\.target === dialog && outside/);
  assert.match(html, /data-close-modal="compareModal"/);
});

test("back controls preserve a consistent arrow and label hierarchy", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /class="scenario-back"[^>]*><span class="back-arrow"/);
  assert.match(app, /const backLabel =/);
  assert.match(app, /class="profile-back"[^>]*>\$\{backLabel\("Back to/);
  assert.match(css, /\.scenario-back, \.wealth-drawer-back, \.profile-back \{[^}]*gap: 8px;/);
});

test("advisor book controls and attention cells stay compact and aligned", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /class="book-sort"><span class="sr-only">Sort households<\/span><select/);
  assert.match(css, /\.book-sort \{[^}]*display: block;/);
  assert.match(html, /<th>Goals<\/th><th>Attention<\/th>/);
  assert.doesNotMatch(html, /Decision \/ attention/);
  assert.match(app, /class="book-workflow-status"/);
  assert.doesNotMatch(app, /book-plan-pill/);
  assert.match(css, /\.book-table th, \.book-table td \{ height: 57px;/);
  assert.match(css, /\.book-table th:nth-child\(6\), \.book-table td:nth-child\(6\) \{[^}]*width: 7%;[^}]*text-align: center;/);
  assert.match(css, /\.book-table th:last-child \{[^}]*width: 29%;/);
  assert.match(css, /\.book-workflow-status \{[^}]*border-left: 1px solid/);
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

test("price column owns the full intraday sparkline while trend stays out of the table", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /marketSparkline\(snapshot\.intraday\)/);
  assert.match(app, /market-primary-layout/);
  assert.equal(app.includes('if (column === "trend")'), false);
  assert.match(css, /\.results-table th\.col-primary \{ width: 218px; \}/);
  assert.match(css, /\.results-table th:nth-child\(2\) \{ width: auto; min-width: 270px; \}/);
  assert.match(css, /\.results-table th\.result-data-column \{ width: 96px; \}/);
  assert.match(css, /\.results-table td\.result-data-column \{ padding-left: 4px; padding-right: 4px; \}/);
  assert.match(css, /\.market-primary-layout \{[^}]*gap: 8px;/);
  assert.equal(css.includes("market-live-sparkline"), false);
});
