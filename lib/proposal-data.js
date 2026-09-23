import { calculateProposalImpact } from "./proposal-impact.js";
import { SEEDED_PROPOSALS } from "./workflow-seeds.js";
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
  const category = cleanText(candidate.category, "", 80);
  const isBrokeredCd = category === "Fixed Income" && /brokered certificate of deposit/i.test(name);
  return {
    id,
    name,
    type: isBrokeredCd ? "Certificate of deposit" : cleanText(candidate.type, "", 120),
    symbol: cleanText(candidate.symbol, "", 24),
    category,
    manager: isBrokeredCd ? "US Depository Institution" : cleanText(candidate.manager, "", 160),
    assetClass: isBrokeredCd ? "Cash & Equivalents" : cleanText(candidate.assetClass, candidate.category || "", 120),
    objective: isBrokeredCd ? "Capital preservation / income" : cleanText(candidate.objective, candidate.assetClass || candidate.category || "Portfolio implementation", 240),
    benchmark: isBrokeredCd ? "3-Month US Treasury Bill" : cleanText(candidate.benchmark, "Not specified", 120),
    risk: cleanText(candidate.risk, "Not specified", 80),
    liquidity: cleanText(candidate.liquidity, "See product materials", 120),
    status: cleanText(candidate.status, "Available", 80),
    fee: candidate.fee !== null && candidate.fee !== undefined && Number.isFinite(Number(candidate.fee)) ? Math.max(0, Math.min(20, Number(candidate.fee))) : null,
    minimum: cleanAmount(candidate.minimum, 100_000_000),
    amount: cleanAmount(candidate.amount),
  };
}

function normalizedWords(value) {
  return cleanText(value, "", 600).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeSourceLabel(value, objective) {
  const label = cleanText(value, "Portfolio assets", 160);
  const normalized = normalizedWords(label);
  if (/^(deploy excess liquidity|restore municipal allocation)$/.test(normalized) || normalized === normalizedWords(objective)) return "Household cash";
  if (/ reduction$/i.test(label)) return `${label.replace(/ reduction$/i, "")} sale proceeds`;
  return label;
}

function normalizeRationale(value) {
  const rationale = cleanText(value, "", 1200);
  return rationale.replace(/Reinvest (.+?) from Deploy excess liquidity to deploy excess liquidity\./i, "Allocate $1 from household cash across the selected investments.");
}

function isDirectSecurity(candidate) {
  const identity = normalizedWords(`${candidate?.category || ""} ${candidate?.type || ""} ${candidate?.name || ""}`);
  return candidate?.category === "Equities"
    || candidate?.category === "Fixed Income"
    || /\b(common stock|adr|reit|preferred stock|treasury|municipal bond|corporate bond|agency bond|certificate of deposit)\b/.test(identity);
}

export function proposalCandidateFeeDisclosure(candidate) {
  if (candidate?.fee !== null && candidate?.fee !== undefined && Number.isFinite(Number(candidate.fee))) {
    const rate = Math.max(0, Number(candidate.fee));
    return { complete: true, rate, label: `${rate.toFixed(2)}%` };
  }
  if (isDirectSecurity(candidate)) return { complete: true, rate: 0, label: "No annual product fee" };
  return { complete: false, rate: null, label: "Fee review required" };
}

export function proposalCandidateRole(candidate) {
  const identity = normalizedWords(`${candidate?.type || ""} ${candidate?.name || ""} ${candidate?.assetClass || ""}`);
  if (/certificate of deposit/.test(identity)) return "Capital preservation / income";
  if (/municipal/.test(identity)) return "Tax-exempt income";
  if (/treasury|us government/.test(identity)) return "Government income / capital preservation";
  if (/corporate bond/.test(identity)) return "Investment-grade income";
  if (/agency bond|federal agency/.test(identity)) return "Government-sponsored income";
  return cleanText(candidate?.objective, candidate?.assetClass || candidate?.category || "", 240);
}

export function getProposalReadiness(proposal) {
  const blockers = [];
  if (!proposal) return { ready: false, blockers: [{ code: "missing-proposal", label: "Proposal data is unavailable" }] };
  const candidates = Array.isArray(proposal.candidates) ? proposal.candidates : [];
  const allocated = candidates.reduce((sum, candidate) => sum + cleanAmount(candidate.amount), 0);
  if (!candidates.length) blockers.push({ code: "missing-solutions", label: "Add at least one investment solution" });
  if (allocated !== cleanAmount(proposal.totalAmount)) blockers.push({ code: "allocation", label: "Allocate the full proposal amount" });
  if (candidates.some((candidate) => cleanAmount(candidate.amount) < cleanAmount(candidate.minimum))) blockers.push({ code: "minimums", label: "Meet every investment minimum" });
  if (!cleanText(proposal.sourceLabel) || !cleanText(proposal.sourceValue)) blockers.push({ code: "funding-source", label: "Confirm the source of funds" });
  if (cleanText(proposal.rationale).length < 30) blockers.push({ code: "rationale", label: "Add a client-ready advisor rationale" });
  const missingFees = candidates.filter((candidate) => !proposalCandidateFeeDisclosure(candidate).complete);
  if (missingFees.length) blockers.push({ code: "fees", label: `Complete fee data for ${missingFees.length} ${missingFees.length === 1 ? "solution" : "solutions"}` });
  const missingLiquidity = candidates.filter((candidate) => !cleanText(candidate.liquidity) || /see (product )?materials/i.test(candidate.liquidity));
  if (missingLiquidity.length) blockers.push({ code: "liquidity", label: `Confirm liquidity for ${missingLiquidity.length} ${missingLiquidity.length === 1 ? "solution" : "solutions"}` });
  const missingRoles = candidates.filter((candidate) => !proposalCandidateRole(candidate));
  if (missingRoles.length) blockers.push({ code: "roles", label: `Define a portfolio role for ${missingRoles.length} ${missingRoles.length === 1 ? "solution" : "solutions"}` });
  return { ready: blockers.length === 0, blockers };
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

export function reallocateProposalCandidate(candidates, totalAmount, selectedId, requestedAmount) {
  const normalized = (candidates || []).map(normalizeProposalCandidate).filter(Boolean).slice(0, MAX_PROPOSAL_CANDIDATES);
  const total = cleanAmount(totalAmount);
  const selected = normalized.find((candidate) => candidate.id === selectedId);
  if (!selected || !normalized.length) return allocateProposalCandidates(normalized, total);
  if (normalized.length === 1) return [{ ...selected, amount: total }];
  const others = normalized.filter((candidate) => candidate.id !== selectedId);
  const otherMinimums = others.reduce((sum, candidate) => sum + candidate.minimum, 0);
  const selectedMaximum = Math.max(selected.minimum, total - otherMinimums);
  const selectedAmount = Math.min(selectedMaximum, Math.max(selected.minimum, cleanAmount(requestedAmount, total)));
  const allocatedOthers = allocateProposalCandidates(others, Math.max(0, total - selectedAmount));
  const byId = new Map(allocatedOthers.map((candidate) => [candidate.id, candidate]));
  return normalized.map((candidate) => candidate.id === selectedId ? { ...candidate, amount: selectedAmount } : byId.get(candidate.id));
}

export function normalizeProposal(proposal) {
  if (!proposal || typeof proposal !== "object") return null;
  const decisionId = cleanText(proposal.decisionId, "", 120);
  const householdId = cleanText(proposal.householdId, "", 120);
  if (!decisionId || !householdId) return null;
  const totalAmount = cleanAmount(proposal.totalAmount);
  const candidates = (proposal.candidates || []).map(normalizeProposalCandidate).filter(Boolean).slice(0, MAX_PROPOSAL_CANDIDATES);
  const sections = Object.fromEntries(Object.keys(DEFAULT_SECTIONS).map((key) => [key, proposal.sections?.[key] !== false]));
  const objective = cleanText(proposal.objective, "", 600);
  const sourceLabel = normalizeSourceLabel(proposal.sourceLabel, objective);
  return {
    id: cleanText(proposal.id, `proposal-${decisionId}`, 160),
    decisionId,
    householdId,
    householdName: cleanText(proposal.householdName, "Household", 180),
    members: Array.isArray(proposal.members) ? proposal.members.map((member) => cleanText(member, "", 120)).filter(Boolean).slice(0, 8) : [],
    decisionTitle: cleanText(proposal.decisionTitle, "Proposed portfolio change", 240),
    objective,
    sourceLabel,
    sourceValue: cleanText(proposal.sourceValue, "", 160),
    totalAmount,
    status: cleanText(proposal.status, "Draft", 80),
    rationale: normalizeRationale(proposal.rationale),
    sections,
    impactModel: proposal.impactModel?.version === 1 ? proposal.impactModel : null,
    ...calculateProposalImpact(proposal.impactModel, candidates),
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
  let stored = [];
  try {
    const raw = JSON.parse(localStorage.getItem(PROPOSAL_STORAGE_KEY));
    stored = Array.isArray(raw) ? raw.map(normalizeProposal).filter(Boolean).slice(0, MAX_LOCAL_PROPOSALS) : [];
  } catch {}
  const byDecision = new Map(SEEDED_PROPOSALS.map((proposal) => [proposal.decisionId, normalizeProposal(proposal)]));
  stored.forEach((proposal) => byDecision.set(proposal.decisionId, proposal));
  return [...byDecision.values()].filter(Boolean).slice(0, MAX_LOCAL_PROPOSALS);
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
  if (!getProposalReadiness(proposal).ready) return null;
  return saveProposal({ ...proposal, status: "Ready for client" });
}
