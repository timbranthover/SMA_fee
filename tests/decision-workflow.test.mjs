import test from "node:test";
import assert from "node:assert/strict";
import { completeDecision, getDecisionPlan, getDecisionWorkflowStatus, listDecisionTransitions, recordDecisionTransition, saveDecisionPlan, scheduleDecisionFunding, setDecisionCandidates } from "../lib/decision-data.js";
import { getProposal, getProposalReadiness } from "../lib/proposal-data.js";

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
};

test("seeded basket and finalized proposal records are navigable and complete", () => {
  const rogers = getDecisionPlan("household-060-decision-174udsh");
  assert.equal(rogers.candidates.reduce((total, candidate) => total + candidate.amount, 0), 1_240_000);
  assert.equal(getDecisionWorkflowStatus(rogers.decisionId), "Plan drafted");
  for (const id of ["household-004-decision-1eb88k3", "household-067-decision-nvtbeg"]) {
    const proposal = getProposal(id);
    assert.equal(proposal.status, "Ready for client");
    assert.equal(getProposalReadiness(proposal).ready, true);
    assert.equal(getDecisionWorkflowStatus(id), "Ready for client");
  }
});

test("opening, saving a basket, scheduling funding, and completion earn statuses", () => {
  const decision = { id: "test-decision", title: "Fund the commitment", objective: "Preserve liquidity" };
  assert.equal(getDecisionWorkflowStatus(decision.id), "New");
  recordDecisionTransition({ decisionId: decision.id, householdId: "test-household", status: "Reviewing", title: "Decision review opened", detail: decision.title });
  assert.equal(getDecisionWorkflowStatus(decision.id), "Reviewing");
  saveDecisionPlan({ decision, householdId: "test-household", implementationAmount: 100_000 });
  assert.equal(getDecisionWorkflowStatus(decision.id), "Reviewing", "an empty basket is not a plan");
  setDecisionCandidates(decision.id, [{ id: "etf-ivv", name: "iShares Core S&P 500 ETF", amount: 100_000, category: "ETFs" }]);
  assert.equal(getDecisionWorkflowStatus(decision.id), "Plan drafted");
  completeDecision({ decision, householdId: "test-household" });
  assert.equal(getDecisionWorkflowStatus(decision.id), "Complete");

  const funding = { id: "test-funding", title: "Trust distribution", objective: "Fund obligation" };
  scheduleDecisionFunding({ decision: funding, householdId: "test-household", implementationAmount: 170_000, sourceAccountName: "Family trust", dueDate: "Oct 2026" });
  assert.equal(getDecisionWorkflowStatus(funding.id), "Plan drafted");
  assert.equal(getDecisionPlan(funding.id).sourceAccountName, "Family trust");
  assert.ok(listDecisionTransitions().some((transition) => transition.decisionId === funding.id && transition.status === "Plan drafted"));
});

test("reopening and finalizing again retain each real transition", () => {
  const decisionId = "test-reopened-proposal";
  const householdId = "test-household";
  recordDecisionTransition({ decisionId, householdId, status: "Ready for client", title: "Client proposal finalized" });
  recordDecisionTransition({ decisionId, householdId, status: "Plan drafted", title: "Client proposal reopened" });
  recordDecisionTransition({ decisionId, householdId, status: "Ready for client", title: "Client proposal finalized" });
  recordDecisionTransition({ decisionId, householdId, status: "Ready for client", title: "Client proposal finalized" });
  assert.deepEqual(listDecisionTransitions().filter((transition) => transition.decisionId === decisionId).map((transition) => transition.status), ["Ready for client", "Plan drafted", "Ready for client"]);
});
