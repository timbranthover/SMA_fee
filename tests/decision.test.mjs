import test from "node:test";
import assert from "node:assert/strict";
import { ADVISOR_WORKSPACE_DATASET, DEFAULT_ADVISOR_ID, buildDecisionWorkspaceDataset } from "../lib/decision-source.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthService } from "../lib/wealth-service.js";
import { createDecisionService } from "../lib/decision-service.js";
import { getAuthorizedDecisionProjection } from "../api/decision.js";

const repository = createWealthRepository(ADVISOR_WORKSPACE_DATASET);
const wealthService = createWealthService(ADVISOR_WORKSPACE_DATASET, { repository });
const decisionService = createDecisionService(ADVISOR_WORKSPACE_DATASET, { repository, wealthService });

test("decision domain is normalized, linked and advisor bounded", () => {
  assert.equal(repository.listAdvisorHouseholds(DEFAULT_ADVISOR_ID).length, 128);
  assert.ok(ADVISOR_WORKSPACE_DATASET.decisions.length >= 25 && ADVISOR_WORKSPACE_DATASET.decisions.length <= 80);
  assert.ok(ADVISOR_WORKSPACE_DATASET.householdEvents.length > 250);
  assert.equal(new Set(ADVISOR_WORKSPACE_DATASET.decisions.map((decision) => decision.id)).size, ADVISOR_WORKSPACE_DATASET.decisions.length);
  for (const decision of ADVISOR_WORKSPACE_DATASET.decisions) {
    assert.ok(repository.getHousehold(decision.householdId));
    assert.equal(repository.getHousehold(decision.householdId).advisorId, decision.advisorId);
    assert.ok(repository.listHouseholdInsights(decision.householdId).some((insight) => insight.id === decision.sourceInsightId));
  }
  assert.equal(getAuthorizedDecisionProjection("advisor-other", "household-morrison", "summary"), null);
  assert.ok(getAuthorizedDecisionProjection(DEFAULT_ADVISOR_ID, "household-morrison", "summary"));
});

test("decision classification uses insight semantics rather than magic identifiers", () => {
  const renamedInsights = ADVISOR_WORKSPACE_DATASET.insights.map((insight) => insight.householdId === "household-morrison"
    ? { ...insight, id: `renamed-${insight.kind}` }
    : insight);
  const rebuilt = buildDecisionWorkspaceDataset({
    ...ADVISOR_WORKSPACE_DATASET,
    insights: renamedInsights,
    decisions: [],
    householdEvents: [],
  });
  const morrisonDecisions = rebuilt.decisions.filter((decision) => decision.householdId === "household-morrison");
  assert.ok(morrisonDecisions.some((decision) => decision.kind === "concentration"));
  assert.ok(morrisonDecisions.some((decision) => decision.kind === "liquidity"));
  assert.ok(morrisonDecisions.some((decision) => decision.kind === "allocation"));
  assert.ok(morrisonDecisions.some((decision) => decision.kind === "upcoming-liquidity"));
});

test("Morrison concentration decision produces explicit household-wide scenario consequences", () => {
  const summary = decisionService.getHouseholdDecisionSummary("household-morrison");
  const concentration = summary.decisions.find((decision) => decision.kind === "concentration");
  assert.ok(concentration);
  const detail = decisionService.getDecisionDetail("household-morrison", concentration.id);
  assert.equal(detail.decision.sourceInsightId, "concentration");
  assert.equal(detail.model.type, "concentration");
  assert.ok(detail.planTemplate.length >= 5);
  assert.ok(detail.facts.some((fact) => fact.label === "Unrealized gain"));

  const scenario = decisionService.modelDecisionScenario("household-morrison", concentration.id, {
    targetWeight: 12,
    stressDrop: 35,
    goalFunding: 200000,
    redeployAmount: 700000,
  });
  assert.ok(scenario.economics.release > 1_000_000);
  assert.ok(scenario.economics.realizedGain > 0);
  assert.equal("taxReserve" in scenario.economics, false);
  assert.equal(scenario.after.cash, scenario.before.cash + scenario.economics.release - scenario.economics.goalFunding - scenario.economics.redeployAmount);
  assert.ok(scenario.after.concentrationPct < scenario.before.concentrationPct);
  assert.ok(scenario.after.stressLoss < scenario.before.stressLoss);
  assert.ok(scenario.after.goalProgress >= scenario.before.goalProgress);
  assert.equal(scenario.implementation.criteriaVisible, true);
  assert.equal(scenario.implementation.category, "SMAs");
  assert.equal("recommendationScore" in scenario, false);
});

test("liquidity and goal decisions model from real household cash and goals", () => {
  const cashHousehold = wealthService.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "cash", pageSize: 200 }).items.find((item) => item.id !== "household-morrison" && decisionService.getHouseholdDecisionSummary(item.id).decisions.some((decision) => decision.kind === "liquidity"));
  assert.ok(cashHousehold);
  const cashDecision = decisionService.getHouseholdDecisionSummary(cashHousehold.id).decisions.find((decision) => decision.kind === "liquidity");
  assert.ok(cashDecision);
  const cashScenario = decisionService.modelDecisionScenario(cashHousehold.id, cashDecision.id, {});
  assert.ok(cashScenario.before.cash >= cashScenario.after.cash);
  assert.ok(cashScenario.implementation.amount >= 0);

  const morrisonCashDecision = decisionService.getHouseholdDecisionSummary("household-morrison").decisions.find((decision) => decision.kind === "liquidity");
  assert.ok(morrisonCashDecision);
  const reserveProtected = decisionService.modelDecisionScenario("household-morrison", morrisonCashDecision.id, { reservePct: 15, deployAmount: 740000 });
  assert.equal(reserveProtected.economics.deployAmount, 0);

  const goalHousehold = wealthService.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "goals", pageSize: 200 }).items.find((item) => item.id !== "household-morrison" && decisionService.getHouseholdDecisionSummary(item.id).decisions.some((decision) => decision.kind === "goal-funding"));
  assert.ok(goalHousehold);
  const goalDecision = decisionService.getHouseholdDecisionSummary(goalHousehold.id).decisions.find((decision) => decision.kind === "goal-funding");
  assert.ok(goalDecision);
  const goalScenario = decisionService.modelDecisionScenario(goalHousehold.id, goalDecision.id, {});
  assert.ok(goalScenario.after.goalProgress >= goalScenario.before.goalProgress);
  assert.ok(goalScenario.after.cash <= goalScenario.before.cash);
});

test("meeting brief and relationship timeline are data-grounded projections", () => {
  const brief = decisionService.getMeetingBrief("household-morrison");
  const timeline = decisionService.getHouseholdTimeline("household-morrison");
  assert.equal(brief.household.name, "Morrison Household");
  assert.ok(brief.changes.length >= 4);
  assert.ok(brief.openDecisions.length > 0);
  assert.ok(timeline.length >= 4);
  for (let index = 1; index < timeline.length; index += 1) assert.ok(timeline[index - 1].occurredAt >= timeline[index].occurredAt);
});

test("advisor book carries decision and plan state without loading decision detail", () => {
  const book = wealthService.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "decisions", pageSize: 200 });
  assert.equal(book.total, book.focusCounts.decisions);
  assert.ok(book.metrics.openDecisions >= 20 && book.metrics.openDecisions <= 70);
  assert.ok(book.metrics.plansInProgress >= 8 && book.metrics.plansInProgress <= 35);
  assert.ok(book.focusCounts.decisions < book.metrics.householdCount / 2, "active decisions should involve a minority of the book");
  assert.ok(book.items.every((item) => item.openDecisionCount > 0));
  const plans = wealthService.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "plans", pageSize: 200 });
  assert.equal(plans.total, book.focusCounts.plans);
  assert.ok(plans.items.every((item) => item.planCount > 0));
});
