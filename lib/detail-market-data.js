import { applyQuoteToDetail, getLiveMetrics, getLiveQuote } from "./market-data.js";

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function signedPercent(value, digits = 1) {
  const number = finite(value);
  return number === null ? null : `${number >= 0 ? "+" : ""}${number.toFixed(digits)}%`;
}

function percentText(value) {
  const number = finite(value);
  return number === null ? null : `${number.toFixed(2)}%`;
}

function multipleText(value) {
  const number = finite(value);
  return number === null ? null : `${number.toFixed(1)}×`;
}

function compactMoney(value, currency = "USD") {
  const number = finite(value);
  if (number === null) return null;
  const absolute = Math.abs(number);
  const sign = number < 0 ? "−" : "";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const unit = units.find(([size]) => absolute >= size);
  if (!unit) return `${sign}${prefix}${Math.round(absolute).toLocaleString("en-US")}`;
  const scaled = absolute / unit[0];
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${sign}${prefix}${scaled.toFixed(digits).replace(/\.0+$|(?<=\.\d)0$/, "")}${unit[1]}`;
}

function updateFact(facts, label, value) {
  if (!value || !Array.isArray(facts)) return facts;
  return facts.map((fact) => fact?.label === label ? { ...fact, value } : fact);
}

function updatePerformanceRows(rows, perf1, perf3) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (row?.period === "1 year" && perf1 !== null) return { ...row, investment: perf1 };
    if (row?.period === "3 years" && perf3 !== null) return { ...row, investment: perf3 };
    return row;
  });
}

export function applyMetricsToDetail(detail, metrics) {
  if (!detail || !metrics || !["Equities", "ETFs"].includes(detail.category)) return detail;
  const perf1 = finite(metrics.perf1);
  const perf3 = finite(metrics.perf3);
  let keyFacts = detail.profile?.keyFacts;
  const live = { ...(detail.live || {}) };
  const root = {};

  if (perf1 !== null) { root.perf1 = perf1; live.perf1 = perf1; }
  if (perf3 !== null) { root.perf3 = perf3; live.perf3 = perf3; }

  if (detail.category === "Equities") {
    const marketCap = compactMoney(metrics.marketCap, metrics.currency);
    const forwardPE = multipleText(metrics.forwardPE);
    const dividendYield = percentText(metrics.dividendYield);
    if (marketCap) {
      root.aum = `${marketCap} market cap`;
      live.marketCap = Number(metrics.marketCap);
      keyFacts = updateFact(keyFacts, "Market capitalization", marketCap);
    }
    if (forwardPE) {
      live.forwardPE = Number(metrics.forwardPE);
      keyFacts = updateFact(keyFacts, "P/E (forward)", forwardPE);
    }
    if (dividendYield) {
      live.dividendYield = Number(metrics.dividendYield);
      keyFacts = updateFact(keyFacts, "Dividend yield", dividendYield);
    }
  }

  if (detail.category === "ETFs") {
    const netAssets = compactMoney(metrics.netAssets, metrics.currency);
    const expenseRatio = percentText(metrics.expenseRatio);
    if (netAssets) {
      root.aum = netAssets;
      live.aum = Number(metrics.netAssets);
      keyFacts = updateFact(keyFacts, "Net assets", netAssets);
    }
    if (expenseRatio) {
      root.fee = Number(metrics.expenseRatio);
      live.expenseRatio = Number(metrics.expenseRatio);
      keyFacts = updateFact(keyFacts, "Expense ratio", expenseRatio);
    }
  }

  const performance = detail.profile?.performance
    ? {
        ...detail.profile.performance,
        subtitle: perf1 !== null || perf3 !== null
          ? "Live 1Y total / 3Y annualized returns · longer periods illustrative"
          : detail.profile.performance.subtitle,
        rows: updatePerformanceRows(detail.profile.performance.rows, perf1, perf3),
      }
    : detail.profile?.performance;

  return {
    ...detail,
    ...root,
    live,
    profile: {
      ...detail.profile,
      keyFacts,
      performance,
    },
  };
}

export async function enrichDetailWithMarketData(detail, options = {}) {
  if (!detail || !["Equities", "ETFs"].includes(detail.category) || !detail.symbol) return detail;
  const [quoteResult, metricsResult] = await Promise.allSettled([
    getLiveQuote(detail.symbol, options),
    getLiveMetrics([detail], options),
  ]);
  const quote = quoteResult.status === "fulfilled" ? quoteResult.value : null;
  const metrics = metricsResult.status === "fulfilled" ? metricsResult.value.get(detail.id) : null;
  let enriched = quote ? applyQuoteToDetail(detail, quote) : detail;
  if (metrics) enriched = applyMetricsToDetail(enriched, metrics);
  if (quote?.price !== null && quote?.price !== undefined) {
    enriched = { ...enriched, live: { ...(enriched.live || {}), primary: Number(quote.price) } };
  }
  return enriched;
}
