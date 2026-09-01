const definition = (field, label, preferredDirection = "desc") => Object.freeze({ field, label, preferredDirection });

const CATEGORY_SORTABLE_COLUMNS = Object.freeze({
  All: Object.freeze({}),
  Equities: Object.freeze({
    primary: definition("primary", "Price"),
    marketCap: definition("marketCap", "Market cap"),
    forwardPE: definition("forwardPE", "Forward P/E", "asc"),
    dividendYield: definition("dividendYield", "Dividend yield"),
    perf1: definition("perf1", "1Y return"),
    perf3: definition("perf3", "3Y return"),
  }),
  "Mutual Funds": Object.freeze({
    primary: definition("primary", "NAV"),
    secYield: definition("secYield", "30-day SEC yield"),
    expenseRatio: definition("expenseRatio", "Expense ratio", "asc"),
    minimum: definition("minimum", "Minimum", "asc"),
    perf1: definition("perf1", "1Y return"),
    perf3: definition("perf3", "3Y return"),
  }),
  ETFs: Object.freeze({
    primary: definition("primary", "Price"),
    aum: definition("aum", "AUM"),
    secYield: definition("secYield", "30-day SEC yield"),
    expenseRatio: definition("expenseRatio", "Expense ratio", "asc"),
    perf1: definition("perf1", "1Y return"),
    perf3: definition("perf3", "3Y return"),
  }),
  SMAs: Object.freeze({
    primary: definition("primary", "3Y return"),
    minimum: definition("minimum", "Minimum", "asc"),
    managerFee: definition("managerFee", "Manager fee", "asc"),
    perf1: definition("perf1", "1Y return"),
    perf3: definition("perf3", "3Y return"),
  }),
  "Fixed Income": Object.freeze({
    primary: definition("primary", "Price"),
    yieldToWorst: definition("yieldToWorst", "Yield to worst"),
    creditRating: definition("creditRating", "Credit rating"),
    minimum: definition("minimum", "Minimum", "asc"),
    perf1: definition("perf1", "1Y price return"),
  }),
  Alternatives: Object.freeze({
    primary: definition("primary", "Reported NAV"),
    reportedReturn3Y: definition("reportedReturn3Y", "3Y annualized"),
    minimum: definition("minimum", "Minimum", "asc"),
    fee: definition("fee", "Annual fee", "asc"),
    perf1: definition("perf1", "1Y reported return"),
  }),
  Structured: Object.freeze({
    primary: definition("primary", "Indicative value"),
    perf1: definition("perf1", "1Y return"),
    contingentCoupon: definition("contingentCoupon", "Contingent coupon"),
    term: definition("term", "Term", "asc"),
    minimum: definition("minimum", "Minimum", "asc"),
    fee: definition("fee", "Annual fee", "asc"),
  }),
  "Managed Options": Object.freeze({
    primary: definition("primary", "3Y return"),
    minimum: definition("minimum", "Minimum", "asc"),
    annualFee: definition("annualFee", "Annual fee", "asc"),
    perf1: definition("perf1", "1Y return"),
    perf3: definition("perf3", "3Y return"),
  }),
  Annuities: Object.freeze({
    primary: definition("primary", "Crediting rate"),
    guaranteePeriod: definition("guaranteePeriod", "Guarantee period"),
    annualFee: definition("annualFee", "Annual fee", "asc"),
    minimum: definition("minimum", "Minimum", "asc"),
    perf1: definition("perf1", "1Y return"),
  }),
  "Precious Metals": Object.freeze({
    primary: definition("primary", "Reference price"),
    return1Y: definition("return1Y", "1Y return"),
    custodyFee: definition("custodyFee", "Custody fee", "asc"),
    minimum: definition("minimum", "Minimum", "asc"),
  }),
});

const sortFields = new Set(["name", ...Object.values(CATEGORY_SORTABLE_COLUMNS).flatMap((columns) => Object.values(columns).map(({ field }) => field))]);
export const SORTS = Object.freeze(["relevance", ...[...sortFields].flatMap((field) => [`${field}-asc`, `${field}-desc`])]);

export function defaultSort(hasQuery) {
  return hasQuery ? "relevance" : "name-asc";
}

export function parseSort(sort) {
  if (sort === "relevance") return { field: "relevance", direction: "desc" };
  const match = String(sort || "").match(/^(.+)-(asc|desc)$/);
  return match ? { field: match[1], direction: match[2] } : null;
}

export function sortableColumn(category, column) {
  return CATEGORY_SORTABLE_COLUMNS[category]?.[column] || null;
}

export function isSortAllowed(sort, category, hasQuery) {
  if (sort === "relevance") return Boolean(hasQuery);
  const parsed = parseSort(sort);
  if (!parsed || parsed.field === "relevance") return false;
  if (parsed.field === "name") return true;
  return Object.values(CATEGORY_SORTABLE_COLUMNS[category] || {}).some(({ field }) => field === parsed.field);
}

function directionLabel(direction) {
  return direction === "asc" ? "low to high" : "high to low";
}

export function sortLabel(sort, category) {
  if (sort === "relevance") return "Best match";
  const parsed = parseSort(sort);
  if (!parsed) return "Name A–Z";
  if (parsed.field === "name") return parsed.direction === "asc" ? "Name A–Z" : "Name Z–A";
  const entry = Object.values(CATEGORY_SORTABLE_COLUMNS[category] || {}).find(({ field }) => field === parsed.field);
  return entry ? `${entry.label} · ${directionLabel(parsed.direction)}` : sort;
}

export function sortOptions(category, columns, hasQuery) {
  const options = [];
  if (hasQuery) options.push({ value: "relevance", label: "Best match" });
  options.push({ value: "name-asc", label: "Name A–Z" }, { value: "name-desc", label: "Name Z–A" });
  const seen = new Set(["name"]);
  for (const column of columns || []) {
    const entry = sortableColumn(category, column);
    if (!entry || seen.has(entry.field)) continue;
    seen.add(entry.field);
    const directions = entry.preferredDirection === "asc" ? ["asc", "desc"] : ["desc", "asc"];
    for (const direction of directions) {
      const value = `${entry.field}-${direction}`;
      options.push({ value, label: sortLabel(value, category) });
    }
  }
  return options;
}

export function headerSort(category, column, currentSort) {
  const entry = column === "investment" ? definition("name", "Investment", "asc") : sortableColumn(category, column);
  if (!entry) return null;
  const parsed = parseSort(currentSort);
  const active = parsed?.field === entry.field;
  const direction = active ? parsed.direction : null;
  const nextDirection = active ? (direction === "asc" ? "desc" : "asc") : entry.preferredDirection;
  return { ...entry, active, direction, nextSort: `${entry.field}-${nextDirection}` };
}

const LIVE_SORT_FIELDS = Object.freeze({
  Equities: new Set(["primary", "marketCap", "forwardPE", "dividendYield", "perf1", "perf3"]),
  ETFs: new Set(["primary", "aum", "expenseRatio", "perf1", "perf3"]),
});

export function sortLoadedItems(items, sort, category) {
  const parsed = parseSort(sort);
  const liveFields = LIVE_SORT_FIELDS[category];
  if (!parsed || !liveFields?.has(parsed.field)) return items;
  const rows = (items || []).map((item, index) => ({ item, index, value: Number(item.marketSnapshot?.live?.[parsed.field]) }));
  if (rows.filter(({ value }) => Number.isFinite(value)).length < 2) return items;
  const direction = parsed.direction === "asc" ? 1 : -1;
  return rows.sort((left, right) => {
    const leftMissing = !Number.isFinite(left.value);
    const rightMissing = !Number.isFinite(right.value);
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    if (!leftMissing && left.value !== right.value) return (left.value - right.value) * direction;
    return left.index - right.index;
  }).map(({ item }) => item);
}
