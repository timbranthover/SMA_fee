import test from "node:test";
import assert from "node:assert/strict";
import { applyMetricsToDetail } from "../lib/detail-market-data.js";

function equityDetail() {
  return {
    id: "eq-aapl",
    category: "Equities",
    perf1: 18.4,
    perf3: 21.7,
    aum: "$4.6T market cap",
    profile: {
      keyFacts: [
        { label: "Market capitalization", value: "$4.6T market cap" },
        { label: "P/E (forward)", value: "14.3×" },
        { label: "Dividend yield", value: "1.8%" },
      ],
      performance: {
        subtitle: "Annualized total returns through Aug 21, 2026",
        rows: [
          { period: "1 year", investment: 18.4, benchmark: 18.6 },
          { period: "3 years", investment: 21.7, benchmark: 22 },
          { period: "5 years", investment: 19.5, benchmark: 19.4 },
        ],
      },
    },
  };
}

function etfDetail() {
  return {
    id: "etf-ivv",
    category: "ETFs",
    fee: 0.03,
    perf1: 17.7,
    perf3: 19.2,
    aum: "$715B",
    profile: {
      keyFacts: [
        { label: "Net assets", value: "$715B" },
        { label: "Expense ratio", value: "0.03%" },
        { label: "30-day SEC yield", value: "1.2%" },
      ],
      performance: {
        subtitle: "Annualized total returns through Aug 21, 2026",
        rows: [
          { period: "1 year", investment: 17.7, benchmark: 17.3 },
          { period: "3 years", investment: 19.2, benchmark: 19.4 },
        ],
      },
    },
  };
}

test("equity detail uses the same live Yahoo metrics as result snapshots", () => {
  const detail = applyMetricsToDetail(equityDetail(), {
    perf1: 41.768,
    perf3: 22.994,
    marketCap: 4_785_284_055_040,
    forwardPE: 34.36954,
    dividendYield: 0.33,
    currency: "USD",
  });
  assert.equal(detail.perf1, 41.768);
  assert.equal(detail.perf3, 22.994);
  assert.equal(detail.aum, "$4.79T market cap");
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "Market capitalization").value, "$4.79T");
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "P/E (forward)").value, "34.4×");
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "Dividend yield").value, "0.33%");
  assert.equal(detail.profile.performance.rows.find((row) => row.period === "1 year").investment, 41.768);
  assert.equal(detail.profile.performance.rows.find((row) => row.period === "3 years").investment, 22.994);
  assert.equal(detail.profile.performance.rows.find((row) => row.period === "5 years").investment, 19.5);
  assert.match(detail.profile.performance.subtitle, /Live 1Y total \/ 3Y annualized/);
});

test("ETF detail updates Yahoo-backed fields without replacing governed SEC yield", () => {
  const detail = applyMetricsToDetail(etfDetail(), {
    perf1: 19.497,
    perf3: 21.679,
    netAssets: 869_199_900_000,
    expenseRatio: 0.03,
    currency: "USD",
  });
  assert.equal(detail.perf1, 19.497);
  assert.equal(detail.perf3, 21.679);
  assert.equal(detail.aum, "$869B");
  assert.equal(detail.fee, 0.03);
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "Net assets").value, "$869B");
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "Expense ratio").value, "0.03%");
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "30-day SEC yield").value, "1.2%");
});

test("missing Yahoo fields preserve existing detail values", () => {
  const original = equityDetail();
  const detail = applyMetricsToDetail(original, { perf1: null, perf3: null, marketCap: null, forwardPE: null, dividendYield: null, currency: "USD" });
  assert.equal(detail.perf1, 18.4);
  assert.equal(detail.perf3, 21.7);
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "P/E (forward)").value, "14.3×");
});
