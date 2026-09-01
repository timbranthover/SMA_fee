const PROPOSAL_STORAGE_KEY = "advisor-client-proposals-v1";
const MAX_LOCAL_PROPOSALS = 100;
const MAX_PROPOSAL_CANDIDATES = 6;
const DEFAULT_SECTIONS = Object.freeze({
  householdImpact: true,
  proposedSolutions: true,
  costsAndConsiderations: true,
  nextSteps: true,
});

function cleanText(value, fallback = "", maximum = 240) {
  return String(value || fallback).trim().slice(0, maximum);
}

function cleanAmount(value, maximum = 100_000_000_000) {
  const numeric = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(maximum, numeric));
}

export function normalizeProposalCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const id = cleanText(candidate.id, "", 120);
  const name = cleanText(candidate.name, "", 180);
  if (!id || !name) return null;
  return {
    id,
    name,
    symbol: cleanText(candidate.symbol, "", 24),
    category: cleanText(candidate.category, "", 80),
    manager: cleanText(candidate.manager, "", 160),
    fee: Number.isFinite(Number(candidate.fee)) ? Math.max(0, Math.min(20, Number(candidate.fee))) : null,
    minimum: cleanAmount(candidate.minimum, 100_000_000),
    amount: cleanAmount(candidate.amount),
  };
}

export function allocateProposalCandidates(candidates, totalAmount) {
  const normalized = (candidates || []).map(normalizeProposalCandidate).filter(Boolean).slice(0, MAX_PROPOSAL_CANDIDATES);
  const total = cleanAmount(totalAmount);
  if (!normalized.length) return [];
  const requiredMinimum = normalized.reduce((sum, candidate) => sum + candidate.minimum, 0);
  const minimumsFit = requiredMinimum <= total;
  const distributable = minimumsFit ? total - requiredMinimum : total;
  const base = Math.floor(distributable / normalized.length);
  let remainder = distributable - base * normalized.length;
  return normalized.map((candidate) => {
    const amount = (minimumsFit ? candidate.minimum : 0) + base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return { ...candidate, amount };
  });
}

export function normalizeProposal(proposal) {
  if (!proposal || typeof proposal !== "object") return null;
  const decisionId = cleanText(proposal.decisionId, "", 120);
  const householdId = cleanText(proposal.householdId, "", 120);
  if (!decisionId || !householdId) return null;
  const totalAmount = cleanAmount(proposal.totalAmount);
  const candidates = (proposal.candidates || []).map(normalizeProposalCandidate).filter(Boolean).slice(0, MAX_PROPOSAL_CANDIDATES);
  const sections = Object.fromEntries(Object.keys(DEFAULT_SECTIONS).map((key) => [key, proposal.sections?.[key] !== false]));
  return {
    id: cleanText(proposal.id, `proposal-${decisionId}`, 160),
    decisionId,
    householdId,
    householdName: cleanText(proposal.householdName, "Household", 180),
    members: Array.isArray(proposal.members) ? proposal.members.map((member) => cleanText(member, "", 120)).filter(Boolean).slice(0, 8) : [],
    decisionTitle: cleanText(proposal.decisionTitle, "Proposed portfolio change", 240),
    objective: cleanText(proposal.objective, "", 600),
    sourceLabel: cleanText(proposal.sourceLabel, "Portfolio change", 160),
    sourceValue: cleanText(proposal.sourceValue, "", 160),
    totalAmount,
    status: cleanText(proposal.status, "Draft", 80),
    rationale: cleanText(proposal.rationale, "", 1200),
    sections,
    impact: proposal.impact && typeof proposal.impact === "object" ? proposal.impact : {},
    candidates,
    createdAt: cleanText(proposal.createdAt, new Date().toISOString(), 40),
    updatedAt: cleanText(proposal.updatedAt, new Date().toISOString(), 40),
  };
}

export function createProposalDraft(input) {
  const now = new Date().toISOString();
  const normalizedCandidates = (input.candidates || []).map(normalizeProposalCandidate).filter(Boolean).slice(0, MAX_PROPOSAL_CANDIDATES);
  const suppliedAllocation = normalizedCandidates.reduce((sum, candidate) => sum + candidate.amount, 0);
  const candidates = normalizedCandidates.length && suppliedAllocation === cleanAmount(input.totalAmount)
    ? normalizedCandidates
    : allocateProposalCandidates(normalizedCandidates, input.totalAmount);
  return normalizeProposal({
    ...input,
    id: input.id || `proposal-${input.decisionId}`,
    status: input.status || "Draft",
    sections: { ...DEFAULT_SECTIONS, ...(input.sections || {}) },
    candidates,
    createdAt: input.createdAt || now,
    updatedAt: now,
  });
}

export function listProposals() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROPOSAL_STORAGE_KEY));
    return Array.isArray(stored) ? stored.map(normalizeProposal).filter(Boolean).slice(0, MAX_LOCAL_PROPOSALS) : [];
  } catch { return []; }
}

export function getProposal(decisionId) {
  return listProposals().find((proposal) => proposal.decisionId === decisionId) || null;
}

export function saveProposal(proposal) {
  const normalized = normalizeProposal({ ...proposal, updatedAt: new Date().toISOString() });
  if (!normalized) return null;
  const proposals = listProposals();
  localStorage.setItem(PROPOSAL_STORAGE_KEY, JSON.stringify([normalized, ...proposals.filter((item) => item.decisionId !== normalized.decisionId)].slice(0, MAX_LOCAL_PROPOSALS)));
  return normalized;
}

export function markProposalReady(decisionId) {
  const proposal = getProposal(decisionId);
  if (!proposal || !proposal.candidates.length) return null;
  const allocated = proposal.candidates.reduce((sum, candidate) => sum + candidate.amount, 0);
  const minimumsMet = proposal.candidates.every((candidate) => candidate.amount >= candidate.minimum);
  if (allocated !== proposal.totalAmount || !minimumsMet) return null;
  return saveProposal({ ...proposal, status: "Ready for client" });
}
