import test from "node:test";
import assert from "node:assert/strict";
import { allocateProposalCandidates, createProposalDraft, getProposal, markProposalReady, saveProposal } from "../lib/proposal-data.js";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const context = {
  decisionId: "decision-concentration",
  householdId: "household-morrison",
  householdName: "Morrison Household",
  members: ["Alex Morrison", "Jordan Morrison"],
  decisionTitle: "Reduce single-stock concentration",
  objective: "Move the household toward its concentration policy.",
  sourceLabel: "Concentrated position",
  sourceValue: "Apple at 31.4% of financial assets",
  totalAmount: 1_000_000,
  candidates: [
    { id: "solution-a", name: "Solution A", symbol: "AAA", category: "Equities", manager: "Manager A", fee: 0.25 },
    { id: "solution-b", name: "Solution B", symbol: "BBB", category: "ETFs", manager: "Manager B", fee: 0.12 },
    { id: "solution-c", name: "Solution C", symbol: "CCC", category: "SMAs", manager: "Manager C", fee: 0.4 },
  ],
};

test("proposal allocation is exact and bounded", () => {
  const allocated = allocateProposalCandidates(context.candidates, context.totalAmount);
  assert.equal(allocated.length, 3);
  assert.equal(allocated.reduce((sum, candidate) => sum + candidate.amount, 0), context.totalAmount);
  assert.deepEqual(allocated.map((candidate) => candidate.amount), [333334, 333333, 333333]);
});

test("proposal drafts preserve a valid advisor allocation", () => {
  const candidates = context.candidates.map((candidate, index) => ({ ...candidate, amount: [500000, 300000, 200000][index] }));
  const proposal = createProposalDraft({ ...context, candidates });
  assert.deepEqual(proposal.candidates.map((candidate) => candidate.amount), [500000, 300000, 200000]);
});

test("saved proposals can only become client-ready when fully allocated", () => {
  storage.clear();
  const draft = saveProposal(createProposalDraft(context));
  assert.equal(getProposal(context.decisionId).id, draft.id);
  assert.equal(markProposalReady(context.decisionId).status, "Ready for client");

  saveProposal({ ...draft, candidates: draft.candidates.map((candidate, index) => ({ ...candidate, amount: index ? candidate.amount : 0 })) });
  assert.equal(markProposalReady(context.decisionId), null);
});
