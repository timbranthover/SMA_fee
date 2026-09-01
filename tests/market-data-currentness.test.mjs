import test from "node:test";
import assert from "node:assert/strict";
import { getLiveMetrics, getLiveQuotes } from "../lib/market-data.js";

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

function chartPayload({ symbol, timestamps, adjusted, price, previousClose }) {
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
          quote: [{ close: adjusted }],
          adjclose: [{ adjclose: adjusted }],
        },
      }],
    },
  };
}

test("visible quotes batch through one Yahoo spark request", async () => {
  const calls = [];
  const sparkChart = (symbol, price) => ({
    meta: {
      symbol,
      currency: "USD",
      regularMarketPrice: price,
      regularMarketPreviousClose: price - 1,
      regularMarketTime: 1788291000,
      exchangeTimezoneName: "America/New_York",
    },
    timestamp: [1788290400, 1788290700, 1788291000],
    indicators: { quote: [{ close: [price - 0.5, price - 0.2, price] }] },
  });
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/v7/finance/spark")) return response({ spark: { error: null, result: [
      { symbol: "BATCHA", response: [sparkChart("BATCHA", 101)] },
      { symbol: "BATCHB", response: [sparkChart("BATCHB", 202)] },
    ] } });
    throw new Error(`Unexpected URL ${url}`);
  };
  const quotes = await getLiveQuotes([
    { id: "a", category: "Equities", symbol: "BATCHA" },
    { id: "b", category: "ETFs", symbol: "BATCHB" },
  ], { fetchImpl });
  assert.equal(quotes.get("a").price, 101);
  assert.equal(quotes.get("b").price, 202);
  assert.equal(calls.filter((url) => url.includes("/v7/finance/spark")).length, 1);
  assert.equal(calls.filter((url) => url.includes("/v8/finance/chart/")).length, 0);
});

test("1Y return ends at the current quote rather than the last completed weekly bar", async () => {
  const currentTime = Math.floor(Date.parse("2026-09-01T19:30:00Z") / 1000);
  const timestamps = [
    Math.floor(Date.parse("2021-08-30T13:30:00Z") / 1000),
    Math.floor(Date.parse("2022-08-29T13:30:00Z") / 1000),
    Math.floor(Date.parse("2023-08-28T13:30:00Z") / 1000),
    Math.floor(Date.parse("2024-08-26T13:30:00Z") / 1000),
    Math.floor(Date.parse("2025-08-25T13:30:00Z") / 1000),
    Math.floor(Date.parse("2026-08-24T13:30:00Z") / 1000),
  ];
  const adjusted = [150, 160, 175, 190, 231.29, 315.47];
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url === "https://fc.yahoo.com") return response("", { status: 404, headers: { "set-cookie": "A3=current-return; Path=/; Secure" } });
    if (url.includes("/v1/test/getcrumb")) return response("current-return-crumb");
    if (url.includes("/v7/finance/quote")) return response({ quoteResponse: { result: [{
      symbol: "CURR1Y",
      currency: "USD",
      regularMarketPrice: 325.71,
      regularMarketTime: currentTime,
      marketCap: 1_000_000_000,
    }] } });
    if (url.includes("/v8/finance/chart/CURR1Y")) return response(chartPayload({
      symbol: "CURR1Y",
      timestamps,
      adjusted,
      price: 315.47,
      previousClose: 314,
    }));
    throw new Error(`Unexpected URL ${url}`);
  };
  const metrics = await getLiveMetrics([{ id: "curr", category: "Equities", symbol: "CURR1Y" }], { fetchImpl });
  const expected = (325.71 / 231.29 - 1) * 100;
  assert.ok(Math.abs(metrics.get("curr").perf1 - expected) < 0.001);
  assert.ok(metrics.get("curr").perf1 > 40);
});
