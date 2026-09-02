import { getSearchIndex, searchCatalog } from "../lib/catalog.js";
import { getLiveGlobalSortValues, isLiveGlobalSortField } from "../lib/market-data.js";
import { parseRanges } from "../lib/range-config.js";
import { parseSort } from "../lib/sort-config.js";

function arrayParam(value) {
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function numericParam(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return parsed;
}

export function inputFromQuery(query = {}) {
  return {
    q: String(query.q || ""),
    category: String(query.category || "All"),
    flags: arrayParam(query.flags),
    risks: arrayParam(query.risks),
    statuses: arrayParam(query.statuses),
    ranges: parseRanges(query.ranges),
    maxMinimum: numericParam(query.maxMinimum),
    maxFee: numericParam(query.maxFee),
    location: query.location ? String(query.location) : undefined,
    sort: query.sort ? String(query.sort) : undefined,
    cursor: numericParam(query.cursor) ?? 0,
    pageSize: numericParam(query.pageSize) ?? 25,
  };
}

function externalMarketDataEnabled() {
  return process.env.MARKET_DATA_DISABLED !== "1" && process.env.CI !== "true";
}

const liveSortUniverseCache = new Map();
function liveSortUniverse(category) {
  if (!liveSortUniverseCache.has(category)) {
    liveSortUniverseCache.set(category, getSearchIndex(category).filter((item) => item?.symbol && !String(item.id).startsWith("syn-") && (category !== "Equities" || item.assetClass !== "OTC Equity")));
  }
  return liveSortUniverseCache.get(category);
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    try {
      const query = Object.fromEntries(new URL(request.url).searchParams.entries());
      const input = inputFromQuery(query);
      const parsedSort = parseSort(input.sort);
      let liveSortValues = null;
      let liveSortUsed = false;
      let liveSortMs = 0;
      if (externalMarketDataEnabled() && parsedSort && isLiveGlobalSortField(input.category, parsedSort.field)) {
        const universe = liveSortUniverse(input.category);
        const liveSortStarted = performance.now();
        const values = await getLiveGlobalSortValues(universe, input.category, parsedSort.field);
        liveSortMs = Math.max(1, Math.round(performance.now() - liveSortStarted));
        if (values?.size >= 2) {
          liveSortValues = values;
          liveSortUsed = true;
        }
      }
      const result = searchCatalog(input, { liveSortValues });
      return Response.json({ ...result, sortData: liveSortUsed ? "Yahoo Finance quote index" : "catalog" }, {
        headers: {
          "Cache-Control": liveSortUsed ? "public, s-maxage=60, stale-while-revalidate=300" : "public, s-maxage=3600, stale-while-revalidate=86400",
          "Server-Timing": liveSortUsed ? `search;dur=${result.tookMs}, market-sort;dur=${liveSortMs}` : `search;dur=${result.tookMs}`,
        },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  },
};
