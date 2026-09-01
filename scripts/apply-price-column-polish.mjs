import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one guarded match, found ${count}`);
  await writeFile(path, source.replace(before, after));
}

const oldAppBlock = `function marketMicroSparkline(trend) {
  const values = (trend?.points || []).filter((value) => Number.isFinite(Number(value))).map(Number);
  if (values.length < 2) return "";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const points = values.map((value, index) => {
    const x = index * (50 / (values.length - 1));
    const y = 2 + (maximum - value) * (12 / spread);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });
  const line = points.map(([x, y], index) => \`${index ? "L" : "M"}\${x} \${y}\`).join(" ");
  const [endX, endY] = points.at(-1);
  return \`<span class="live-sparkline \${escapeHtml(trend.tone || "neutral")}" title="\${escapeHtml(\`Today: \${trend.value || "—"}\`)}"><svg class="market-live-sparkline" viewBox="0 0 50 16" preserveAspectRatio="none" role="img" aria-label="\${escapeHtml(\`Today \${trend.value || ""}\`)}"><path d="\${line}"></path><circle cx="\${endX}" cy="\${endY}" r="1.5"></circle></svg></span>\`;
}

function marketPrimary(snapshot) {
  return \`<div class="market-value-line"><span class="metric-primary">\${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change \${escapeHtml(snapshot.primary.tone)}">\${escapeHtml(snapshot.primary.change)}</span></div><div class="market-live-meta"><span class="metric-secondary">\${escapeHtml(snapshot.asOf || "")}</span>\${marketMicroSparkline(snapshot.intraday)}</div>\`;
}`;

const newAppBlock = `function marketPrimary(snapshot) {
  const intraday = snapshot.intraday ? marketSparkline(snapshot.intraday) : "";
  return \`<div class="market-primary-layout"><div class="market-primary-quote"><div class="market-value-line"><span class="metric-primary">\${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change \${escapeHtml(snapshot.primary.tone)}">\${escapeHtml(snapshot.primary.change)}</span></div><span class="metric-secondary market-price-time">\${escapeHtml(snapshot.asOf || "")}</span></div>\${intraday}</div>\`;
}`;

await replaceOnce("app.js", oldAppBlock, newAppBlock);
await replaceOnce(
  "app.js",
  `const SNAPSHOT_COLUMNS = new Set(["primary", "trend", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);`,
  `const SNAPSHOT_COLUMNS = new Set(["primary", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);`,
);
await replaceOnce(
  "app.js",
  `  if (column === "trend") return snapshot ? marketSparkline(snapshot.trend) : marketSnapshotPlaceholder();\n`,
  "",
);

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
  await writeFile(staticPath, `${staticSource.trimEnd()}\n\n${testName}\n  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");\n  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");\n  assert.match(app, /marketSparkline\\(snapshot\\.intraday\\)/);\n  assert.match(app, /market-primary-layout/);\n  assert.equal(app.includes('if (column === "trend")'), false);\n  assert.match(css, /\\.results-table th\\.col-primary \\{ width: 236px; \\}/);\n  assert.equal(css.includes("market-live-sparkline"), false);\n});\n`);
}

console.log("Applied price-column intraday polish.");
