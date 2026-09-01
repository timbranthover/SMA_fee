import { getInvestmentDetail, getMarketSnapshots } from "../lib/catalog.js";
import { applyQuoteToSnapshot, getLiveQuotes } from "../lib/market-data.js";

function externalMarketDataEnabled() {
  return process.env.MARKET_DATA_DISABLED !== "1" && process.env.CI !== "true";
}

export function parseSnapshotIds(value) {
  const ids = [...new Set(String(value || "").split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) throw new RangeError("At least one investment ID is required");
  if (ids.length > 25) throw new RangeError("A maximum of 25 investment IDs is allowed");
  if (ids.some((id) => !/^[a-z0-9-]{1,80}$/i.test(id))) throw new RangeError("Invalid investment ID");
  return ids;
}

export default {
  async fetch(request) {
    if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    try {
      const ids = parseSnapshotIds(new URL(request.url).searchParams.get("ids"));
      const snapshots = getMarketSnapshots(ids);
      if (externalMarketDataEnabled()) {
        const details = ids.map((id) => getInvestmentDetail(id)).filter(Boolean);
        const quotes = await getLiveQuotes(details);
        for (const detail of details) {
          const quote = quotes.get(detail.id);
          if (quote && snapshots[detail.id]) snapshots[detail.id] = applyQuoteToSnapshot(snapshots[detail.id], quote);
        }
      }
      return Response.json({ snapshots }, {
        headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=180" },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  },
};