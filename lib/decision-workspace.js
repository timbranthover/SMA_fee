const STORAGE_KEY = "ups-advisor-decision-workspaces-v1";
const MAX_WORKSPACES = 200;
const MAX_CANDIDATES = 12;

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function readAll() {
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
  if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.items !== "object" || Array.isArray(parsed.items)) return { schemaVersion: 1, items: {} };
  return parsed;
}

function writeAll(state) {
  const entries = Object.entries(state.items).sort(([, left], [, right]) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))).slice(0, MAX_WORKSPACES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, items: Object.fromEntries(entries) }));
}

function normalizeCandidate(item) {
  return {
    id: String(item.id || ""),
    name: String(item.name || ""),
    symbol: String(item.symbol || ""),
    category: String(item.category || ""),
    manager: String(item.manager || ""),
  };
}

export function getDecisionWorkspace(decisionId) {
  if (!decisionId) return null;
  return readAll().items[decisionId] || null;
}

export function saveDecisionWorkspace(decisionId, patch = {}) {
  if (!decisionId) throw new Error("decisionId is required");
  const state = readAll();
  const previous = state.items[decisionId] || { decisionId, createdAt: new Date().toISOString(), status: "Reviewing", candidates: [] };
  const next = {
    ...previous,
    ...patch,
    decisionId,
    candidates: Array.isArray(patch.candidates) ? patch.candidates.map(normalizeCandidate).filter((item) => item.id && item.name).slice(0, MAX_CANDIDATES) : previous.candidates || [],
    updatedAt: new Date().toISOString(),
  };
  state.items[decisionId] = next;
  writeAll(state);
  return next;
}

export function saveDecisionCandidates(decisionId, candidates) {
  return saveDecisionWorkspace(decisionId, { candidates });
}

export function buildDraftPlan(decisionId, { scenario = null, candidates = [], template = [], objective = "" } = {}) {
  const actions = template.map((title, index) => ({ id: `${decisionId}-draft-action-${index + 1}`, title, status: index === 0 ? "Ready" : "Pending", owner: "Advisor", order: index + 1 }));
  return saveDecisionWorkspace(decisionId, {
    status: "Plan drafted",
    objective,
    scenario,
    candidates,
    plan: { id: `${decisionId}-draft-plan`, status: "Plan drafted", actions },
  });
}

export function clearDecisionWorkspace(decisionId) {
  const state = readAll();
  if (!state.items[decisionId]) return;
  delete state.items[decisionId];
  writeAll(state);
}
