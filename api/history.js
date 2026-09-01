import { getComparisonHistory, parseHistoryIds } from "../lib/history.js";
import { getDailyHistory } from "../lib/market-data.js";

function externalMarketDataEnabled() {
  return process.env.MARKET_DATA_DISABLED !== "1" && process.env.CI !== "true";
}

async function realSeriesOrFallback(series) {
  if (!["Equities", "ETFs"].includes(series.category)) return series;
  const history = await getDailyHistory(series.symbol);
  if (!history) return series;
  return {
    ...series,
    frequency: history.frequency,
    points: history.points,
  };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    try {
      const ids = parseHistoryIds(new URL(request.url).searchParams.get("ids"));
      const base = getComparisonHistory(ids);
      if (!externalMarketDataEnabled()) {
        return Response.json(base, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
      }
      const series = await Promise.all(base.series.map(realSeriesOrFallback));
      const benchmarkHistory = await getDailyHistory("^GSPC");
      const benchmark = benchmarkHistory
        ? { ...base.benchmark, frequency: benchmarkHistory.frequency, points: benchmarkHistory.points }
        : base.benchmark;
      const realSeriesCount = series.filter((row) => row.frequency.startsWith("Yahoo Finance")).length;
      const latestDates = [benchmarkHistory?.asOf, ...series.map((row) => row.points?.at(-1)?.time)].filter(Boolean).sort();
      return Response.json({
        ...base,
        asOf: latestDates.at(-1) || base.asOf,
        methodology: realSeriesCount
          ? "Equity and ETF paths use Yahoo Finance daily adjusted-close history; non-market vehicles remain illustrative. Series are normalized to 0% for the selected period in the browser."
          : base.methodology,
        series,
        benchmark,
      }, {
        headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: /not found/i.test(error.message) ? 404 : 400 });
      throw error;
    }
  },
};