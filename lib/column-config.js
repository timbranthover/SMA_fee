export const MAX_RESULT_COLUMNS = 5;

export const COLUMN_DEFINITIONS = Object.freeze({
  primary: { label: "Market / value", group: "Snapshot" },
  featuredDecision: { label: "Key measure", group: "Snapshot" },
  featuredImplementation: { label: "Cost / terms", group: "Snapshot" },
  minimum: { label: "Minimum", group: "Implementation" },
  fee: { label: "Annual fee", group: "Implementation" },
  risk: { label: "Risk", group: "Risk" },
  perf1: { label: "1Y return", group: "Performance" },
  perf3: { label: "3Y return", group: "Performance" },
  liquidity: { label: "Liquidity", group: "Implementation" },
  assetClass: { label: "Asset class", group: "Research" },
  marketCap: { label: "Market cap", group: "Size" },
  aum: { label: "AUM", group: "Size" },
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
  All: ["primary", "featuredDecision", "featuredImplementation", "minimum", "fee", "risk", "perf1", "perf3", "liquidity", "assetClass"],
  Equities: ["primary", "marketCap", "forwardPE", "dividendYield", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  "Mutual Funds": ["primary", "secYield", "expenseRatio", "minimum", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  ETFs: ["primary", "aum", "secYield", "expenseRatio", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  SMAs: ["primary", "minimum", "managerFee", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  "Fixed Income": ["primary", "yieldToWorst", "creditRating", "minimum", "perf1", "risk", "assetClass", "liquidity"],
  Alternatives: ["primary", "reportedReturn3Y", "reportedLiquidity", "minimum", "fee", "perf1", "risk", "assetClass", "liquidity"],
  Structured: ["primary", "contingentCoupon", "term", "minimum", "fee", "perf1", "risk", "assetClass", "liquidity"],
  "Managed Options": ["primary", "minimum", "annualFee", "perf1", "perf3", "risk", "assetClass", "liquidity"],
  Annuities: ["primary", "guaranteePeriod", "annualFee", "minimum", "perf1", "risk", "assetClass", "liquidity"],
  "Precious Metals": ["primary", "return1Y", "custodyFee", "minimum", "risk", "assetClass", "liquidity"],
};
export const CATEGORY_COLUMN_RULES = Object.freeze(Object.fromEntries(Object.entries(rules).map(([category, columns]) => [category, Object.freeze(columns)])));

const defaults = {
  All: ["primary", "perf1", "featuredDecision", "featuredImplementation"],
  Equities: ["primary", "marketCap", "perf1", "forwardPE", "dividendYield"],
  "Mutual Funds": ["primary", "perf1", "secYield", "expenseRatio"],
  ETFs: ["primary", "aum", "perf1", "secYield", "expenseRatio"],
  SMAs: ["primary", "perf1", "minimum", "managerFee"],
  "Fixed Income": ["primary", "perf1", "yieldToWorst", "creditRating"],
  Alternatives: ["primary", "perf1", "reportedReturn3Y", "reportedLiquidity"],
  Structured: ["primary", "perf1", "contingentCoupon", "term"],
  "Managed Options": ["primary", "perf1", "minimum", "annualFee"],
  Annuities: ["primary", "perf1", "guaranteePeriod", "annualFee"],
  "Precious Metals": ["primary", "return1Y", "custodyFee"],
};
export const CATEGORY_DEFAULT_COLUMNS = Object.freeze(Object.fromEntries(Object.entries(defaults).map(([category, columns]) => [category, Object.freeze(columns)])));

export const CATEGORY_COLUMN_PRESETS = Object.freeze({
  All: { Research: defaults.All, Performance: ["primary", "perf1", "perf3", "risk"], Risk: ["primary", "perf1", "risk", "liquidity", "assetClass"], "Cost & implementation": ["minimum", "fee", "liquidity", "risk", "assetClass"] },
  Equities: { Research: defaults.Equities, Performance: ["primary", "marketCap", "perf1", "perf3"], Income: ["primary", "marketCap", "dividendYield", "perf1"], Risk: ["primary", "marketCap", "perf1", "risk", "assetClass"] },
  "Mutual Funds": { Research: defaults["Mutual Funds"], Performance: ["primary", "perf1", "perf3", "risk"], Income: ["primary", "perf1", "secYield", "expenseRatio", "risk"], Risk: ["primary", "perf1", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "expenseRatio", "minimum", "liquidity", "risk"] },
  ETFs: { Research: defaults.ETFs, Performance: ["primary", "aum", "perf1", "perf3"], Income: ["primary", "aum", "perf1", "secYield", "expenseRatio"], Risk: ["primary", "aum", "perf1", "risk", "assetClass"], "Cost & implementation": ["primary", "aum", "expenseRatio", "liquidity", "risk"] },
  SMAs: { Research: defaults.SMAs, Performance: ["primary", "perf1", "perf3", "risk"], Risk: ["primary", "perf1", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "minimum", "managerFee", "liquidity", "risk"] },
  "Fixed Income": { Research: defaults["Fixed Income"], Performance: ["primary", "perf1", "risk", "liquidity"], Income: ["primary", "perf1", "yieldToWorst", "creditRating", "minimum"], Risk: ["primary", "perf1", "creditRating", "risk", "liquidity"], "Cost & implementation": ["primary", "minimum", "liquidity", "risk"] },
  Alternatives: { Research: defaults.Alternatives, Performance: ["primary", "perf1", "reportedReturn3Y", "risk"], Risk: ["primary", "perf1", "risk", "reportedLiquidity", "assetClass"], "Cost & implementation": ["primary", "minimum", "fee", "reportedLiquidity", "risk"] },
  Structured: { Research: defaults.Structured, Income: ["primary", "perf1", "contingentCoupon", "term", "risk"], Risk: ["primary", "perf1", "risk", "liquidity", "term"], "Cost & implementation": ["primary", "minimum", "fee", "term", "liquidity"] },
  "Managed Options": { Research: defaults["Managed Options"], Performance: ["primary", "perf1", "perf3", "risk"], Risk: ["primary", "perf1", "risk", "assetClass", "liquidity"], "Cost & implementation": ["primary", "minimum", "annualFee", "liquidity", "risk"] },
  Annuities: { Research: defaults.Annuities, Income: ["primary", "perf1", "guaranteePeriod", "annualFee", "risk"], Risk: ["primary", "perf1", "risk", "guaranteePeriod", "liquidity"], "Cost & implementation": ["primary", "minimum", "annualFee", "guaranteePeriod", "liquidity"] },
  "Precious Metals": { Research: defaults["Precious Metals"], Performance: ["primary", "return1Y", "risk", "assetClass"], Risk: ["primary", "return1Y", "risk", "liquidity", "assetClass"], "Cost & implementation": ["primary", "custodyFee", "minimum", "liquidity", "risk"] },
});

export const PRIMARY_COLUMN_LABELS = Object.freeze({ All: "Market / value", Equities: "Price", "Mutual Funds": "NAV", ETFs: "Price", SMAs: "3Y return", "Fixed Income": "Price", Alternatives: "Reported NAV", Structured: "Indicative value", "Managed Options": "3Y return", Annuities: "Crediting rate", "Precious Metals": "Reference price" });

export function normalizeColumns(category, columns) {
  const safeCategory = CATEGORY_COLUMN_RULES[category] ? category : "All";
  const allowed = new Set(CATEGORY_COLUMN_RULES[safeCategory]);
  const normalized = [...new Set(Array.isArray(columns) ? columns : [])].filter((column) => allowed.has(column)).slice(0, MAX_RESULT_COLUMNS);
  return normalized.length ? normalized : [...CATEGORY_DEFAULT_COLUMNS[safeCategory]];
}

export function columnLabel(category, column) {
  if (column === "primary") return PRIMARY_COLUMN_LABELS[category] || PRIMARY_COLUMN_LABELS.All;
  return COLUMN_DEFINITIONS[column]?.label || column;
}
