import test from "node:test";
import assert from "node:assert/strict";
import historyHandler from "../api/history.js";
import { getComparisonHistory, parseHistoryIds } from "../lib/history.js";

function trailingReturn(points, start) {
  const first = points.find((point) => point.time >= start);
  return ((points.at(-1).value / first.value) - 1) * 100;
}

test("comparison history is deterministic, ordered and internally consistent", () => {
  const first = getComparisonHistory(["eq-aapl", "eq-msft"]);
  const second = getComparisonHistory(["eq-aapl", "eq-msft"]);
  assert.deepEqual(first, second);
  assert.equal(first.series.length, 2);
  assert.equal(first.benchmark.id, "benchmark-sp500");
  assert.ok(first.series.every((series) => series.points.length > 2000));
  assert.ok(first.series.every((series) => series.points.every((point, index) => index === 0 || point.time > series.points[index - 1].time)));
  assert.ok(Math.abs(trailingReturn(first.series[0].points, "2025-08-21") - 18.4) < 0.15);
  const appleThreeYear = Math.pow(1 + trailingReturn(first.series[0].points, "2023-08-21") / 100, 1 / 3) - 1;
  assert.ok(Math.abs(appleThreeYear * 100 - 21.7) < 0.15);
});

test("comparison identifiers are deduplicated and bounded", () => {
  assert.deepEqual(parseHistoryIds("eq-aapl,eq-aapl,eq-msft"), ["eq-aapl", "eq-msft"]);
  assert.throws(() => parseHistoryIds(""), /at least one/i);
  assert.throws(() => parseHistoryIds("a,b,c,d,e"), /no more than 4/i);
  assert.throws(() => parseHistoryIds("<script>"), /invalid/i);
});

test("history API returns complete cached data and rejects bad requests", async () => {
  const valid = await historyHandler.fetch(new Request("https://example.test/api/history?ids=eq-aapl,eq-msft"));
  const invalid = await historyHandler.fetch(new Request("https://example.test/api/history?ids=%3Cscript%3E"));
  const missing = await historyHandler.fetch(new Request("https://example.test/api/history?ids=missing"));
  assert.equal(valid.status, 200);
  assert.match(valid.headers.get("cache-control"), /s-maxage=900/);
  const data = await valid.json();
  assert.equal(data.series[0].symbol, "AAPL");
  assert.equal(data.series[1].symbol, "MSFT");
  assert.match(data.methodology, /illustrative/i);
  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
});