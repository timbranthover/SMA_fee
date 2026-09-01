import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one guarded match, found ${count}`);
  await writeFile(path, source.replace(before, after));
}

let app = await readFile("app.js", "utf8");
const primaryPattern = /function marketMicroSparkline\(trend\) \{[\s\S]*?\n\}\n\nfunction marketPrimary\(snapshot\) \{[\s\S]*?\n\}/;
if (!primaryPattern.test(app)) throw new Error("app.js: live price renderer did not match expected current shape");
const newPrimary = [
  "function marketPrimary(snapshot) {",
  "  const intraday = snapshot.intraday ? marketSparkline(snapshot.intraday) : \"\";",
  '  return `<div class="market-primary-layout"><div class="market-primary-quote"><div class="market-value-line"><span class="metric-primary">${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change ${escapeHtml(snapshot.primary.tone)}">${escapeHtml(snapshot.primary.change)}</span></div><span class="metric-secondary market-price-time">${escapeHtml(snapshot.asOf || "")}</span></div>${intraday}</div>`;',
  "}",
].join("\n");
app = app.replace(primaryPattern, newPrimary);

const oldSnapshotColumns = `const SNAPSHOT_COLUMNS = new Set(["primary", "trend", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);`;
const newSnapshotColumns = `const SNAPSHOT_COLUMNS = new Set(["primary", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);`;
if ((app.split(oldSnapshotColumns).length - 1) !== 1) throw new Error("app.js: snapshot column set did not match expected current shape");
app = app.replace(oldSnapshotColumns, newSnapshotColumns);
const trendBranch = `  if (column === "trend") return snapshot ? marketSparkline(snapshot.trend) : marketSnapshotPlaceholder();\n`;
if ((app.split(trendBranch).length - 1) !== 1) throw new Error("app.js: trend render branch did not match expected current shape");
app = app.replace(trendBranch, "");
await writeFile("app.js", app);

const oldCss = `.results-table th.result-data-column { width: 98px; }
.results-table th.col-primary { width: 126px; }
.results-table th.col-trend { width: 112px; }`;
const newCss = `.results-table th.result-data-column { width: 98px; }
.results-table th.col-primary { width: 236px; }`;
await replaceOnce("styles.css", oldCss, newCss);

const oldLiveCss = `.market-value-line { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.market-live-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
.market-live-meta .metric-secondary { flex: 0 0 auto; max-width: 61px; margin-top: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-sparkline { width: 50px; height: 16px; display: block; margin-left: auto; }
.market-live-sparkline { display: block; width: 50px; height: 16px; overflow: visible; }
.market-live-sparkline path { fill: none; stroke: var(--green); stroke-width: 1.25; vector-effect: non-scaling-stroke; }
.market-live-sparkline circle { fill: var(--green); }
.live-sparkline.negative .market-live-sparkline path { stroke: var(--red); }
.live-sparkline.negative .market-live-sparkline circle { fill: var(--red); }
.live-sparkline.neutral .market-live-sparkline path { stroke: #777; }
.live-sparkline.neutral .market-live-sparkline circle { fill: #777; }`;
const newLiveCss = `.market-value-line { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.market-primary-layout { display: flex; align-items: center; gap: 12px; min-width: 0; }
.market-primary-quote { flex: 0 0 94px; min-width: 0; }
.market-price-time { margin-top: 4px; white-space: nowrap; }
.market-primary-layout .sparkline-wrap { flex: 0 0 94px; }`;
await replaceOnce("styles.css", oldLiveCss, newLiveCss);

const staticPath = "tests/static.test.mjs";
const staticSource = await readFile(staticPath, "utf8");
const testName = `test("price column owns the full intraday sparkline while trend stays out of the table", async () => {`;
if (!staticSource.includes(testName)) {
  const addition = [
    testName,
    '  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");',
    '  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");',
    '  assert.match(app, /marketSparkline\\(snapshot\\.intraday\\)/);',
    '  assert.match(app, /market-primary-layout/);',
    '  assert.equal(app.includes(\'if (column === "trend")\'), false);',
    '  assert.match(css, /\\.results-table th\\.col-primary \\{ width: 236px; \\}/);',
    '  assert.equal(css.includes("market-live-sparkline"), false);',
    "});",
  ].join("\n");
  await writeFile(staticPath, `${staticSource.trimEnd()}\n\n${addition}\n`);
}

console.log("Applied price-column intraday polish.");
