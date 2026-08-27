import { searchCatalog } from "../lib/catalog.js";

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
    maxMinimum: numericParam(query.maxMinimum),
    maxFee: numericParam(query.maxFee),
    location: query.location ? String(query.location) : undefined,
    sort: String(query.sort || "relevance"),
    cursor: numericParam(query.cursor) ?? 0,
    pageSize: numericParam(query.pageSize) ?? 25,
  };
}

export default {
  fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    try {
      const query = Object.fromEntries(new URL(request.url).searchParams.entries());
      const result = searchCatalog(inputFromQuery(query));
      return Response.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Server-Timing": `search;dur=${result.tookMs}`,
        },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  },
};
