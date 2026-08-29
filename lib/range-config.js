const definition = (field, label, format, step, digits = 1) => Object.freeze({ field, label, format, step, digits });

export const RANGE_FILTERS = Object.freeze({
  minimum: Object.freeze({ format: "currency", step: 1000, digits: 0 }),
  fee: Object.freeze({ format: "percent", step: 0.05, digits: 2 }),
  perf1: Object.freeze({ format: "percent", step: 0.5, digits: 1 }),
  perf3: Object.freeze({ format: "percent", step: 0.5, digits: 1 }),
  forwardPE: Object.freeze({ format: "multiple", step: 0.5, digits: 1 }),
  dividendYield: Object.freeze({ format: "percent", step: 0.1, digits: 1 }),
  secYield: Object.freeze({ format: "percent", step: 0.1, digits: 1 }),
  yieldToWorst: Object.freeze({ format: "percent", step: 0.1, digits: 1 }),
  contingentCoupon: Object.freeze({ format: "percent", step: 0.25, digits: 2 }),
  term: Object.freeze({ format: "months", step: 1, digits: 0 }),
  guaranteePeriod: Object.freeze({ format: "years", step: 1, digits: 0 }),
});

export const CATEGORY_RANGE_FILTERS = Object.freeze({
  All: Object.freeze([
    definition("fee", "Fees", "percent", 0.05, 2),
    definition("minimum", "Investment minimum", "currency", 1000, 0),
  ]),
  Equities: Object.freeze([
    definition("forwardPE", "Forward P/E", "multiple", 0.5, 1),
    definition("dividendYield", "Dividend yield", "percent", 0.1, 1),
    definition("perf1", "1-year return", "percent", 0.5, 1),
  ]),
  "Mutual Funds": Object.freeze([
    definition("fee", "Expense ratio", "percent", 0.05, 2),
    definition("secYield", "30-day SEC yield", "percent", 0.1, 1),
    definition("perf1", "1-year return", "percent", 0.5, 1),
    definition("minimum", "Investment minimum", "currency", 1000, 0),
  ]),
  ETFs: Object.freeze([
    definition("fee", "Expense ratio", "percent", 0.05, 2),
    definition("secYield", "30-day SEC yield", "percent", 0.1, 1),
    definition("perf1", "1-year return", "percent", 0.5, 1),
  ]),
  SMAs: Object.freeze([
    definition("minimum", "Investment minimum", "currency", 25000, 0),
    definition("fee", "Manager fee", "percent", 0.05, 2),
    definition("perf3", "3-year composite", "percent", 0.5, 1),
  ]),
  "Fixed Income": Object.freeze([
    definition("yieldToWorst", "Yield to worst", "percent", 0.1, 1),
    definition("minimum", "Investment minimum", "currency", 1000, 0),
    definition("perf1", "1-year price return", "percent", 0.5, 1),
  ]),
  Alternatives: Object.freeze([
    definition("minimum", "Investment minimum", "currency", 25000, 0),
    definition("fee", "Management fee", "percent", 0.05, 2),
    definition("perf1", "1-year reported return", "percent", 0.5, 1),
  ]),
  Structured: Object.freeze([
    definition("contingentCoupon", "Contingent coupon", "percent", 0.25, 2),
    definition("term", "Term", "months", 1, 0),
    definition("minimum", "Investment minimum", "currency", 1000, 0),
  ]),
  "Managed Options": Object.freeze([
    definition("minimum", "Investment minimum", "currency", 25000, 0),
    definition("fee", "Annual fee", "percent", 0.05, 2),
    definition("perf3", "3-year composite", "percent", 0.5, 1),
  ]),
  Annuities: Object.freeze([
    definition("guaranteePeriod", "Guarantee period", "years", 1, 0),
    definition("minimum", "Investment minimum", "currency", 5000, 0),
    definition("fee", "Annual fee", "percent", 0.05, 2),
  ]),
  "Precious Metals": Object.freeze([
    definition("perf1", "1-year return", "percent", 0.5, 1),
    definition("fee", "Custody fee", "percent", 0.05, 2),
    definition("minimum", "Investment minimum", "currency", 1000, 0),
  ]),
});

export function rangeDefinitions(category = "All") {
  return CATEGORY_RANGE_FILTERS[category] || CATEGORY_RANGE_FILTERS.All;
}

export function isRangeAllowed(field, category = "All") {
  return rangeDefinitions(category).some((definition) => definition.field === field);
}

export function normalizeRanges(input = {}, category = "All") {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const allowed = new Set(rangeDefinitions(category).map(({ field }) => field));
  const normalized = {};
  for (const [field, bounds] of Object.entries(input)) {
    if (!allowed.has(field) || !bounds || typeof bounds !== "object") continue;
    const minimum = bounds.min === undefined || bounds.min === null || bounds.min === "" ? undefined : Number(bounds.min);
    const maximum = bounds.max === undefined || bounds.max === null || bounds.max === "" ? undefined : Number(bounds.max);
    if ((minimum !== undefined && !Number.isFinite(minimum)) || (maximum !== undefined && !Number.isFinite(maximum))) continue;
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) continue;
    if (minimum !== undefined || maximum !== undefined) normalized[field] = { ...(minimum !== undefined ? { min: minimum } : {}), ...(maximum !== undefined ? { max: maximum } : {}) };
  }
  return normalized;
}

export function serializeRanges(ranges = {}) {
  return Object.entries(ranges)
    .filter(([, bounds]) => bounds && (Number.isFinite(bounds.min) || Number.isFinite(bounds.max)))
    .map(([field, bounds]) => `${field}:${Number.isFinite(bounds.min) ? bounds.min : ""}:${Number.isFinite(bounds.max) ? bounds.max : ""}`)
    .join(";");
}

export function parseRanges(value = "") {
  const ranges = {};
  for (const entry of String(value).split(";")) {
    if (!entry) continue;
    const [field, rawMinimum = "", rawMaximum = ""] = entry.split(":");
    if (!field) continue;
    const minimum = rawMinimum === "" ? undefined : Number(rawMinimum);
    const maximum = rawMaximum === "" ? undefined : Number(rawMaximum);
    if ((minimum !== undefined && !Number.isFinite(minimum)) || (maximum !== undefined && !Number.isFinite(maximum))) continue;
    ranges[field] = { ...(minimum !== undefined ? { min: minimum } : {}), ...(maximum !== undefined ? { max: maximum } : {}) };
  }
  return ranges;
}
