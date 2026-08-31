import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "../lib/advisor-book-source.js";
import { createWealthService } from "../lib/wealth-service.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const PROJECTION_VIEWS = new Set(["book", "overview", "history", "concentration", "account", "goal"]);
const BOOK_FOCUS = new Set(["all", "priority", "cash", "goals", "upcoming", "held-away"]);
const BOOK_SORT = new Set(["attention", "net-worth-desc", "cash-desc", "return-desc", "name-asc"]);
const wealthService = createWealthService(ADVISOR_BOOK_DATASET);

function parseId(value, label) {
  const id = String(value || "").trim();
  if (!ID_PATTERN.test(id)) throw new RangeError(`Invalid ${label}`);
  return id;
}

function parseInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function parseHouseholdId(value) {
  return parseId(value, "householdId");
}

export function parseAdvisorId(value = DEFAULT_ADVISOR_ID) {
  return parseId(value || DEFAULT_ADVISOR_ID, "advisorId");
}

export function parseProjectionView(value) {
  const view = String(value || "overview").trim().toLowerCase();
  if (!PROJECTION_VIEWS.has(view)) throw new RangeError("Invalid view");
  return view;
}

export function getWealthProjection(idValue, viewValue = "overview", entityIdValue = "", options = {}) {
  const view = parseProjectionView(viewValue);
  if (view === "book") {
    const advisorId = parseAdvisorId(idValue || DEFAULT_ADVISOR_ID);
    return wealthService.getAdvisorBook(advisorId, options);
  }
  const householdId = parseHouseholdId(idValue);
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
    const view = parseProjectionView(url.searchParams.get("view"));
    let id;
    let data;
    if (view === "book") {
      id = parseAdvisorId(url.searchParams.get("advisorId") || DEFAULT_ADVISOR_ID);
      const focus = String(url.searchParams.get("focus") || "all").toLowerCase();
      const sort = String(url.searchParams.get("sort") || "attention").toLowerCase();
      if (!BOOK_FOCUS.has(focus)) throw new RangeError("Invalid focus");
      if (!BOOK_SORT.has(sort)) throw new RangeError("Invalid sort");
      data = getWealthProjection(id, view, "", {
        query: String(url.searchParams.get("q") || "").slice(0, 120),
        focus,
        sort,
        cursor: parseInteger(url.searchParams.get("cursor"), 0, 0, 1_000_000),
        pageSize: parseInteger(url.searchParams.get("pageSize"), 80, 1, 200),
      });
    } else {
      id = parseHouseholdId(url.searchParams.get("householdId"));
      const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : "";
      data = getWealthProjection(id, view, entityId);
    }
    if (data === null) return response.status(404).json({ error: view === "book" ? "Advisor book not found" : "Household data not found" });

    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Vary", "Cookie, Authorization");
    response.setHeader("Server-Timing", `wealth;dur=${Math.max(0.1, performance.now() - startedAt).toFixed(1)}`);
    return response.status(200).json({ schemaVersion: wealthService.schemaVersion, id, view, data });
  } catch (error) {
    return response.status(error instanceof RangeError ? 400 : 500).json({ error: error.message });
  }
}