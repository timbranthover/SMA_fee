import test from "node:test";
import assert from "node:assert/strict";
import { calculateProposalImpact } from "../lib/proposal-impact.js";
import { createProposalDraft, normalizeProposal, normalizeProposalCandidate } from "../lib/proposal-data.js";
import { getAuthorizedDecisionProjection } from "../api/decision.js";

const householdId = "household-morrison";
const decision = getAuthorizedDecisionProjection("advisor-042", householdId).decisions.find((item) => item.kind === "concentration");
const scenario = getAuthorizedDecisionProjection("advisor-042", householdId, "scenario", decision.id);
const model = scenario.proposalModel;
const product = (assetClass, amount = scenario.implementation.amount) => ({ id: assetClass, name: assetClass, category: "SMAs", assetClass, amount, minimum: 0 });

test("actual investments drive allocation instead of the original US-equity assumption", () => {
  const equity = calculateProposalImpact(model, [product("US Large Blend")]);
  const bonds = calculateProposalImpact(model, [product("Municipal Bond")]);
  assert.ok(equity.impact.usEquity.after > bonds.impact.usEquity.after);
  assert.equal(equity.cash, bonds.cash);
  assert.equal(equity.cash + equity.allocated, model.cashAfterFunding);
  const half = scenario.implementation.amount / 2;
  const mixed = calculateProposalImpact(model, [product("US Large Blend", half), product("Municipal Bond", half)]);
  assert.ok(Math.abs(mixed.impact.usEquity.after - (equity.impact.usEquity.after + bonds.impact.usEquity.after) / 2) < 1e-8);
});

test("repurchasing the concentrated stock increases direct exposure", () => {
  const result = calculateProposalImpact(model, [{ ...product("US Large Cap Equity"), category: "Equities", symbol: "AAPL" }]);
  const baseline = calculateProposalImpact(model, [product("US Large Blend")]);
  assert.ok(result.impact.concentration.after > baseline.impact.concentration.after);
  assert.equal(result.impact.concentration.label, "Direct AAPL position");
});

test("unknown exposure is withheld, and unallocated dollars remain in cash", () => {
  const unknown = calculateProposalImpact(model, [product("Global Equity")]);
  assert.equal(unknown.impact.usEquity.after, null);
  assert.equal(unknown.unresolvedAmount, scenario.implementation.amount);
  const empty = calculateProposalImpact(model, []);
  assert.equal(empty.cash, model.cashAfterFunding);
  assert.equal(calculateProposalImpact(null, []).impact.usEquity, undefined);
});

test("saved proposal estimates recalculate after allocation edits and survive reload", () => {
  const draft = createProposalDraft({ decisionId: decision.id, householdId, totalAmount: scenario.implementation.amount, impactModel: model, candidates: [product("US Large Blend")] });
  const bonds = normalizeProposal({ ...draft, candidates: [product("Municipal Bond")] });
  assert.ok(draft.impact.usEquity.after > bonds.impact.usEquity.after);
  assert.deepEqual(normalizeProposal(JSON.parse(JSON.stringify(bonds))).impact, bonds.impact);
  assert.equal(normalizeProposalCandidate({ id: "bond", name: "Bond", fee: null }).fee, null);
});

test("municipal funding only increases municipal exposure for municipal investments", () => {
  const allocation = getAuthorizedDecisionProjection("advisor-042", householdId).decisions.find((item) => item.kind === "allocation");
  const scenario = getAuthorizedDecisionProjection("advisor-042", householdId, "scenario", allocation.id);
  const equity = calculateProposalImpact(scenario.proposalModel, [product("US Large Blend", scenario.implementation.amount)]);
  const muni = calculateProposalImpact(scenario.proposalModel, [product("Municipal Bond", scenario.implementation.amount)]);
  assert.equal(equity.impact.allocation.before, equity.impact.allocation.after);
  assert.ok(muni.impact.allocation.after > equity.impact.allocation.after);
});
