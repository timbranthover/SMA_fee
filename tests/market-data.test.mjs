import test from "node:test";
import assert from "node:assert/strict";
import { applyMetricsToSnapshot, applyQuoteToDetail, applyQuoteToSnapshot, getDailyHistory, getLiveMetrics, getLiveQuote } from "../lib/market-data.js";

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

function chartPayload({ symbol = "TEST", timestamps = [1788278400, 1788278700, 1788279000], closes = [100, 101, 102], adjusted = null, price = 102, previousClose = 100 } = {}) {
  return {
    chart: {
      error: null,
      result: [{
        meta: {
          symbol,
          currency: "USD",
          regularMarketPrice: price,
          regularMarketPreviousClose: previousClose,
          regularMarketTime: timestamps.at(-1),
          exchangeTimezoneName: "America/New_York",
          fullExchangeName: "NasdaqGS",
        },
        timestamp: timestamps,
        indicators: {
          quote: [{ close: closes }],
          ...(adjusted ? { adjclose: [{ adjclose: adjusted }] } : {}),
        },
      }],
    },
  };
}

test("live quote parsing uses provider price, change and intraday points", async () => {
  const quote = await getLiveQuote("TESTQ", { fetchImpl: async () => response(chartPayload({ symbol: "TESTQ", price: 102, previousClose: 100 })) });
  assert.equal(quote.price, 102);
  assert.equal(quote.previousClose, 100);
  assert.equal(quote.changePercent, 2);
  assert.equal(quote.points.length, 3);
  assert.equal(quote.provider, "Yahoo Finance");
});

test("null provider bars are omitted instead of becoming zero-price chart spikes", async () => {
  const quote = await getLiveQuote("TESTNULLQ", { fetchImpl: async () => response(chartPayload({ symbol: "TESTNULLQ", closes: [100, null, 102] })) });
  assert.deepEqual(quote.points.map((point) => point.value), [100, 102]);
  const history = await getDailyHistory("TESTNULLH", { fetchImpl: async () => response(chartPayload({ symbol: "TESTNULLH", closes: [50, null, 53], adjusted: [49, null, 52] })) });
  assert.deepEqual(history.points.map((point) => point.value), [49, 52]);
});

test("daily history prefers adjusted closes and preserves dates", async () => {
  const timestamps = [1788134400, 1788220800, 1788307200];
  const history = await getDailyHistory("TESTH", { fetchImpl: async () => response(chartPayload({ symbol: "TESTH", timestamps, closes: [50, 52, 53], adjusted: [49, 51, 52] })) });
  assert.deepEqual(history.points.map((point) => point.value), [49, 51, 52]);
  assert.equal(history.frequency, "Yahoo Finance daily adjusted close");
});

test("live metrics combine Yahoo quote fundamentals with adjusted-close 1Y and 3Y returns", async () => {
  const latest = 1788278400;
  const timestamps = [];
  const adjusted = [];
  for (let yearsAgo = 5; yearsAgo >= 0; yearsAgo -= 1) {
    const date = new Date(latest * 1000);
    date.setUTCFullYear(date.getUTCFullYear() - yearsAgo);
    timestamps.push(Math.floor(date.getTime() / 1000));
    adjusted.push(100 * Math.pow(1.1, 5 - yearsAgo));
  }
  const calls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://fc.yahoo.com") return response("", { status: 404, headers: { "set-cookie": "A3=test-cookie; Path=/; Secure" } });
    if (url.includes("/v1/test/getcrumb")) return response("test-crumb");
    if (url.includes("/v7/finance/quote")) return response({ quoteResponse: { result: [
      { symbol: "EQT", currency: "USD", marketCap: 2_450_000_000_000, forwardPE: 24.25, dividendYield: 0.63 },
      { symbol: "ETF", currency: "USD", netAssets: 715_000_000_000, netExpenseRatio: 0.03 },
    ] } });
    if (url.includes("/v8/finance/chart/")) {
      const symbol = decodeURIComponent(url.split("/chart/")[1].split("?")[0]);
      return response(chartPayload({ symbol, timestamps, closes: adjusted, adjusted, price: adjusted.at(-1), previousClose: adjusted.at(-2) }));
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const items = [{ id: "eq", category: "Equities", symbol: "EQT" }, { id: "etf", category: "ETFs", symbol: "ETF" }];
  const metrics = await getLiveMetrics(items, { fetchImpl });
  assert.equal(metrics.get("eq").marketCap, 2_450_000_000_000);
  assert.equal(metrics.get("eq").forwardPE, 24.25);
  assert.equal(metrics.get("eq").dividendYield, 0.63);
  assert.equal(metrics.get("etf").netAssets, 715_000_000_000);
  assert.equal(metrics.get("etf").expenseRatio, 0.03);
  assert.ok(Math.abs(metrics.get("eq").perf1 - 10) < 0.001);
  assert.ok(Math.abs(metrics.get("eq").perf3 - 10) < 0.001);
  assert.equal(calls.filter((url) => url.includes("/v7/finance/quote")).length, 1);
});

test("live metric overlay updates only valid Yahoo fields and preserves existing fallbacks", () => {
  const base = {
    primary: { value: "$99.00" },
    metrics: {
      marketCap: { value: "$1T", label: "Market cap" },
      forwardPE: { value: "30×", label: "Forward P/E" },
      dividendYield: { value: "1.00%", label: "Dividend yield" },
      expenseRatio: { value: "0.50%", label: "Expense ratio" },
    },
  };
  const equity = applyMetricsToSnapshot(base, { perf1: 12.345, perf3: 8.765, marketCap: 2_450_000_000_000, forwardPE: 24.25, dividendYield: null, currency: "USD" }, "Equities");
  assert.equal(equity.metrics.marketCap.value, "$2.45T");
  assert.equal(equity.metrics.forwardPE.value, "24.3×");
  assert.equal(equity.metrics.dividendYield.value, "1.00%");
  assert.equal(equity.metrics.perf1.value, "+12.3%");
  assert.equal(equity.metrics.perf3.value, "+8.8%");
  assert.equal(equity.live.marketCap, 2_450_000_000_000);

  const etf = applyMetricsToSnapshot(base, { perf1: 7, perf3: 5, netAssets: 715_000_000_000, expenseRatio: 0.03, currency: "USD" }, "ETFs");
  assert.equal(etf.metrics.aum.value, "$715B");
  assert.equal(etf.metrics.expenseRatio.value, "0.03%");
});

test("live quote overlays preserve the existing snapshot and detail contracts", () => {
  const quote = { price: 123.45, previousClose: 120, changePercent: 2.875, currency: "USD", timezone: "America/New_York", asOf: 1788279000, points: [{ value: 120 }, { value: 123.45 }] };
  const snapshot = applyQuoteToSnapshot({ primary: { label: "Market price", value: "$99.00" }, trend: { label: "1Y", value: "+4.0%", points: [1, 2] }, asOf: "Illustrative" }, quote);
  assert.equal(snapshot.primary.value, "$123.45");
  assert.equal(snapshot.primary.change, "+2.88%");
  assert.deepEqual(snapshot.trend.points, [1, 2]);
  assert.equal(snapshot.trend.label, "1Y");
  assert.deepEqual(snapshot.intraday.points, [120, 123.45]);
  assert.equal(snapshot.intraday.label, "Today");
  assert.doesNotMatch(snapshot.asOf, /Yahoo Finance/);
  assert.match(snapshot.asOf, /(?:AM|PM)/);

  const detail = applyQuoteToDetail({ category: "ETFs", profile: { quote: { value: "$99.00" } }, controls: { data: { source: "Illustrative" } } }, quote);
  assert.equal(detail.profile.quote.value, "$123.45");
  assert.equal(detail.profile.quote.secondaryLabel, "Previous close");
  assert.equal(detail.profile.quote.secondaryValue, "$120.00");
  assert.match(detail.controls.data.source, /Nasdaq Trader reference \+ Yahoo Finance market data/);
});