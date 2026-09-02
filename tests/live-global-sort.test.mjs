import test from "node:test";
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
