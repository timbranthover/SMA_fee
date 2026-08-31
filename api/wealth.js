import { MORRISON_WEALTH_DATASET } from "../lib/wealth-source.js";
import { createWealthService } from "../lib/wealth-service.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const PROJECTION_VIEWS = new Set(["overview", "history", "concentration", "account", "goal"]);
const wealthService = createWealthService(MORRISON_WEALTH_DATASET);

function parseId(value, label) {
  const id = String(value || "").trim();
  if (!ID_PATTERN.test(id)) throw new RangeError(`Invalid ${label}`);
  return id;
}

export function parseHouseholdId(value) {
  return parseId(value, "householdId");
}

export function parseProjectionView(value) {
  const view = String(value || "overview").trim().toLowerCase();
  if (!PROJECTION_VIEWS.has(view)) throw new RangeError("Invalid view");
  return view;
}

export function getWealthProjection(householdIdValue, viewValue = "overview", entityIdValue = "") {
  const householdId = parseHouseholdId(householdIdValue);
  const view = parseProjectionView(viewValue);
  if (view === "overview") return wealthService.getHouseholdOverview(householdId);
  if (view === "history") return wealthService.getHouseholdHistory(householdId);
  if (view === "concentration") return wealthService.getHouseholdConcentrationReview(householdId);
  if (view === "account") return wealthService.getHouseholdAccount(householdId, parseId(entityIdValue, "accountId"));
  return wealthService.getHouseholdGoal(householdId, parseId(entityIdValue, "goalId"));
}

export default async function handler(request, response) {
  if (request.method && request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const startedAt = performance.now();
  try {
    const url = new URL(request.url, "http://localhost");
    const householdId = parseHouseholdId(url.searchParams.get("householdId"));
    const view = parseProjectionView(url.searchParams.get("view"));
    const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : "";
    const data = getWealthProjection(householdId, view, entityId);
    if (data === null) return response.status(404).json({ error: "Household data not found" });

    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Vary", "Cookie, Authorization");
    response.setHeader("Server-Timing", `wealth;dur=${Math.max(0.1, performance.now() - startedAt).toFixed(1)}`);
    return response.status(200).json({ schemaVersion: wealthService.schemaVersion, householdId, view, data });
  } catch (error) {
    return response.status(error instanceof RangeError ? 400 : 500).json({ error: error.message });
  }
}
