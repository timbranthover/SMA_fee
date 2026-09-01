import test from "node:test";
import assert from "node:assert/strict";
import { applyQuoteToDetail, applyQuoteToSnapshot, getDailyHistory, getLiveQuote } from "../lib/market-data.js";

function response(payload) {
  return { ok: true, status: 200, async json() { return payload; } };
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

test("daily history prefers adjusted closes and preserves dates", async () => {
  const timestamps = [1788134400, 1788220800, 1788307200];
  const history = await getDailyHistory("TESTH", { fetchImpl: async () => response(chartPayload({ symbol: "TESTH", timestamps, closes: [50, 52, 53], adjusted: [49, 51, 52] })) });
  assert.deepEqual(history.points.map((point) => point.value), [49, 51, 52]);
  assert.equal(history.frequency, "Yahoo Finance daily adjusted close");
});

test("live quote overlays preserve the existing snapshot and detail contracts", () => {
  const quote = { price: 123.45, previousClose: 120, changePercent: 2.875, currency: "USD", timezone: "America/New_York", asOf: 1788279000, points: [{ value: 120 }, { value: 123.45 }] };
  const snapshot = applyQuoteToSnapshot({ primary: { label: "Market price", value: "$99.00" }, trend: { label: "1Y", value: "+4.0%", points: [1, 2] }, asOf: "Illustrative" }, quote);
  assert.equal(snapshot.primary.value, "$123.45");
  assert.equal(snapshot.primary.change, "+2.88%");
  assert.deepEqual(snapshot.trend.points, [120, 123.45]);
  assert.match(snapshot.asOf, /Yahoo Finance/);

  const detail = applyQuoteToDetail({ category: "ETFs", profile: { quote: { value: "$99.00" } }, controls: { data: { source: "Illustrative" } } }, quote);
  assert.equal(detail.profile.quote.value, "$123.45");
  assert.equal(detail.profile.quote.secondaryLabel, "Previous close");
  assert.equal(detail.profile.quote.secondaryValue, "$120.00");
  assert.match(detail.controls.data.source, /Nasdaq Trader reference \+ Yahoo Finance market data/);
});
