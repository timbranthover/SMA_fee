const MAX_CACHED_PROJECTIONS = 96;
const MAX_LOCAL_PLANS = 100;
const PLAN_STORAGE_KEY = "advisor-decision-plans-v1";
const projectionCache = new Map();

function requestKey(params) {
  return [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
}

function getCachedProjection(key) {
  if (!projectionCache.has(key)) return null;
  const value = projectionCache.get(key);
  projectionCache.delete(key);
  projectionCache.set(key, value);
  return value;
}

function setCachedProjection(key, value) {
  if (projectionCache.has(key)) projectionCache.delete(key);
  projectionCache.set(key, value);
  while (projectionCache.size > MAX_CACHED_PROJECTIONS) projectionCache.delete(projectionCache.keys().next().value);
  return value;
}

async function fetchProjection(params, { cache = true, signal } = {}) {
  const key = requestKey(params);
  if (cache) {
    const cached = getCachedProjection(key);
    if (cached) return cached;
  }
  const pending = (async () => {
    const response = await fetch(`/api/decision?${params}`, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", credentials: "same-origin", signal });
    if (!response.ok) {
      let message = `Decision data request failed (${response.status})`;
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const payload = await response.json();
    if (payload?.view !== params.get("view") || payload.data === undefined) throw new Error("Invalid decision data response");
    return payload.data;
  })().catch((error) => {
    if (cache) projectionCache.delete(key);
    throw error;
  });
  if (cache) setCachedProjection(key, pending);
  return pending;
}

export function loadDecisionSummary(householdId, { signal } = {}) {
  return fetchProjection(new URLSearchParams({ view: "summary", householdId }), { signal });
}

export function loadDecisionDetail(decisionId, householdId, { signal } = {}) {
  return fetchProjection(new URLSearchParams({ view: "detail", householdId, decisionId }), { signal });
}

export function modelDecisionScenario(decisionId, householdId, inputs = {}, { signal } = {}) {
  const params = new URLSearchParams({ view: "scenario", householdId, decisionId });
  for (const [key, value] of Object.entries(inputs)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return fetchProjection(params, { cache: false, signal });
}

export function loadHouseholdTimeline(householdId, { signal } = {}) {
  return fetchProjection(new URLSearchParams({ view: "timeline", householdId }), { signal });
}

export function loadMeetingBrief(householdId, { signal } = {}) {
  return fetchProjection(new URLSearchParams({ view: "meeting", householdId }), { signal });
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const id = String(candidate.id || "").slice(0, 120);
  const name = String(candidate.name || "").slice(0, 180);
  if (!id || !name) return null;
  return { id, name, symbol: String(candidate.symbol || "").slice(0, 24), category: String(candidate.category || "").slice(0, 80) };
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  const decisionId = String(plan.decisionId || "").slice(0, 120);
  const householdId = String(plan.householdId || "").slice(0, 120);
  if (!decisionId || !householdId) return null;
  const steps = Array.isArray(plan.steps) ? plan.steps.slice(0, 20).map((step, index) => ({ id: String(step?.id || `step-${index + 1}`).slice(0, 80), title: String(step?.title || "Action").slice(0, 240), complete: Boolean(step?.complete) })) : [];
  const candidates = Array.isArray(plan.candidates) ? plan.candidates.map(normalizeCandidate).filter(Boolean).slice(0, 8) : [];
  return {
    decisionId,
    householdId,
    title: String(plan.title || "Decision plan").slice(0, 240),
    objective: String(plan.objective || "").slice(0, 500),
    status: String(plan.status || "Plan drafted").slice(0, 80),
    createdAt: String(plan.createdAt || new Date().toISOString()).slice(0, 40),
    updatedAt: String(plan.updatedAt || new Date().toISOString()).slice(0, 40),
    implementationAmount: Number.isFinite(Number(plan.implementationAmount)) ? Number(plan.implementationAmount) : 0,
    steps,
    candidates,
  };
}

export function listDecisionPlans() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY));
    return Array.isArray(raw) ? raw.map(normalizePlan).filter(Boolean).slice(0, MAX_LOCAL_PLANS) : [];
  } catch { return []; }
}

function writePlans(plans) {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans.map(normalizePlan).filter(Boolean).slice(0, MAX_LOCAL_PLANS)));
}

export function getDecisionPlan(decisionId) {
  return listDecisionPlans().find((plan) => plan.decisionId === decisionId) || null;
}

export function getHouseholdPlanSummary(householdId) {
  const plans = listDecisionPlans().filter((plan) => plan.householdId === householdId);
  if (!plans.length) return null;
  const active = plans.find((plan) => plan.status !== "Complete") || plans[0];
  return { count: plans.length, status: active.status, title: active.title, decisionId: active.decisionId };
}

export function saveDecisionPlan({ decision, householdId, steps = [], implementationAmount = 0 }) {
  const plans = listDecisionPlans();
  const existing = plans.find((plan) => plan.decisionId === decision.id);
  const now = new Date().toISOString();
  const next = normalizePlan({
    decisionId: decision.id,
    householdId,
    title: decision.title,
    objective: decision.objective,
    status: existing?.status || "Plan drafted",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    implementationAmount,
    steps: existing?.steps?.length ? existing.steps : steps.map((step) => ({ ...step, complete: false })),
    candidates: existing?.candidates || [],
  });
  writePlans([next, ...plans.filter((plan) => plan.decisionId !== decision.id)]);
  return next;
}

export function setDecisionPlanStatus(decisionId, status) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const next = normalizePlan({ ...plan, status, updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}

export function toggleDecisionPlanStep(decisionId, stepId) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const steps = plan.steps.map((step) => step.id === stepId ? { ...step, complete: !step.complete } : step);
  const allComplete = steps.length > 0 && steps.every((step) => step.complete);
  const next = normalizePlan({ ...plan, steps, status: allComplete ? "Complete" : plan.status === "Complete" ? "In progress" : plan.status, updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}

export function addDecisionCandidates(decisionId, candidates) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const nextCandidates = [...plan.candidates, ...(candidates || []).map(normalizeCandidate).filter(Boolean)];
  const deduped = [...new Map(nextCandidates.map((candidate) => [candidate.id, candidate])).values()].slice(0, 8);
  const next = normalizePlan({ ...plan, candidates: deduped, status: plan.status === "Plan drafted" ? "Client discussion" : plan.status, updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}
