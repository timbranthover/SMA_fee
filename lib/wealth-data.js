export const DEFAULT_ADVISOR_ID = "advisor-042";
export const DEFAULT_HOUSEHOLD_ID = "household-morrison";

const projectionCache = new Map();

function requestKey(params) {
  return [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
}

async function fetchProjection(params, { cache = true, signal } = {}) {
  const key = requestKey(params);
  if (cache && projectionCache.has(key)) return projectionCache.get(key);

  const pending = (async () => {
    const response = await fetch(`/api/wealth?${params}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    if (!response.ok) {
      let message = `Wealth data request failed (${response.status})`;
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const payload = await response.json();
    if (payload?.view !== params.get("view") || payload.data === undefined) throw new Error("Invalid wealth data response");
    return payload.data;
  })().catch((error) => {
    if (cache) projectionCache.delete(key);
    throw error;
  });

  if (cache) projectionCache.set(key, pending);
  return pending;
}

export function loadAdvisorBook({ advisorId = DEFAULT_ADVISOR_ID, q = "", focus = "all", sort = "attention", cursor = 0, pageSize = 80, signal } = {}) {
  const params = new URLSearchParams({ view: "book", advisorId, focus, sort, cursor: String(cursor), pageSize: String(pageSize) });
  if (q) params.set("q", q);
  return fetchProjection(params, { cache: false, signal });
}

function householdProjection(householdId, view, entityKey = "", entityId = "") {
  const params = new URLSearchParams({ view, householdId });
  if (entityKey && entityId) params.set(entityKey, entityId);
  return fetchProjection(params);
}

export const loadHouseholdOverview = (householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "overview");
export const loadWealthHistory = (householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "history");
export const loadConcentrationReview = (householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "concentration");
export const loadHouseholdAccount = (accountId, householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "account", "accountId", accountId);
export const loadHouseholdGoal = (goalId, householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "goal", "goalId", goalId);
