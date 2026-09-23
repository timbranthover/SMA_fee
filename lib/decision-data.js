import { getProposal } from "./proposal-data.js";
import { SEEDED_DECISION_PLANS, seededDecisionArtifact } from "./workflow-seeds.js";

const MAX_CACHED_PROJECTIONS = 96;
const MAX_LOCAL_PLANS = 100;
const PLAN_STORAGE_KEY = "advisor-decision-plans-v1";
const TRANSITION_STORAGE_KEY = "advisor-decision-transitions-v1";
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

export async function loadDecisionSummary(householdId, { signal } = {}) {
  const summary = await fetchProjection(new URLSearchParams({ view: "summary", householdId }), { signal });
  const decisions = summary.decisions.map((decision) => ({ ...decision, status: getDecisionWorkflowStatus(decision.id, decision.status) }));
  return { ...summary, decisions, openCount: decisions.filter((decision) => decision.status !== "Complete").length, planCount: decisions.filter((decision) => ["Plan drafted", "Ready for client"].includes(decision.status)).length };
}

export async function loadDecisionDetail(decisionId, householdId, { signal } = {}) {
  const detail = await fetchProjection(new URLSearchParams({ view: "detail", householdId, decisionId }), { signal });
  return { ...detail, decision: { ...detail.decision, status: getDecisionWorkflowStatus(decisionId, detail.decision.status) } };
}

export function modelDecisionScenario(decisionId, householdId, inputs = {}, { signal } = {}) {
  const params = new URLSearchParams({ view: "scenario", householdId, decisionId });
  for (const [key, value] of Object.entries(inputs)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return fetchProjection(params, { cache: false, signal });
}

export async function loadHouseholdTimeline(householdId, { signal } = {}) {
  const timeline = await fetchProjection(new URLSearchParams({ view: "timeline", householdId }), { signal });
  const local = listDecisionTransitions().filter((transition) => transition.householdId === householdId).map((transition) => ({
    id: `local-${transition.decisionId}-${transition.status.toLowerCase().replace(/\s+/g, "-")}`,
    decisionId: transition.decisionId,
    type: transition.type,
    occurredAt: transition.occurredAt.slice(0, 10),
    title: transition.title,
    detail: transition.detail,
    source: "Advisor workflow",
    status: transition.status,
  }));
  const byId = new Map([...timeline, ...local].map((event) => [event.id, event]));
  return [...byId.values()].sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)));
}

export function loadMeetingBrief(householdId, { signal } = {}) {
  return fetchProjection(new URLSearchParams({ view: "meeting", householdId }), { signal });
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const id = String(candidate.id || "").slice(0, 120);
  const name = String(candidate.name || "").slice(0, 180);
  if (!id || !name) return null;
  return { id, name, symbol: String(candidate.symbol || "").slice(0, 24), category: String(candidate.category || "").slice(0, 80), amount: Math.max(0, Math.round(Number(candidate.amount) || 0)) };
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
    kind: String(plan.kind || "investment-basket").slice(0, 80),
    status: String(plan.status || "Plan drafted").slice(0, 80),
    createdAt: String(plan.createdAt || new Date().toISOString()).slice(0, 40),
    updatedAt: String(plan.updatedAt || new Date().toISOString()).slice(0, 40),
    implementationAmount: Number.isFinite(Number(plan.implementationAmount)) ? Number(plan.implementationAmount) : 0,
    sourceAccountName: String(plan.sourceAccountName || "").slice(0, 180),
    dueDate: String(plan.dueDate || "").slice(0, 120),
    steps,
    candidates,
  };
}

export function listDecisionPlans() {
  let stored = [];
  try {
    const raw = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY));
    stored = Array.isArray(raw) ? raw.map(normalizePlan).filter(Boolean).slice(0, MAX_LOCAL_PLANS) : [];
  } catch {}
  const byDecision = new Map(SEEDED_DECISION_PLANS.map((plan) => [plan.decisionId, normalizePlan(plan)]));
  stored.forEach((plan) => byDecision.set(plan.decisionId, plan));
  return [...byDecision.values()].filter(Boolean).slice(0, MAX_LOCAL_PLANS);
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

function normalizeTransition(transition) {
  if (!transition?.decisionId || !transition?.householdId || !transition?.status) return null;
  return {
    decisionId: String(transition.decisionId).slice(0, 120),
    householdId: String(transition.householdId).slice(0, 120),
    status: String(transition.status).slice(0, 80),
    occurredAt: String(transition.occurredAt || new Date().toISOString()).slice(0, 40),
    title: String(transition.title || "Decision updated").slice(0, 240),
    detail: String(transition.detail || "").slice(0, 300),
    type: String(transition.type || "decision").slice(0, 40),
  };
}

export function listDecisionTransitions() {
  try {
    const raw = JSON.parse(localStorage.getItem(TRANSITION_STORAGE_KEY));
    return Array.isArray(raw) ? raw.map(normalizeTransition).filter(Boolean).slice(0, 300) : [];
  } catch { return []; }
}

export function recordDecisionTransition({ decisionId, householdId, status, title, detail = "", type = "decision" }) {
  const transitions = listDecisionTransitions();
  const existing = transitions.find((transition) => transition.decisionId === decisionId);
  if (existing?.status === status) return existing;
  const transition = normalizeTransition({ decisionId, householdId, status, title, detail, type, occurredAt: new Date().toISOString() });
  localStorage.setItem(TRANSITION_STORAGE_KEY, JSON.stringify([transition, ...transitions].slice(0, 300)));
  return transition;
}

export function getDecisionWorkflowStatus(decisionId, fallback = "New") {
  const transitions = listDecisionTransitions().filter((transition) => transition.decisionId === decisionId);
  if (seededDecisionArtifact(decisionId)?.completedAt || transitions.some((transition) => transition.status === "Complete")) return "Complete";
  if (getProposal(decisionId)?.status === "Ready for client") return "Ready for client";
  const plan = getDecisionPlan(decisionId);
  if (plan && (plan.kind === "funding-schedule" || plan.candidates.length > 0)) return "Plan drafted";
  if (transitions.some((transition) => transition.status === "Reviewing")) return "Reviewing";
  return transitions.some((transition) => transition.status === "Reviewing") || seededDecisionArtifact(decisionId)?.openedAt ? "Reviewing" : "New";
}

export function saveDecisionPlan({ decision, householdId, steps = [], implementationAmount = 0, candidates = [], kind = "investment-basket", sourceAccountName = "", dueDate = "" }) {
  const plans = listDecisionPlans();
  const existing = plans.find((plan) => plan.decisionId === decision.id);
  const now = new Date().toISOString();
  const next = normalizePlan({
    decisionId: decision.id,
    householdId,
    title: decision.title,
    objective: decision.objective,
    kind,
    status: "Plan drafted",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    implementationAmount,
    sourceAccountName: sourceAccountName || existing?.sourceAccountName || "",
    dueDate: dueDate || existing?.dueDate || "",
    steps: existing?.steps?.length ? existing.steps : steps.map((step) => ({ ...step, complete: false })),
    candidates: candidates.length ? candidates : existing?.candidates || [],
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

export function scheduleDecisionFunding({ decision, householdId, steps = [], implementationAmount = 0, sourceAccountName = "", dueDate = "" }) {
  const plan = saveDecisionPlan({ decision, householdId, steps, implementationAmount, kind: "funding-schedule", sourceAccountName, dueDate });
  recordDecisionTransition({ decisionId: decision.id, householdId, status: "Plan drafted", title: "Funding plan scheduled", detail: decision.title, type: "plan" });
  return plan;
}

export function completeDecision({ decision, householdId }) {
  return recordDecisionTransition({ decisionId: decision.id, householdId, status: "Complete", title: "Decision completed", detail: decision.title, type: "plan" });
}

export function toggleDecisionPlanStep(decisionId, stepId) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const steps = plan.steps.map((step) => step.id === stepId ? { ...step, complete: !step.complete } : step);
  const next = normalizePlan({ ...plan, steps, status: plan.status, updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}

export function addDecisionCandidates(decisionId, candidates) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const nextCandidates = [...plan.candidates, ...(candidates || []).map(normalizeCandidate).filter(Boolean)];
  const deduped = [...new Map(nextCandidates.map((candidate) => [candidate.id, candidate])).values()].slice(0, 8);
  const next = normalizePlan({ ...plan, candidates: deduped, status: "Plan drafted", updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}

export function setDecisionCandidates(decisionId, candidates) {
  const plans = listDecisionPlans();
  const plan = plans.find((item) => item.decisionId === decisionId);
  if (!plan) return null;
  const nextCandidates = [...new Map((candidates || []).map(normalizeCandidate).filter(Boolean).map((candidate) => [candidate.id, candidate])).values()].slice(0, 8);
  const next = normalizePlan({ ...plan, candidates: nextCandidates, status: nextCandidates.length ? "Plan drafted" : "Reviewing", updatedAt: new Date().toISOString() });
  writePlans([next, ...plans.filter((item) => item.decisionId !== decisionId)]);
  return next;
}
