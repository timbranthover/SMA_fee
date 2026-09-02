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
    'const AUTH_TTL_MS = 30 * 60_000;\nconst MAX_CACHE_ENTRIES = 600;',
    'const AUTH_TTL_MS = 30 * 60_000;\nconst GLOBAL_SORT_TTL_MS = 2 * 60_000;\nconst GLOBAL_SORT_BATCH_SIZE = 200;\nconst GLOBAL_SORT_CONCURRENCY = 8;\nconst MAX_CACHE_ENTRIES = 600;'
  ],
  [
    'const returnCache = new Map();\nlet yahooAuth = null;',
    'const returnCache = new Map();\nconst globalQuoteIndexCache = new Map();\nconst globalQuoteIndexPending = new Map();\nlet yahooAuth = null;'
  ],
  [
`function quoteFromChart(symbol, chart) {`,
`const LIVE_GLOBAL_SORT_FIELDS = Object.freeze({
  Equities: new Set(["primary", "marketCap", "forwardPE", "dividendYield", "perf1"]),
  ETFs: new Set(["primary", "aum", "expenseRatio", "perf1"]),
});

export function isLiveGlobalSortField(category, field) {
  return Boolean(LIVE_GLOBAL_SORT_FIELDS[category]?.has(field));
}

function globalSortValue(row, category, field) {
  if (!row || !isLiveGlobalSortField(category, field)) return null;
  if (field === "primary") return finite(row.regularMarketPrice);
  if (field === "perf1") return finite(row.fiftyTwoWeekChangePercent);
  if (category === "Equities") {
    if (field === "marketCap") return finite(row.marketCap);
    if (field === "forwardPE") return finite(row.forwardPE);
    if (field === "dividendYield") return finite(row.dividendYield);
  }
  if (category === "ETFs") {
    if (field === "aum") return finite(row.netAssets);
    if (field === "expenseRatio") return finite(row.netExpenseRatio);
  }
  return null;
}

async function getGlobalQuoteIndex(items, category, options = {}) {
  const eligible = (items || []).filter((item) => item?.symbol);
  if (!eligible.length) return new Map();
  const fetchImpl = options.fetchImpl;
  const cacheable = !fetchImpl || fetchImpl === globalThis.fetch;
  const cacheKey = [category, eligible.length, eligible[0]?.id || "", eligible.at(-1)?.id || ""].join(":");
  const cachedEntry = cacheable ? globalQuoteIndexCache.get(cacheKey) : null;
  if (cachedEntry && now() - cachedEntry.at < GLOBAL_SORT_TTL_MS) return cachedEntry.value;
  if (cacheable && globalQuoteIndexPending.has(cacheKey)) return globalQuoteIndexPending.get(cacheKey);

  const load = async () => {
    const symbols = [...new Set(eligible.map((item) => symbolKey(item.symbol)).filter(Boolean))];
    const batches = [];
    for (let index = 0; index < symbols.length; index += GLOBAL_SORT_BATCH_SIZE) batches.push(symbols.slice(index, index + GLOBAL_SORT_BATCH_SIZE));
    const results = await mapWithConcurrency(batches, GLOBAL_SORT_CONCURRENCY, async (batch) => {
      try {
        return await fetchYahooQuoteRows(batch, options);
      } catch {
        return new Map();
      }
    });
    const rows = new Map();
    for (const result of results) for (const [symbol, row] of result || []) rows.set(symbol, row);
    if (cacheable && rows.size) globalQuoteIndexCache.set(cacheKey, { at: now(), value: rows });
    return rows;
  };

  if (!cacheable) return load();
  const pending = load().finally(() => globalQuoteIndexPending.delete(cacheKey));
  globalQuoteIndexPending.set(cacheKey, pending);
  return pending;
}

export async function getLiveGlobalSortValues(items, category, field, options = {}) {
  if (!isLiveGlobalSortField(category, field)) return null;
  const rows = await getGlobalQuoteIndex(items, category, options);
  if (!rows.size) return new Map();
  const values = new Map();
  for (const item of items || []) {
    const value = globalSortValue(rows.get(symbolKey(item?.symbol)), category, field);
    if (value !== null) values.set(item.id, value);
  }
  return values;
}

function quoteFromChart(symbol, chart) {`
  ]
]);

await patch("lib/sort-config.js", [
  ['    perf1: definition("perf1", "1Y return"),\n    perf3: definition("perf3", "3Y return"),\n  }),\n  "Mutual Funds"', '    perf1: definition("perf1", "1Y return"),\n  }),\n  "Mutual Funds"'],
  ['    expenseRatio: definition("expenseRatio", "Expense ratio", "asc"),\n    perf1: definition("perf1", "1Y return"),\n    perf3: definition("perf3", "3Y return"),\n  }),\n  SMAs', '    expenseRatio: definition("expenseRatio", "Expense ratio", "asc"),\n    perf1: definition("perf1", "1Y return"),\n  }),\n  SMAs'],
  ['  Equities: new Set(["primary", "marketCap", "forwardPE", "dividendYield", "perf1", "perf3"]),\n  ETFs: new Set(["primary", "aum", "expenseRatio", "perf1", "perf3"]),', '  Equities: new Set(["primary", "marketCap", "forwardPE", "dividendYield", "perf1"]),\n  ETFs: new Set(["primary", "aum", "expenseRatio", "perf1"]),']
]);

await patch("lib/catalog.js", [
  [
`function sortItems(items, options, matchMetadata) {
  const stable = (difference, a, b) => difference || a._ordinal - b._ordinal;`,
`function sortItems(items, options, matchMetadata, liveSortValues = null) {
  const stable = (difference, a, b) => difference || a._ordinal - b._ordinal;
  const useLiveValues = liveSortValues instanceof Map && liveSortValues.size > 0;`
  ],
  [
`    const left = parsed.field === "name" ? a.name : marketMetricNumber(a, parsed.field);
    const right = parsed.field === "name" ? b.name : marketMetricNumber(b, parsed.field);
    if (left === null || left === undefined) return right === null || right === undefined ? stable(0, a, b) : 1;
    if (right === null || right === undefined) return -1;`,
`    const left = parsed.field === "name" ? a.name : useLiveValues ? liveSortValues.get(a.id) : marketMetricNumber(a, parsed.field);
    const right = parsed.field === "name" ? b.name : useLiveValues ? liveSortValues.get(b.id) : marketMetricNumber(b, parsed.field);
    const leftMissing = left === null || left === undefined || (typeof left === "number" && !Number.isFinite(left));
    const rightMissing = right === null || right === undefined || (typeof right === "number" && !Number.isFinite(right));
    if (leftMissing) return rightMissing ? stable(0, a, b) : 1;
    if (rightMissing) return -1;`
  ],
  [
`export function searchCatalog(input = {}) {`,
`export function searchCatalog(input = {}, { liveSortValues = null } = {}) {`
  ],
  [
`  sortItems(matched, options, matchMetadata);
  return searchResponse({ options, matched, matchMetadata, facets, searchMode, started });`,
`  sortItems(matched, options, matchMetadata, liveSortValues);
  return searchResponse({ options, matched, matchMetadata, facets, searchMode, started });`
  ]
]);

await patch("api/search.js", [
  [
`import { searchCatalog } from "../lib/catalog.js";
import { parseRanges } from "../lib/range-config.js";`,
`import { getSearchIndex, searchCatalog } from "../lib/catalog.js";
import { getLiveGlobalSortValues, isLiveGlobalSortField } from "../lib/market-data.js";
import { parseRanges } from "../lib/range-config.js";
import { parseSort } from "../lib/sort-config.js";`
  ],
  [
`export default {
  fetch(request) {`,
`function externalMarketDataEnabled() {
  return process.env.MARKET_DATA_DISABLED !== "1" && process.env.CI !== "true";
}

const liveSortUniverseCache = new Map();
function liveSortUniverse(category) {
  if (!liveSortUniverseCache.has(category)) {
    liveSortUniverseCache.set(category, getSearchIndex(category).filter((item) => item?.symbol && !String(item.id).startsWith("syn-")));
  }
  return liveSortUniverseCache.get(category);
}

export default {
  async fetch(request) {`
  ],
  [
`      const query = Object.fromEntries(new URL(request.url).searchParams.entries());
      const result = searchCatalog(inputFromQuery(query));
      return Response.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Server-Timing": \`search;dur=\${result.tookMs}\`,
        },
      });`,
`      const query = Object.fromEntries(new URL(request.url).searchParams.entries());
      const input = inputFromQuery(query);
      const parsedSort = parseSort(input.sort);
      let liveSortValues = null;
      let liveSortUsed = false;
      if (externalMarketDataEnabled() && parsedSort && isLiveGlobalSortField(input.category, parsedSort.field)) {
        const universe = liveSortUniverse(input.category);
        const values = await getLiveGlobalSortValues(universe, input.category, parsedSort.field);
        if (values?.size >= 2) {
          liveSortValues = values;
          liveSortUsed = true;
        }
      }
      const result = searchCatalog(input, { liveSortValues });
      return Response.json({ ...result, sortData: liveSortUsed ? "Yahoo Finance quote index" : "catalog" }, {
        headers: {
          "Cache-Control": liveSortUsed ? "public, s-maxage=60, stale-while-revalidate=300" : "public, s-maxage=3600, stale-while-revalidate=86400",
          "Server-Timing": \`search;dur=\${result.tookMs}\`,
        },
      });`
  ]
]);

const test = `import test from "node:test";
import assert from "node:assert/strict";
import { getLiveGlobalSortValues, isLiveGlobalSortField } from "../lib/market-data.js";
import { searchCatalog } from "../lib/catalog.js";
import { isSortAllowed } from "../lib/sort-config.js";

function response(payload, { status = 200, headers = {} } = {}) {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) { return normalized.get(String(name).toLowerCase()) || null; },
      getSetCookie() { const value = normalized.get("set-cookie"); return value ? [value] : []; },
    },
    async json() { return payload; },
    async text() { return typeof payload === "string" ? payload : JSON.stringify(payload); },
  };
}

test("global Yahoo sort index maps cheap quote fields without history calls", async () => {
  const calls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://fc.yahoo.com") return response("", { status: 404, headers: { "set-cookie": "A3=sort; Path=/; Secure" } });
    if (url.includes("/v1/test/getcrumb")) return response("sort-crumb");
    if (url.includes("/v7/finance/quote")) return response({ quoteResponse: { result: [
      { symbol: "AAA", regularMarketPrice: 100, marketCap: 1000, forwardPE: 10, dividendYield: 1.2, fiftyTwoWeekChangePercent: 44 },
      { symbol: "BBB", regularMarketPrice: 200, marketCap: 2000, forwardPE: 20, dividendYield: 0.5, fiftyTwoWeekChangePercent: 12 },
    ] } });
    throw new Error("Unexpected URL " + url);
  };
  const items = [
    { id: "a", category: "Equities", symbol: "AAA" },
    { id: "b", category: "Equities", symbol: "BBB" },
  ];
  const values = await getLiveGlobalSortValues(items, "Equities", "perf1", { fetchImpl });
  assert.deepEqual([...values], [["a", 44], ["b", 12]]);
  assert.equal(calls.some((url) => url.includes("/v8/finance/chart")), false);
});

test("live values decide the global page before catalog fallback values", () => {
  const live = new Map([["eq-aapl", 80], ["eq-msft", 10], ["eq-nvda", 40]]);
  const result = searchCatalog({ category: "Equities", sort: "perf1-desc", pageSize: 3 }, { liveSortValues: live });
  assert.deepEqual(result.items.map((item) => item.id), ["eq-aapl", "eq-nvda", "eq-msft"]);
});

test("3Y stays visible but is not offered as a globally live Equity or ETF sort", () => {
  assert.equal(isLiveGlobalSortField("Equities", "perf1"), true);
  assert.equal(isSortAllowed("perf3-desc", "Equities", false), false);
  assert.equal(isSortAllowed("perf3-desc", "ETFs", false), false);
  assert.equal(isSortAllowed("perf3-desc", "SMAs", false), true);
});
`;
await writeFile("tests/live-global-sort.test.mjs", test);

console.log("Applied live global sorting patch");
