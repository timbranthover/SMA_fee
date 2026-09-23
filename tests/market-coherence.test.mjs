import test from "node:test";
import assert from "node:assert/strict";
import { getInvestmentDetail, getMarketSnapshots, searchCatalog } from "../lib/catalog.js";
import { applyQuoteToSnapshot, applyMetricsToSnapshot } from "../lib/market-data.js";
import { applyMetricsToDetail, comparisonFee } from "../lib/detail-market-data.js";
import { readFile } from "node:fs/promises";

test("displayed reference values remain globally monotonic for price and 1Y sorts", () => {
  for (const category of ["ETFs", "Equities"]) {
    for (const [sort, direction] of [["primary-desc", -1], ["primary-asc", 1], ["perf1-desc", -1], ["perf1-asc", 1]]) {
      const first = searchCatalog({ category, sort });
      const second = searchCatalog({ category, sort, cursor: first.nextCursor });
      const rows = [...first.items, ...second.items];
      const prices = getMarketSnapshots(rows.map((item) => item.id));
      const displayed = rows.map((item) => sort.startsWith("primary") ? Number(item.sortPrice) : item.perf1);
      for (let index = 1; index < displayed.length; index += 1) {
        if (displayed[index] == null || displayed[index - 1] == null) continue;
        assert.ok((displayed[index] - displayed[index - 1]) * direction >= 0, `${category} ${sort}: ${rows[index - 1].symbol} before ${rows[index].symbol}`);
      }
      if (sort.startsWith("primary")) for (const row of rows) {
        assert.equal(Number(prices[row.id].primary.value.slice(1)), row.sortPrice);
      }
    }
  }
});

test("live ETF fees agree in profile facts, fees table and comparison", () => {
  const original = getInvestmentDetail("VTI");
  assert.equal(original.name, "Vanguard Total Stock Market ETF");
  const metrics = { expenseRatio: 0.03, perf1: 18, perf3: 20 };
  const detail = applyMetricsToDetail(original, metrics);
  const snapshot = applyMetricsToSnapshot(getMarketSnapshots([original.id])[original.id], metrics, "ETFs");
  assert.equal(detail.profile.keyFacts.find(({ label }) => label === "Expense ratio").value, "0.03%");
  assert.equal(detail.profile.fees.find(({ label }) => label === "Gross expense ratio").value, "0.03%");
  assert.equal(comparisonFee(original, snapshot, detail), detail.fee);
  assert.equal(snapshot.metrics.expenseRatio.value, "0.03%");
  const row = detail.profile.performance.rows.find(({ period }) => period === "3 years");
  assert.ok(Math.abs(row.investment - row.benchmark) > 1, "mixed-basis excess must be suppressed in the UI");
});

test("the reference quote remains available as the sorted primary when live quote arrives", () => {
  const baseline = getMarketSnapshots(["etf-ivv"])["etf-ivv"];
  const enriched = applyQuoteToSnapshot(baseline, { price: 776.12, changePercent: 1.2, points: [], asOf: "2026-09-22T20:00:00Z", timezone: "America/New_York", currency: "USD" });
  assert.equal(enriched.reference.primary.value, baseline.primary.value);
  assert.equal(enriched.primary.value, "$776.12");
});

test("detail and household drawers do not repeat illustrative prototype footers", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(app, /wealth-disclosure|profile-disclosure|Illustrative household|Illustrative SMA/);
  assert.equal((html.match(/Not for investment decisions/g) || []).length, 1);
  for (const id of ["VTI", "ann-fixed", "alt-infra", "sma-northstar"]) {
    assert.doesNotMatch(JSON.stringify(getInvestmentDetail(id)), /Illustrative|prototype/);
  }
});
