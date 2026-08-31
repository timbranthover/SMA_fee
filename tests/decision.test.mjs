import test from "node:test";
import assert from "node:assert/strict";
import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "../lib/advisor-book-source.js";
import { createWealthService } from "../lib/wealth-service.js";
import { getAuthorizedWealthProjection } from "../api/wealth.js";

const service = createWealthService(ADVISOR_BOOK_DATASET);

test("advisor book contains normalized decisions, plans and actions with valid relationships", () => {
  const stats = service.getRepositoryStats();
  assert.ok(stats.decisions > 100);
  assert.ok(stats.actionPlans > 0);
  assert.ok(stats.actions > stats.actionPlans);
  const book = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { pageSize: 200 });
  assert.equal(book.metrics.openDecisionHouseholds > 0, true);
  assert.equal(book.metrics.openDecisionCount, stats.decisions);
  assert.ok(book.metrics.activePlanCount > 0);
  assert.ok(book.items.some((item) => item.decision?.id && item.openDecisionCount > 0));
});

test("Morrison concentration decision models household consequences from underlying wealth data", () => {
  const decisions = service.getHouseholdDecisions("household-morrison");
  const concentration = decisions.find((decision) => decision.type === "concentration");
  assert.ok(concentration);
  const detail = service.getHouseholdDecision("household-morrison", concentration.id, { targetWeight: 12, goalFundingAmount: 400000 });
  assert.equal(detail.household.name, "Morrison Household");
  assert.equal(detail.scenario.kind, "concentration");
  assert.equal(detail.scenario.controls[0].key, "targetWeight");
  assert.equal(detail.scenario.metrics.find((item) => item.key === "positionWeight").before, 23.4);
  assert.equal(detail.scenario.metrics.find((item) => item.key === "positionWeight").after, 12);
  assert.ok(detail.scenario.outputs.releaseAmount > 1_300_000);
  assert.equal(detail.scenario.outputs.goalFundingAmount, 400000);
  assert.ok(detail.scenario.outputs.implementationAmount > 900000);
  assert.ok(detail.scenario.outputs.estimatedRealizedGain > 0);
  assert.equal(detail.scenario.implementation.category, "SMAs");
  assert.deepEqual(detail.scenario.implementation.flags, ["Tax-Aware", "Direct Indexing"]);
});

test("decision assumptions are bounded and cannot cross household or advisor boundaries", () => {
  const decision = service.getHouseholdDecisions("household-morrison").find((item) => item.type === "concentration");
  const bounded = service.getHouseholdDecision("household-morrison", decision.id, { targetWeight: -100, goalFundingAmount: 999999999 });
  const targetControl = bounded.scenario.controls.find((control) => control.key === "targetWeight");
  assert.ok(targetControl.value >= targetControl.min);
  const goalControl = bounded.scenario.controls.find((control) => control.key === "goalFundingAmount");
  if (goalControl) assert.ok(goalControl.value <= goalControl.max);
  const otherHousehold = ADVISOR_BOOK_DATASET.households.find((item) => item.id !== "household-morrison");
  assert.equal(service.getHouseholdDecision(otherHousehold.id, decision.id), null);
  assert.equal(getAuthorizedWealthProjection("advisor-does-not-exist", "household-morrison", "decision", decision.id), null);
});

test("non-concentration decisions use the same projection contract without forcing investment selection", () => {
  const decisions = service.getHouseholdDecisions("household-morrison");
  const liquidity = decisions.find((decision) => decision.type === "liquidity");
  const goalFunding = decisions.find((decision) => decision.type === "goal-funding");
  assert.ok(liquidity);
  const liquidityDetail = service.getHouseholdDecision("household-morrison", liquidity.id);
  assert.equal(liquidityDetail.scenario.kind, "liquidity");
  assert.ok(liquidityDetail.scenario.outputs.implementationAmount >= 0);
  if (goalFunding) {
    const goalDetail = service.getHouseholdDecision("household-morrison", goalFunding.id);
    assert.equal(goalDetail.scenario.kind, "goal-funding");
    assert.equal(goalDetail.scenario.implementation, null);
  }
});
