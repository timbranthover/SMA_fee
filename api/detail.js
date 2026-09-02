import { getInvestmentDetail } from "../lib/catalog.js";
import { enrichDetailWithMarketData } from "../lib/detail-market-data.js";

function externalMarketDataEnabled() {
  return process.env.MARKET_DATA_DISABLED !== "1" && process.env.CI !== "true";
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[a-z0-9-]{1,100}$/i.test(id)) return Response.json({ error: "Invalid investment identifier" }, { status: 400 });
    const detail = getInvestmentDetail(id);
    if (!detail) return Response.json({ error: "Investment not found" }, { status: 404 });
    const liveDetail = externalMarketDataEnabled()
      ? await enrichDetailWithMarketData(detail)
      : detail;
    return Response.json(liveDetail, {
      headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=180" },
    });
  },
};
