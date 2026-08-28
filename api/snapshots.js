import { getMarketSnapshots } from "../lib/catalog.js";

export function parseSnapshotIds(value) {
  const ids = [...new Set(String(value || "").split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) throw new RangeError("At least one investment ID is required");
  if (ids.length > 25) throw new RangeError("A maximum of 25 investment IDs is allowed");
  if (ids.some((id) => !/^[a-z0-9-]{1,80}$/i.test(id))) throw new RangeError("Invalid investment ID");
  return ids;
}

export default {
  fetch(request) {
    if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    try {
      const ids = parseSnapshotIds(new URL(request.url).searchParams.get("ids"));
      return Response.json({ snapshots: getMarketSnapshots(ids) }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    } catch (error) {
      if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  },
};
