import { getInvestmentDetail } from "../lib/catalog.js";

export default {
  fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[a-z0-9-]{1,100}$/i.test(id)) return Response.json({ error: "Invalid investment identifier" }, { status: 400 });
    const detail = getInvestmentDetail(id);
    if (!detail) return Response.json({ error: "Investment not found" }, { status: 404 });
    return Response.json(detail, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  },
};
