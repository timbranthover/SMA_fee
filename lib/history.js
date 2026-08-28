import { getInvestmentDetail } from "./catalog.js";

export const HISTORY_AS_OF = "2026-08-21";
const EARLIEST_HISTORY = "2018-08-21";
const MAX_COMPARISON_SERIES = 4;
const historyCache = new Map();

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcYears(date, years) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function expectedReturn(item, seed) {
  const riskBase = { Conservative: 5.2, Moderate: 9.4, High: 12.8 }[item.risk] || 8;
  const categoryAdjustment = {
    Equities: 2.4,
    "Mutual Funds": 1.2,
    ETFs: 1,
    SMAs: 1.4,
    "Fixed Income": -2.2,
    Alternatives: 0.8,
    Structured: -0.2,
    "Managed Options": 0.5,
    Annuities: -3.2,
    "Precious Metals": 0.4,
  }[item.category] || 0;
  return clamp(riskBase + categoryAdjustment + ((seed % 17) - 8) / 10, -8, 22);
}

function volatilityFor(item, seed) {
  const riskBase = { Conservative: 0.045, Moderate: 0.09, High: 0.15 }[item.risk] || 0.08;
  const categoryScale = {
    Equities: 1.2,
    "Mutual Funds": 0.82,
    ETFs: 0.9,
    SMAs: 0.86,
    "Fixed Income": 0.42,
    Alternatives: 0.72,
    Structured: 0.8,
    "Managed Options": 0.7,
    Annuities: 0.22,
    "Precious Metals": 1.15,
  }[item.category] || 0.8;
  return riskBase * categoryScale * (0.9 + (seed % 19) / 100);
}

function businessDates(start, end) {
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function interpolatedLogValue(anchors, timestamp) {
  let upperIndex = anchors.findIndex((anchor) => anchor.time >= timestamp);
  if (upperIndex <= 0) return Math.log(anchors[0].value);
  if (upperIndex === -1) upperIndex = anchors.length - 1;
  const lower = anchors[upperIndex - 1];
  const upper = anchors[upperIndex];
  const progress = clamp((timestamp - lower.time) / Math.max(1, upper.time - lower.time), 0, 1);
  return Math.log(lower.value) + (Math.log(upper.value) - Math.log(lower.value)) * progress;
}

function anchorSegmentProgress(anchors, timestamp) {
  let upperIndex = anchors.findIndex((anchor) => anchor.time >= timestamp);
  if (upperIndex <= 0) return 0;
  if (upperIndex === -1) upperIndex = anchors.length - 1;
  const lower = anchors[upperIndex - 1];
  const upper = anchors[upperIndex];
  return clamp((timestamp - lower.time) / Math.max(1, upper.time - lower.time), 0, 1);
}

function createSeries(item) {
  const cached = historyCache.get(item.id);
  if (cached) return cached;

  const seed = hash(item.id);
  const end = parseDate(HISTORY_AS_OF);
  const inceptionYear = Number.parseInt(item.inception, 10);
  const inception = Number.isFinite(inceptionYear) ? new Date(Date.UTC(inceptionYear, 0, 2)) : parseDate(EARLIEST_HISTORY);
  const start = inception > parseDate(EARLIEST_HISTORY) ? inception : parseDate(EARLIEST_HISTORY);
  const oneYear = clamp(Number(item.perf1 ?? expectedReturn(item, seed)), -65, 130) / 100;
  const threeYearAnnual = clamp(Number(item.perf3 ?? expectedReturn(item, seed)), -35, 80) / 100;
  const olderAnnual = expectedReturn(item, seed) / 100;
  const endValue = 100;
  const oneYearValue = endValue / Math.max(0.2, 1 + oneYear);
  const threeYearValue = endValue / Math.max(0.08, Math.pow(1 + threeYearAnnual, 3));
  const anchorThree = addUtcYears(end, -3);
  const yearsBeforeThree = Math.max(0, (anchorThree - parseDate(EARLIEST_HISTORY)) / (365.25 * 86400000));
  const earliestValue = threeYearValue / Math.max(0.2, Math.pow(1 + olderAnnual, yearsBeforeThree));
  const anchors = [
    { time: parseDate(EARLIEST_HISTORY).getTime(), value: earliestValue },
    { time: anchorThree.getTime(), value: threeYearValue },
    { time: addUtcYears(end, -1).getTime(), value: oneYearValue },
    { time: end.getTime(), value: endValue },
  ];
  const volatility = volatilityFor(item, seed);
  const points = businessDates(start, end).map((date, index, dates) => {
    const segmentProgress = anchorSegmentProgress(anchors, date.getTime());
    const wave = Math.sin(Math.PI * segmentProgress)
      * (Math.sin(index * 0.071 + (seed % 31)) * volatility * 0.72
        + Math.sin(index * 0.019 + (seed % 13)) * volatility * 0.45
        + Math.sin(index * 0.213 + (seed % 7)) * volatility * 0.16);
    const value = Math.exp(interpolatedLogValue(anchors, date.getTime()) + wave);
    return { time: isoDate(date), value: Number(value.toFixed(4)) };
  });

  const series = {
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    category: item.category,
    frequency: "Illustrative business-day series",
    points,
  };
  historyCache.set(item.id, series);
  return series;
}

const benchmarkItem = {
  id: "benchmark-sp500",
  name: "S&P 500",
  symbol: "S&P 500",
  category: "Benchmark",
  risk: "Moderate",
  inception: "1957",
  perf1: 15.2,
  perf3: 16.4,
};

export function parseHistoryIds(value) {
  const ids = [...new Set(String(value || "").split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) throw new RangeError("Select at least one investment");
  if (ids.length > MAX_COMPARISON_SERIES) throw new RangeError(`Compare no more than ${MAX_COMPARISON_SERIES} investments`);
  if (ids.some((id) => !/^[a-z0-9-]{1,100}$/i.test(id))) throw new RangeError("Invalid investment identifier");
  return ids;
}

export function getComparisonHistory(ids) {
  const series = ids.map((id) => {
    const item = getInvestmentDetail(id);
    if (!item) throw new RangeError(`Investment not found: ${id}`);
    return createSeries(item);
  });
  return {
    asOf: HISTORY_AS_OF,
    methodology: "Deterministic illustrative total-return paths; normalized to 0% for the selected period in the browser.",
    series,
    benchmark: createSeries(benchmarkItem),
  };
}
