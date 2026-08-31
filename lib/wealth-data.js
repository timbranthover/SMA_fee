export const DEFAULT_HOUSEHOLD_ID = "household-morrison";

async function fetchHouseholdWorkspace(householdId) {
  const params = new URLSearchParams({ householdId });
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
  if (!payload?.workspace || payload.householdId !== householdId) throw new Error("Invalid household data response");
  return payload.workspace;
}

const defaultWorkspace = await fetchHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);

export const HOUSEHOLD = defaultWorkspace.household;
export const WEALTH_ALLOCATION = defaultWorkspace.allocation;
export const HOUSEHOLD_ACCOUNTS = defaultWorkspace.accounts;
export const HOUSEHOLD_HOLDINGS = defaultWorkspace.holdings;
export const HOUSEHOLD_GOALS = defaultWorkspace.goals;
export const HOUSEHOLD_INSIGHTS = defaultWorkspace.insights;
export const CONCENTRATION_REVIEW = defaultWorkspace.concentrationReview;
export const WEALTH_HISTORY = defaultWorkspace.history;
