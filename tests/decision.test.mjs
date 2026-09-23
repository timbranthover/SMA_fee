import test from "node:test";
import assert from "node:assert/strict";
import { ADVISOR_WORKSPACE_DATASET, DEFAULT_ADVISOR_ID, buildDecisionWorkspaceDataset } from "../lib/decision-source.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthService } from "../lib/wealth-service.js";
import { createDecisionService } from "../lib/decision-service.js";
import { getAuthorizedDecisionProjection } from "../api/decision.js";
import { SEEDED_DECISION_ARTIFACTS, SEEDED_DECISION_PLANS, SEEDED_PROPOSALS, seededDecisionStatus, seededDecisionTransitions } from "../lib/workflow-seeds.js";
import { searchCatalog } from "../lib/catalog.js";

const repository = createWealthRepository(ADVISOR_WORKSPACE_DATASET);
const wealthService = createWealthService(ADVISOR_WORKSPACE_DATASET, { repository });
const decisionService = createDecisionService(ADVISOR_WORKSPACE_DATASET, { repository, wealthService });

test("decision domain is normalized, linked and advisor bounded", () => {
  assert.equal(repository.listAdvisorHouseholds(DEFAULT_ADVISOR_ID).length, 128);
  assert.ok(ADVISOR_WORKSPACE_DATASET.decisions.length >= 25 && ADVISOR_WORKSPACE_DATASET.decisions.length <= ADVISOR_WORKSPACE_DATASET.insights.length);
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
  assert.equal(scenario.implementation.category, "ETFs");
  assert.equal("recommendationScore" in scenario, false);
});

test("every documented concentration can move from review to a funded investment selection", () => {
  for (const policy of ADVISOR_WORKSPACE_DATASET.concentrationPolicies) {
    const insight = ADVISOR_WORKSPACE_DATASET.insights.find((item) => item.householdId === policy.householdId && item.kind === "concentration");
    const decision = decisionService.getHouseholdDecisionSummary(policy.householdId).decisions.find((item) => item.sourceInsightId === insight?.id);
    assert.ok(decision, `${policy.householdId} has a decision behind its concentration review`);
    const review = wealthService.getHouseholdConcentrationReview(policy.householdId);
    const scenario = decisionService.modelDecisionScenario(policy.householdId, decision.id, {});
    assert.ok(Math.abs(scenario.implementation.amount - review.targetRelease) <= 1000);
    assert.ok(scenario.economics.realizedGain >= 0);
    if (!decisionService.getDecisionDetail(policy.householdId, decision.id).model.sourceBucket) assert.equal(scenario.after.usEquityPct, null);
    const search = searchCatalog({ category: scenario.implementation.category, q: scenario.implementation.query, flags: scenario.implementation.flags, risks: scenario.implementation.risks, pageSize: 5 });
    assert.ok(search.total >= 5, `${policy.householdId} opens a nonempty candidate shelf`);
    assert.ok(searchCatalog({ category: scenario.implementation.category, q: "VOO", flags: scenario.implementation.flags, risks: scenario.implementation.risks, pageSize: 5 }).items.some((item) => item.symbol === "VOO"));
  }
});

test("every investment-exploration alert opens a modeled decision instead of an empty research search", () => {
  for (const insight of ADVISOR_WORKSPACE_DATASET.insights.filter((item) => item.actionMetadata?.type === "investment-search")) {
    const decision = decisionService.getHouseholdDecisionSummary(insight.householdId).decisions.find((item) => item.sourceInsightId === insight.id);
    assert.ok(["liquidity", "allocation"].includes(decision?.kind), `${insight.householdId} has a decision behind Explore`);
    const scenario = decisionService.modelDecisionScenario(insight.householdId, decision.id, {});
    if (decision.kind === "liquidity") assert.ok(scenario.economics.reserveAmount >= 0);
    const search = searchCatalog({ category: scenario.implementation.category, q: scenario.implementation.query, flags: scenario.implementation.flags, risks: scenario.implementation.risks, pageSize: 5 });
    assert.ok(search.total >= 5, `${insight.householdId} has investment candidates after reviewing the reserve`);
  }
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
  assert.ok(book.metrics.openDecisions >= 20 && book.metrics.openDecisions <= ADVISOR_WORKSPACE_DATASET.decisions.length);
  assert.ok(book.metrics.plansInProgress >= 5 && book.metrics.plansInProgress <= 8);
  assert.ok(book.focusCounts.decisions < book.metrics.householdCount * 0.6, "active decisions should remain concentrated in the exception households");
  assert.ok(book.items.every((item) => item.openDecisionCount > 0));
  const plans = wealthService.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "plans", pageSize: 200 });
  assert.equal(plans.total, book.focusCounts.plans);
  assert.ok(plans.items.every((item) => item.planCount > 0));
  for (const item of book.items) {
    const priorityDecision = ADVISOR_WORKSPACE_DATASET.decisions.find((decision) => decision.id === item.priority?.decisionId);
    assert.equal(item.priority?.decisionStatus || null, priorityDecision?.status || null);
  }
});

test("workflow statuses require real artifacts and Morrison starts with four open decisions", () => {
  assert.equal(Object.keys(SEEDED_DECISION_ARTIFACTS).length, 8);
  assert.ok(SEEDED_PROPOSALS.length >= 2);
  for (const decision of ADVISOR_WORKSPACE_DATASET.decisions) {
    const artifact = SEEDED_DECISION_ARTIFACTS[decision.id];
    assert.equal(decision.status, seededDecisionStatus(decision.id));
    if (decision.status === "Reviewing") assert.ok(artifact?.openedAt);
    if (decision.status === "Plan drafted") assert.ok(artifact?.plan && (artifact.plan.kind === "funding-schedule" || artifact.plan.candidates.length));
    if (decision.status === "Ready for client") assert.ok(artifact?.proposal?.candidates.length && artifact.proposal.status === "Ready for client");
    if (decision.status === "Complete") assert.ok(artifact?.completedAt);
    if (decision.status === "New") assert.ok(!artifact?.openedAt && !artifact?.plan && !artifact?.proposal && !artifact?.completedAt);
  }
  for (const plan of SEEDED_DECISION_PLANS) {
    assert.ok(plan.implementationAmount > 0);
    if (plan.kind !== "funding-schedule") assert.ok(plan.candidates.length && plan.candidates.every((candidate) => candidate.name && candidate.amount > 0));
  }
  const morrison = decisionService.getHouseholdDecisionSummary("household-morrison");
  assert.equal(morrison.openCount, 4);
  assert.equal(morrison.decisions.find((decision) => decision.kind === "concentration").status, "New");
});

test("every decision timeline event maps one-to-one to a stored transition", () => {
  for (const decision of ADVISOR_WORKSPACE_DATASET.decisions) {
    const expected = seededDecisionTransitions(decision);
    const actual = ADVISOR_WORKSPACE_DATASET.householdEvents.filter((event) => event.decisionId === decision.id);
    assert.equal(actual.length, expected.length);
    for (const [index, transition] of expected.entries()) {
      assert.equal(actual[index].status, transition.status);
      assert.equal(actual[index].occurredAt, transition.occurredAt);
      assert.equal(actual[index].title, transition.title);
    }
  }
});

test("every investment decision intent returns at least five candidates", () => {
  for (const decision of ADVISOR_WORKSPACE_DATASET.decisions) {
    if (decision.implementationType === "none") continue;
    const scenario = decisionService.modelDecisionScenario(decision.householdId, decision.id);
    if (!scenario?.implementation?.enabled) continue;
    const { category, query, flags, risks } = scenario.implementation;
    const results = searchCatalog({ category, q: query, flags, risks, pageSize: 5 });
    assert.ok(results.total >= 5, `${decision.id}: ${category} / ${query} returned ${results.total}`);
  }
});
