import { readFile, writeFile } from "node:fs/promises";

async function patch(path, replacements) {
  let source = await readFile(path, "utf8");
  for (const [from, to] of replacements) {
    const count = source.split(from).length - 1;
    if (count !== 1) throw new Error(`${path}: expected exactly one match, found ${count}`);
    source = source.replace(from, to);
  }
  await writeFile(path, source);
}

await patch("lib/market-data.js", [
  [
    'function symbolKey(symbol) { return String(symbol || "").trim().toUpperCase(); }',
    'function symbolKey(symbol) { return String(symbol || "").trim().toUpperCase(); }\nfunction saneOneYearReturn(value) {\n  const number = finite(value);\n  return number !== null && number >= -99.9 && number <= 500 ? number : null;\n}'
  ],
  [
    '  if (field === "perf1") return finite(row.fiftyTwoWeekChangePercent);',
    '  if (field === "perf1") return saneOneYearReturn(row.fiftyTwoWeekChangePercent);'
  ],
  [
    '      perf1: finite(returns.perf1),',
    '      perf1: saneOneYearReturn(row.fiftyTwoWeekChangePercent) ?? saneOneYearReturn(returns.perf1),'
  ]
]);

await patch("api/search.js", [[
  '    liveSortUniverseCache.set(category, getSearchIndex(category).filter((item) => item?.symbol && !String(item.id).startsWith("syn-")));',
  '    liveSortUniverseCache.set(category, getSearchIndex(category).filter((item) => item?.symbol && !String(item.id).startsWith("syn-") && (category !== "Equities" || item.assetClass !== "OTC Equity")));'
]]);

console.log("Applied demo-safe live 1Y sorting hotfix");