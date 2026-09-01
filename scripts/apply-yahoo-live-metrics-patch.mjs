import fs from "node:fs";

const appPath = "app.js";
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  '  if (column === "marketCap") return marketMetric({ value: String(item.aum || "—").replace(/\\s+market cap$/i, ""), label: "Market cap" });\n  if (column === "aum") return marketMetric({ value: item.aum || "—", label: "Fund assets" });',
  '  if (column === "marketCap") return marketMetric(snapshotMetric(snapshot, "marketCap") || { value: String(item.aum || "—").replace(/\\s+market cap$/i, ""), label: "Market cap" });\n  if (column === "aum") return marketMetric(snapshotMetric(snapshot, "aum") || { value: item.aum || "—", label: "Fund assets" });',
  "market cap and AUM live rendering",
);

replaceOnce(
  '  if (column === "perf1") return marketMetric({ value: formatReturn(item.perf1), label: "Annualized" });\n  if (column === "perf3") return marketMetric({ value: formatReturn(item.perf3), label: "Annualized" });',
  '  if (column === "perf1") return marketMetric(snapshotMetric(snapshot, "perf1") || { value: formatReturn(item.perf1), label: "Annualized" });\n  if (column === "perf3") return marketMetric(snapshotMetric(snapshot, "perf3") || { value: formatReturn(item.perf3), label: "Annualized" });',
  "1Y and 3Y live rendering",
);

replaceOnce(
  '    state.items = state.items.map((item) => ({ ...item, marketSnapshot: state.snapshotCache.get(item.id) }));\n    renderResults();',
  '    state.items = state.items.map((item) => ({ ...item, marketSnapshot: state.snapshotCache.get(item.id) }));\n    for (const item of state.items) {\n      if (state.compare.has(item.id)) state.compare.set(item.id, item);\n    }\n    renderResults();',
  "compare cache hydration",
);

replaceOnce(
  '["1-year return", (item) => formatReturn(item.perf1)]',
  '["1-year return", (item) => formatReturn(item.marketSnapshot?.live?.perf1 ?? item.perf1)]',
  "compare 1Y return",
);

replaceOnce(
  '["3-year return", (item) => formatReturn(item.perf3)]',
  '["3-year return", (item) => formatReturn(item.marketSnapshot?.live?.perf3 ?? item.perf3)]',
  "compare 3Y return",
);

fs.writeFileSync(appPath, source);
fs.rmSync("scripts/apply-yahoo-live-metrics-patch.mjs", { force: true });
fs.rmSync(".github/workflows/apply-yahoo-live-metrics.yml", { force: true });
