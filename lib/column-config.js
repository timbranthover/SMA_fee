export const MAX_RESULT_COLUMNS = 5;

export const COLUMN_DEFINITIONS = Object.freeze({
  primary: { label: "Market / value", group: "Snapshot" },
  trend: { label: "Trend", group: "Snapshot" },
  featuredDecision: { label: "Key measure", group: "Snapshot" },
  featuredImplementation: { label: "Cost / terms", group: "Snapshot" },
  minimum: { label: "Minimum", group: "Implementation" },
  fee: { label: "Annual fee", group: "Implementation" },
  risk: { label: "Risk", group: "Risk" },
  perf1: { label: "1Y return", group: "Performance" },
  perf3: { label: "3Y return", group: "Performance" },
  liquidity: { label: "Liquidity", group: "Implementation" },
  assetClass: { label: "Asset class", group: "Research" },
  forwardPE: { label: "Forward P/E", group: "Valuation" },
  dividendYield: { label: "Dividend yield", group: "Income" },
  secYield: { label: "30-day SEC yield", group: "Income" },
  expenseRatio: { label: "Expense ratio", group: "Cost" },
  managerFee: { label: "Manager fee", group: "Cost" },
  yieldToWorst: { label: "Yield to worst", group: "Income" },
  creditRating: { label: "Credit rating", group: "Risk" },
  reportedReturn3Y: { label: "3Y annualized", group: "Performance" },
  reportedLiquidity: { label: "Reported liquidity", group: "Implementation" },
  contingentCoupon: { label: "Contingent coupon", group: "Income" },
  term: { label: "Term", group: "Implementation" },
  annualFee: { label: "Annual fee", group: "Cost" },
  guaranteePeriod: { label: "Guarantee period", group: "Contract" },
  return1Y: { label: "1Y return", group: "Performance" },
  custodyFee: { label: "Custody fee", group: "Cost" },
});

const rules = {
  All: ["primary", "trend", "featuredDecision", "featuredImplementation", "minimum", "fee", "risk", "perf1", "perf3", "liquidity", "assetClass"],
  Equities: ["primary", "trend", "forwardPE", "dividendYield", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  "Mutual Funds": ["primary", "trend", "secYield", "expenseRatio", "minimum", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  ETFs: ["primary", "trend", "secYield", "expenseRatio", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  SMAs: ["primary", "trend", "minimum", "managerFee", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  "Fixed Income": ["primary", "trend", "yieldToWorst", "creditRating", "minimum", "perf1", "risk", "assetClass", "liquidity"],
  Alternatives: ["primary", "trend", "reportedReturn3Y", "reportedLiquidity", "minimum", "fee", "perf1", "risk", "assetClass", "liquidity"],
  Structured: ["primary", "trend", "contingentCoupon", "term", "minimum", "fee", "risk", "assetClass", "liquidity"],
  "Managed Options": ["primary", "trend", "minimum", "annualFee", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  Annuities: ["primary", "trend", "guaranteePeriod", "annualFee", "minimum", "perf1", "risk", "assetClass", "liquidity"],
  "Precious Metals": ["primary", "trend", "return1Y", "custodyFee", "minimum", "risk", "assetClass", "liquidity"],
};
export const CATEGORY_COLUMN_RULES = Object.freeze(Object.fromEntries(Object.entries(rules).map(([category, columns]) => [category, Object.freeze(columns)])));

const defaults = {
  All: ["primary", "trend", "featuredDecision", "featuredImplementation"],
  Equities: ["primary", "trend", "forwardPE", "dividendYield"],
  "Mutual Funds": ["primary", "trend", "secYield", "expenseRatio"],
  ETFs: ["primary", "trend", "secYield", "expenseRatio"],
  SMAs: ["primary", "trend", "minimum", "managerFee"],
  "Fixed Income": ["primary", "trend", "yieldToWorst", "creditRating"],
  Alternatives: ["primary", "trend", "reportedReturn3Y", "reportedLiquidity"],
  Structured: ["primary", "trend", "contingentCoupon", "term"],
  "Managed Options": ["primary", "trend", "minimum", "annualFee"],
  Annuities: ["primary", "trend", "guaranteePeriod", "annualFee"],
  "Precious Metals": ["primary", "trend", "return1Y", "custodyFee"],
};
export const CATEGORY_DEFAULT_COLUMNS = Object.freeze(Object.fromEntries(Object.entries(defaults).map(([category, columns]) => [category, Object.freeze(columns)])));

export const CATEGORY_COLUMN_PRESETS = Object.freeze({
  All: { Research: defaults.All, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Risk: ["primary", "trend", "risk", "liquidity", "assetClass"], "Cost & implementation": ["minimum", "fee", "liquidity", "risk", "assetClass"] },
  Equities: { Research: defaults.Equities, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Income: ["primary", "trend", "dividendYield", "perf1", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "perf3"] },
  "Mutual Funds": { Research: defaults["Mutual Funds"], Performance: ["primary", "trend", "perf1", "perf3", "risk"], Income: ["primary", "trend", "secYield", "expenseRatio", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "expenseRatio", "minimum", "liquidity", "risk"] },
  ETFs: { Research: defaults.ETFs, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Income: ["primary", "trend", "secYield", "expenseRatio", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "expenseRatio", "liquidity", "risk"] },
  SMAs: { Research: defaults.SMAs, Performance: ["primary", "trend", "perf1", "perf3", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "minimum", "managerFee", "liquidity", "risk"] },
  "Fixed Income": { Research: defaults["Fixed Income"], Performance: ["primary", "trend", "perf1", "risk", "liquidity"], Income: ["primary", "trend", "yieldToWorst", "creditRating", "minimum"], Risk: ["primary", "trend", "creditRating", "risk", "liquidity"], "Cost & implementation": ["primary", "minimum", "liquidity", "risk"] },
  Alternatives: { Research: defaults.Alternatives, Performance: ["primary", "trend", "perf1", "reportedReturn3Y", "risk"], Risk: ["primary", "trend", "risk", "reportedLiquidity", "assetClass"], "Cost & implementation": ["primary", "minimum", "fee", "reportedLiquidity", "risk"] },
  Structured: { Research: defaults.Structured, Income: ["primary", "trend", "contingentCoupon", "term", "risk"], Risk: ["primary", "trend", "risk", "liquidity", "term"], "Cost & implementation": ["primary", "minimum", "fee", "term", "liquidity"] },
  "Managed Options": { Research: defaults["Managed Options"], Performance: ["primary", "trend", "perf1", "perf3", "risk"], Risk: ["primary", "trend", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "minimum", "annualFee", "liquidity", "risk"] },
  Annuities: { Research: defaults.Annuities, Income: ["primary", "trend", "guaranteePeriod", "annualFee", "risk"], Risk: ["primary", "trend", "risk", "guaranteePeriod", "liquidity"], "Cost & implementation": ["primary", "minimum", "annualFee", "guaranteePeriod", "liquidity"] },
  "Precious Metals": { Research: defaults["Precious Metals"], Performance: ["primary", "trend", "return1Y", "risk", "assetClass"], Risk: ["primary", "trend", "risk", "liquidity", "assetClass"], "Cost & implementation": ["primary", "custodyFee", "minimum", "liquidity", "risk"] },
});

export const PRIMARY_COLUMN_LABELS = Object.freeze({ All: "Market / value", Equities: "Price", "Mutual Funds": "NAV", ETFs: "Price", SMAs: "3Y return", "Fixed Income": "Price", Alternatives: "Reported NAV", Structured: "Indicative value", "Managed Options": "3Y return", Annuities: "Crediting rate", "Precious Metals": "Reference price" });
export const TREND_COLUMN_LABELS = Object.freeze({ All: "Trend", Equities: "1Y trend", "Mutual Funds": "1Y trend", ETFs: "1Y trend", SMAs: "1Y trend", "Fixed Income": "1Y trend", Alternatives: "1Y trend", Structured: "Since issue", "Managed Options": "1Y trend", Annuities: "Growth", "Precious Metals": "1Y trend" });

export function normalizeColumns(category, columns) {
  const safeCategory = CATEGORY_COLUMN_RULES[category] ? category : "All";
  const allowed = new Set(CATEGORY_COLUMN_RULES[safeCategory]);
  const normalized = [...new Set(Array.isArray(columns) ? columns : [])].filter((column) => allowed.has(column)).slice(0, MAX_RESULT_COLUMNS);
  return normalized.length ? normalized : [...CATEGORY_DEFAULT_COLUMNS[safeCategory]];
}

export function columnLabel(category, column) {
  if (column === "primary") return PRIMARY_COLUMN_LABELS[category] || PRIMARY_COLUMN_LABELS.All;
  if (column === "trend") return TREND_COLUMN_LABELS[category] || TREND_COLUMN_LABELS.All;
  return COLUMN_DEFINITIONS[column]?.label || column;
}
