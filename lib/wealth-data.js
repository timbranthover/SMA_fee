export const DEFAULT_HOUSEHOLD_ID = "household-morrison";

const projectionCache = new Map();

function projectionKey(view, entityId = "") {
  return `${DEFAULT_HOUSEHOLD_ID}\u001f${view}\u001f${entityId}`;
}

function fetchProjection(view, entityId = "") {
  const key = projectionKey(view, entityId);
  if (projectionCache.has(key)) return projectionCache.get(key);

  const pending = (async () => {
    const params = new URLSearchParams({ householdId: DEFAULT_HOUSEHOLD_ID, view });
    if (view === "account") params.set("accountId", entityId);
    if (view === "goal") params.set("goalId", entityId);
    const response = await fetch(`/api/wealth?${params}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) {
      let message = `Household data request failed (${response.status})`;
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const payload = await response.json();
    if (payload?.householdId !== DEFAULT_HOUSEHOLD_ID || payload?.view !== view || payload.data === undefined) throw new Error("Invalid household data response");
    return payload.data;
  })().catch((error) => {
    projectionCache.delete(key);
    throw error;
  });

  projectionCache.set(key, pending);
  return pending;
}

const defaultOverview = await fetchProjection("overview");

export const HOUSEHOLD = defaultOverview.household;
export const WEALTH_ALLOCATION = defaultOverview.allocation;
export const HOUSEHOLD_ACCOUNTS = defaultOverview.accounts;
export const HOUSEHOLD_HOLDINGS = defaultOverview.holdings;
export const HOUSEHOLD_GOALS = defaultOverview.goals;
export const HOUSEHOLD_INSIGHTS = defaultOverview.insights;

export const loadWealthHistory = () => fetchProjection("history");
export const loadConcentrationReview = () => fetchProjection("concentration");
export const loadHouseholdAccount = (accountId) => fetchProjection("account", accountId);
export const loadHouseholdGoal = (goalId) => fetchProjection("goal", goalId);
