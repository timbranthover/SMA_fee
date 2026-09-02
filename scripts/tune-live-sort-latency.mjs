import { readFile, writeFile } from "node:fs/promises";

async function patch(path, replacements) {
  let source = await readFile(path, "utf8");
  for (const [from, to] of replacements) {
    const count = source.split(from).length - 1;
    if (count !== 1) throw new Error(`${path}: expected one match, found ${count}`);
    source = source.replace(from, to);
  }
  await writeFile(path, source);
}

await patch("lib/market-data.js", [[
  "const GLOBAL_SORT_BATCH_SIZE = 200;\nconst GLOBAL_SORT_CONCURRENCY = 8;",
  "const GLOBAL_SORT_BATCH_SIZE = 750;\nconst GLOBAL_SORT_CONCURRENCY = 8;"
]]);

await patch("api/search.js", [
  [
    "      let liveSortValues = null;\n      let liveSortUsed = false;",
    "      let liveSortValues = null;\n      let liveSortUsed = false;\n      let liveSortMs = 0;"
  ],
  [
    "        const universe = liveSortUniverse(input.category);\n        const values = await getLiveGlobalSortValues(universe, input.category, parsedSort.field);",
    "        const universe = liveSortUniverse(input.category);\n        const liveSortStarted = performance.now();\n        const values = await getLiveGlobalSortValues(universe, input.category, parsedSort.field);\n        liveSortMs = Math.max(1, Math.round(performance.now() - liveSortStarted));"
  ],
  [
    '          "Server-Timing": `search;dur=${result.tookMs}`,',
    '          "Server-Timing": liveSortUsed ? `search;dur=${result.tookMs}, market-sort;dur=${liveSortMs}` : `search;dur=${result.tookMs}`,'
  ]
]);

await patch("app.js", [
  [
`function buildSearchUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  params.set("sort", state.sort);
  params.set("cursor", String(state.cursor));
  params.set("pageSize", "25");
  return `/api/search?${params}`;
}
`,
`function buildSearchUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  params.set("sort", state.sort);
  params.set("cursor", String(state.cursor));
  params.set("pageSize", "25");
  return `/api/search?${params}`;
}

const liveSortPrewarmUrls = new Set();
function prewarmPreferredLiveSort() {
  if (!["Equities", "ETFs"].includes(state.appliedCategory) || state.sort === "perf1-desc") return;
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  params.set("category", state.appliedCategory);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  params.set("sort", "perf1-desc");
  params.set("cursor", "0");
  params.set("pageSize", "25");
  const url = `/api/search?${params}`;
  if (liveSortPrewarmUrls.has(url)) return;
  liveSortPrewarmUrls.add(url);
  const warm = () => fetch(url).catch(() => liveSortPrewarmUrls.delete(url));
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(warm, { timeout: 1200 });
    else warm();
  }, 600);
}
`
  ],
  [
    "    window.requestAnimationFrame(() => loadMarketSnapshots(state.items));",
    "    window.requestAnimationFrame(() => loadMarketSnapshots(state.items));\n    prewarmPreferredLiveSort();"
  ]
]);

console.log("Tuned live sort batching and prewarm");
