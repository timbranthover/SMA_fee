import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) { fs.writeFileSync(file, content); }
function replaceOnce(file, before, after) {
  const source = read(file);
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one literal match, found ${count}`);
  write(file, source.replace(before, after));
}
function replaceRegex(file, regex, after) {
  const source = read(file);
  const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) throw new Error(`${file}: expected exactly one regex match, found ${matches.length}`);
  write(file, source.replace(regex, after));
}
function appendOnce(file, marker, addition) {
  const source = read(file);
  if (source.includes(marker)) return;
  write(file, `${source.trimEnd()}\n\n${addition.trim()}\n`);
}

// Keep the row timestamp provider-free while preserving provider attribution in detail.
replaceOnce(
  "lib/market-data.js",
  `function prune(cache) {`,
  `function rowTimeText(seconds, timezone = "America/New_York") {
  if (!Number.isFinite(Number(seconds))) return "Live";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone, timeZoneName: "short" }).format(new Date(Number(seconds) * 1000));
  } catch {
    return new Date(Number(seconds) * 1000).toISOString();
  }
}
function prune(cache) {`
);
replaceRegex(
  "lib/market-data.js",
  /export function applyQuoteToSnapshot\(snapshot, quote\) \{[\s\S]*?\n\}\n\nexport function applyQuoteToDetail/,
  `export function applyQuoteToSnapshot(snapshot, quote) {
  if (!snapshot || !quote || quote.price === null) return snapshot;
  const change = signedPercent(quote.changePercent);
  const points = quote.points.map((point) => point.value);
  const tone = quote.changePercent === null ? "neutral" : quote.changePercent >= 0 ? "positive" : "negative";
  return {
    ...snapshot,
    primary: {
      ...snapshot.primary,
      label: "Market price",
      value: priceText(quote.price, quote.currency),
      change: change || snapshot.primary?.change,
      tone,
    },
    trend: snapshot.trend,
    intraday: points.length >= 2 ? { label: "Today", value: change || "—", points, tone } : snapshot.intraday || null,
    asOf: rowTimeText(quote.asOf, quote.timezone),
  };
}

export function applyQuoteToDetail`
);

// Add semantically correct size fields to equity and ETF result-column configuration.
replaceOnce(
  "lib/column-config.js",
  `  assetClass: { label: "Asset class", group: "Research" },\n  forwardPE: { label: "Forward P/E", group: "Valuation" },`,
  `  assetClass: { label: "Asset class", group: "Research" },\n  marketCap: { label: "Market cap", group: "Size" },\n  aum: { label: "AUM", group: "Size" },\n  forwardPE: { label: "Forward P/E", group: "Valuation" },`
);
replaceOnce(
  "lib/column-config.js",
  `  Equities: ["primary", "trend", "forwardPE", "dividendYield", "perf1", "perf3", "risk", "assetClass", "liquidity"],`,
  `  Equities: ["primary", "trend", "marketCap", "forwardPE", "dividendYield", "perf1", "perf3", "risk", "assetClass", "liquidity"],`
);
replaceOnce(
  "lib/column-config.js",
  `  ETFs: ["primary", "trend", "secYield", "expenseRatio", "perf1", "perf3", "risk", "assetClass", "liquidity"],`,
  `  ETFs: ["primary", "trend", "aum", "secYield", "expenseRatio", "perf1", "perf3", "risk", "assetClass", "liquidity"],`
);
replaceOnce(
  "lib/column-config.js",
  `  Equities: ["primary", "trend", "forwardPE", "dividendYield"],`,
  `  Equities: ["primary", "trend", "marketCap", "forwardPE", "dividendYield"],`
);
replaceOnce(
  "lib/column-config.js",
  `  ETFs: ["primary", "trend", "secYield", "expenseRatio"],`,
  `  ETFs: ["primary", "trend", "aum", "secYield", "expenseRatio"],`
);
replaceOnce(
  "lib/column-config.js",
  `  Equities: { Research: defaults.Equities, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Income: ["primary", "trend", "dividendYield", "perf1", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "perf3"] },`,
  `  Equities: { Research: defaults.Equities, Performance: ["primary", "trend", "marketCap", "perf1", "perf3"], Income: ["primary", "trend", "marketCap", "dividendYield", "perf1"], Risk: ["primary", "trend", "marketCap", "risk", "assetClass"] },`
);
replaceOnce(
  "lib/column-config.js",
  `  ETFs: { Research: defaults.ETFs, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Income: ["primary", "trend", "secYield", "expenseRatio", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "expenseRatio", "liquidity", "risk"] },`,
  `  ETFs: { Research: defaults.ETFs, Performance: ["primary", "trend", "aum", "perf1", "perf3"], Income: ["primary", "trend", "aum", "secYield", "expenseRatio"], Risk: ["primary", "trend", "aum", "risk", "assetClass"], "Cost & implementation": ["primary", "aum", "expenseRatio", "liquidity", "risk"] },`
);

replaceOnce(
  "lib/sort-config.js",
  `  Equities: Object.freeze({\n    primary: definition("primary", "Price"),\n    trend: definition("trend", "1Y return"),`,
  `  Equities: Object.freeze({\n    primary: definition("primary", "Price"),\n    trend: definition("trend", "1Y return"),\n    marketCap: definition("marketCap", "Market cap"),`
);
replaceOnce(
  "lib/sort-config.js",
  `  ETFs: Object.freeze({\n    primary: definition("primary", "Price"),\n    trend: definition("trend", "1Y return"),`,
  `  ETFs: Object.freeze({\n    primary: definition("primary", "Price"),\n    trend: definition("trend", "1Y return"),\n    aum: definition("aum", "AUM"),`
);

// Give the real equity/ETF identities sensible, sortable size metadata while keeping the existing aum string contract.
const marketSizeBlock = `const EQUITY_MARKET_SIZE_OVERRIDES = new Map([
  ["NVDA", 5_200_000_000_000], ["AAPL", 4_600_000_000_000], ["MSFT", 3_900_000_000_000],
  ["GOOGL", 3_200_000_000_000], ["GOOG", 3_200_000_000_000], ["AMZN", 2_600_000_000_000],
  ["META", 2_000_000_000_000], ["AVGO", 1_700_000_000_000], ["TSLA", 1_450_000_000_000],
  ["TSM", 1_300_000_000_000], ["BRK.B", 1_150_000_000_000], ["BRK.A", 1_150_000_000_000],
  ["JPM", 940_000_000_000], ["WMT", 900_000_000_000], ["ORCL", 850_000_000_000],
  ["LLY", 800_000_000_000], ["V", 720_000_000_000], ["XOM", 600_000_000_000],
  ["MA", 550_000_000_000], ["NFLX", 520_000_000_000], ["COST", 470_000_000_000],
  ["JNJ", 420_000_000_000], ["PLTR", 410_000_000_000], ["HD", 400_000_000_000],
  ["ABBV", 390_000_000_000], ["BAC", 360_000_000_000], ["PG", 360_000_000_000],
  ["AMD", 350_000_000_000], ["KO", 330_000_000_000], ["GE", 320_000_000_000],
]);

const ETF_AUM_OVERRIDES = new Map([
  ["SPY", 800_000_000_000], ["VOO", 780_000_000_000], ["IVV", 715_000_000_000], ["VTI", 550_000_000_000],
  ["QQQ", 450_000_000_000], ["VEA", 150_000_000_000], ["VTV", 145_000_000_000], ["BND", 140_000_000_000],
  ["AGG", 125_000_000_000], ["GLD", 125_000_000_000], ["VUG", 120_000_000_000], ["VXUS", 110_000_000_000],
  ["VIG", 110_000_000_000], ["IEMG", 100_000_000_000], ["IJR", 100_000_000_000], ["VWO", 95_000_000_000],
  ["VGT", 90_000_000_000], ["IWM", 85_000_000_000], ["VO", 85_000_000_000], ["XLK", 85_000_000_000],
  ["SPLG", 80_000_000_000], ["EFA", 75_000_000_000], ["SCHD", 76_000_000_000], ["ITOT", 70_000_000_000],
  ["VB", 70_000_000_000], ["VYM", 65_000_000_000], ["QQQM", 60_000_000_000], ["SCHX", 60_000_000_000],
  ["IAU", 55_000_000_000], ["SGOV", 55_000_000_000], ["TLT", 55_000_000_000], ["MUB", 46_000_000_000],
  ["JEPI", 45_000_000_000], ["BIL", 45_000_000_000], ["LQD", 45_000_000_000], ["DGRO", 45_000_000_000],
  ["HYG", 35_000_000_000],
]);

function compactMarketSize(value, suffix = "") {
  if (!Number.isFinite(value) || value < 0) return "—";
  const format = (number, unit) => \`$\${number.toFixed(number >= 100 ? 0 : number >= 10 ? 1 : 2).replace(/\\.0+$|(?<=\\.[0-9])0$/g, "")}\${unit}\${suffix}\`;
  if (value >= 1_000_000_000_000) return format(value / 1_000_000_000_000, "T");
  if (value >= 1_000_000_000) return format(value / 1_000_000_000, "B");
  if (value >= 1_000_000) return format(value / 1_000_000, "M");
  return format(value / 1_000, "K");
}

function marketSizeLabel(category, symbol, seed) {
  if (category === "Equities") {
    const dollars = EQUITY_MARKET_SIZE_OVERRIDES.get(symbol) ?? (50_000_000 + (seed % 179_950) * 1_000_000);
    return compactMarketSize(dollars, " market cap");
  }
  if (category === "ETFs") {
    const dollars = ETF_AUM_OVERRIDES.get(symbol) ?? (25_000_000 + (seed % 24_975) * 1_000_000);
    return compactMarketSize(dollars);
  }
  return \`$\${money.format(50 + (seed % 9900))}M\`;
}

function marketSizeNumber(value) {
  const match = String(value || "").replace(/,/g, "").match(/\\$?([0-9]+(?:\\.[0-9]+)?)\\s*([TBMK])?/i);
  if (!match) return null;
  const multiplier = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[String(match[2] || "").toUpperCase()] || 1;
  return Number(match[1]) * multiplier;
}

`;
replaceOnce("lib/catalog.js", `function makeSynthetic(category, index) {`, `${marketSizeBlock}function makeSynthetic(category, index) {`);
replaceRegex(
  "lib/catalog.js",
  /^    aum: category === "Equities" \? .*$/m,
  `    aum: marketSizeLabel(category, symbol, seed),`
);
replaceOnce(
  "lib/catalog.js",
  `    researchStatus: { label: researchStatus.label, tone: researchStatus.tone },\n  };\n  return match?.matchReason ? { ...result, matchReason: match.matchReason, matchMode: match.matchMode } : result;`,
  `    researchStatus: { label: researchStatus.label, tone: researchStatus.tone },\n  };\n  if (["Equities", "ETFs"].includes(item.category)) result.aum = item.aum;\n  return match?.matchReason ? { ...result, matchReason: match.matchReason, matchMode: match.matchMode } : result;`
);
replaceOnce(
  "lib/catalog.js",
  `  if (field === "minimum") return item.minimum;`,
  `  if (field === "minimum") return item.minimum;\n  if (field === "marketCap") return item.category === "Equities" ? marketSizeNumber(item.aum) : null;\n  if (field === "aum") return item.category === "ETFs" ? marketSizeNumber(item.aum) : null;`
);

// Render the intraday micro-chart in Price and leave 1Y Trend bound to the 1Y series.
replaceRegex(
  "app.js",
  /function marketPrimary\(snapshot\) \{[\s\S]*?\n\}\n\nfunction marketSparkline/,
  `function marketMicroSparkline(trend) {
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
  const line = points.map(([x, y], index) => \`\${index ? "L" : "M"}\${x} \${y}\`).join(" ");
  const [endX, endY] = points.at(-1);
  return \`<span class="live-sparkline \${escapeHtml(trend.tone || "neutral")}" title="\${escapeHtml(\`Today: \${trend.value || "—"}\`)}"><svg class="market-live-sparkline" viewBox="0 0 50 16" preserveAspectRatio="none" role="img" aria-label="\${escapeHtml(\`Today \${trend.value || ""}\`)}"><path d="\${line}"></path><circle cx="\${endX}" cy="\${endY}" r="1.5"></circle></svg></span>\`;
}

function marketPrimary(snapshot) {
  return \`<div class="market-value-line"><span class="metric-primary">\${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change \${escapeHtml(snapshot.primary.tone)}">\${escapeHtml(snapshot.primary.change)}</span></div><div class="market-live-meta"><span class="metric-secondary">\${escapeHtml(snapshot.asOf || "")}</span>\${marketMicroSparkline(snapshot.intraday)}</div>\`;
}

function marketSparkline`
);
replaceOnce(
  "app.js",
  `  if (SNAPSHOT_COLUMNS.has(column)) return snapshot ? marketMetric(snapshotMetric(snapshot, column) || { value: "—", label: columnLabel(item.category, column) }) : marketSnapshotPlaceholder();\n  if (column === "minimum") return marketMetric({ value: formatMinimum(item.minimum), label: "Opening" });`,
  `  if (SNAPSHOT_COLUMNS.has(column)) return snapshot ? marketMetric(snapshotMetric(snapshot, column) || { value: "—", label: columnLabel(item.category, column) }) : marketSnapshotPlaceholder();\n  if (column === "marketCap") return marketMetric({ value: String(item.aum || "—").replace(/\\s+market cap$/i, ""), label: "Market cap" });\n  if (column === "aum") return marketMetric({ value: item.aum || "—", label: "Fund assets" });\n  if (column === "minimum") return marketMetric({ value: formatMinimum(item.minimum), label: "Opening" });`
);

replaceOnce(
  "styles.css",
  `.market-value-line { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }\n.market-primary .metric-secondary { max-width: 122px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
  `.market-value-line { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }\n.market-live-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; }\n.market-live-meta .metric-secondary { flex: 0 0 auto; max-width: 61px; margin-top: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.live-sparkline { width: 50px; height: 16px; display: block; margin-left: auto; }\n.market-live-sparkline { display: block; width: 50px; height: 16px; overflow: visible; }\n.market-live-sparkline path { fill: none; stroke: var(--green); stroke-width: 1.25; vector-effect: non-scaling-stroke; }\n.market-live-sparkline circle { fill: var(--green); }\n.live-sparkline.negative .market-live-sparkline path { stroke: var(--red); }\n.live-sparkline.negative .market-live-sparkline circle { fill: var(--red); }\n.live-sparkline.neutral .market-live-sparkline path { stroke: #777; }\n.live-sparkline.neutral .market-live-sparkline circle { fill: #777; }`
);

// Regression coverage for the split between live intraday data and 1Y trend.
replaceOnce(
  "tests/market-data.test.mjs",
  `  assert.equal(snapshot.primary.change, "+2.88%");\n  assert.deepEqual(snapshot.trend.points, [120, 123.45]);\n  assert.match(snapshot.asOf, /Yahoo Finance/);`,
  `  assert.equal(snapshot.primary.change, "+2.88%");\n  assert.deepEqual(snapshot.trend.points, [1, 2]);\n  assert.equal(snapshot.trend.label, "1Y");\n  assert.deepEqual(snapshot.intraday.points, [120, 123.45]);\n  assert.equal(snapshot.intraday.label, "Today");\n  assert.doesNotMatch(snapshot.asOf, /Yahoo Finance/);\n  assert.match(snapshot.asOf, /(?:AM|PM)/);`
);
appendOnce(
  "tests/columns.test.mjs",
  `market size columns are first-class`,
  `test("market size columns are first-class for equities and ETFs", () => {
  assert.ok(CATEGORY_DEFAULT_COLUMNS.Equities.includes("marketCap"));
  assert.ok(CATEGORY_DEFAULT_COLUMNS.ETFs.includes("aum"));
  assert.ok(sortOptions("Equities", ["marketCap"], false).some(({ value }) => value === "marketCap-desc"));
  assert.ok(sortOptions("ETFs", ["aum"], false).some(({ value }) => value === "aum-desc"));
  assert.equal(headerSort("Equities", "marketCap", "name-asc").nextSort, "marketCap-desc");
  assert.equal(headerSort("ETFs", "aum", "name-asc").nextSort, "aum-desc");
});`
);
appendOnce(
  "tests/search.test.mjs",
  `size sorting is global and semantically correct`,
  `test("size sorting is global and semantically correct for equities and ETFs", () => {
  const equities = searchCatalog({ category: "Equities", sort: "marketCap-desc" });
  const etfs = searchCatalog({ category: "ETFs", sort: "aum-desc" });
  assert.ok(equities.items.every((item) => /market cap$/i.test(item.aum)));
  assert.ok(etfs.items.every((item) => /^\\$/.test(item.aum)));
  assert.ok(equities.items.slice(0, 10).some((item) => ["NVDA", "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN"].includes(item.symbol)));
  assert.ok(etfs.items.slice(0, 10).some((item) => ["SPY", "VOO", "IVV", "VTI", "QQQ"].includes(item.symbol)));
  const numberFromSize = (value) => {
    const match = value.replace(/,/g, "").match(/\\$([0-9.]+)([TBMK])/i);
    const multiplier = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[match[2].toUpperCase()];
    return Number(match[1]) * multiplier;
  };
  assert.ok(equities.items.every((item, index, rows) => index === 0 || numberFromSize(rows[index - 1].aum) >= numberFromSize(item.aum)));
  assert.ok(etfs.items.every((item, index, rows) => index === 0 || numberFromSize(rows[index - 1].aum) >= numberFromSize(item.aum)));
});`
);

console.log("Applied live-row, 1Y-trend and market-size upgrade.");
