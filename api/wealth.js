import { MORRISON_WEALTH_DATASET } from "../lib/wealth-source.js";
import { createWealthService } from "../lib/wealth-service.js";

const HOUSEHOLD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const wealthService = createWealthService(MORRISON_WEALTH_DATASET);

export function parseHouseholdId(value) {
  const householdId = String(value || "").trim();
  if (!HOUSEHOLD_ID_PATTERN.test(householdId)) throw new RangeError("Invalid householdId");
  return householdId;
}

export function getHouseholdProjection(householdId) {
  return wealthService.getHouseholdWorkspace(parseHouseholdId(householdId));
}

export default async function handler(request, response) {
  if (request.method && request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const url = new URL(request.url, "http://localhost");
    const householdId = parseHouseholdId(url.searchParams.get("householdId"));
    const workspace = wealthService.getHouseholdWorkspace(householdId);
    if (!workspace) return response.status(404).json({ error: "Household not found" });

    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Vary", "Cookie, Authorization");
    return response.status(200).json({ schemaVersion: wealthService.schemaVersion, householdId, workspace });
  } catch (error) {
    return response.status(error instanceof RangeError ? 400 : 500).json({ error: error.message });
  }
}
