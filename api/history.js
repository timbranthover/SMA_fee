import { getComparisonHistory, parseHistoryIds } from "../lib/history.js";

export default {
  fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    try {
      const ids = parseHistoryIds(new URL(request.url).searchParams.get("ids"));
      return Response.json(getComparisonHistory(ids), {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: /not found/i.test(error.message) ? 404 : 400 });
      throw error;
    }
  },
};
