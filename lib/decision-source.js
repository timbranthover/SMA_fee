import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "./advisor-book-source.js";
import { seededDecisionArtifact, seededDecisionStatus, seededDecisionTransitions } from "./workflow-seeds.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function parseDate(value) {
  const normalized = String(value || "").split("·")[0].match(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/)?.[0] || String(value || "");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function isoDateOffset(value, days = 0) {
  const date = parseDate(value) || new Date("2026-08-21T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstWatchGoal(dataset, householdId) {
  return dataset.goals.find((goal) => goal.householdId === householdId && !["on track", "funded"].includes(String(goal.status || "").trim().toLowerCase())) || null;
}

function primaryConcentrationHolding(dataset, householdId) {
  const policy = dataset.concentrationPolicies.find((candidate) => candidate.householdId === householdId && candidate.isPrimary)
    || dataset.concentrationPolicies.find((candidate) => candidate.householdId === householdId);
  return policy ? dataset.householdHoldingSnapshots.find((holding) => holding.householdId === householdId && holding.instrumentId === policy.instrumentId) || null : null;
}

function classifyInsight(dataset, household, insight) {
  const actionType = insight.actionMetadata?.type;
  if (insight.kind === "concentration" || actionType === "concentration") {
    const holding = primaryConcentrationHolding(dataset, household.id);
    return {
      kind: "concentration",
      scenarioType: "concentration",
      title: holding ? `Reduce ${holding.symbol} concentration?` : "Reduce the concentrated position?",
      objective: "Reduce single-position exposure while preserving the household's long-term portfolio intent.",
      implementationType: "diversified-us-equity",
    };
  }
  if (insight.kind === "liquidity") {
    return {
      kind: "liquidity",
      scenarioType: "liquidity",
      title: "Put excess household cash to work?",
      objective: "Deploy excess liquidity while preserving the household's operating reserve and near-term needs.",
      implementationType: "cash-alternatives",
    };
  }
  if (insight.kind === "allocation") {
    return {
      kind: "allocation",
      scenarioType: "allocation",
      title: "Restore the municipal allocation?",
      objective: "Move the household back toward its stated fixed-income allocation using an explicit tax-aware implementation.",
      implementationType: "municipal-income",
    };
  }
  if (insight.kind === "goal" || actionType === "goal") {
    const goal = dataset.goals.find((candidate) => candidate.householdId === household.id && candidate.id === insight.actionMetadata?.goalId)
      || firstWatchGoal(dataset, household.id);
    return {
      kind: "goal-funding",
      scenarioType: "goal-funding",
      title: goal ? `Adjust funding for ${goal.name}?` : "Review goal funding?",
      objective: "Close the planning gap while preserving enough household liquidity for other priorities.",
      implementationType: "none",
      goalId: goal?.id || null,
    };
  }
  if (insight.kind === "obligation" || insight.severity === "Upcoming") {
    return {
      kind: "upcoming-liquidity",
      scenarioType: "upcoming-liquidity",
      title: "Fund the upcoming obligation from available liquidity?",
      objective: "Meet the obligation without forcing an unnecessary investment sale or disrupting other household priorities.",
      implementationType: "none",
    };
  }
  return null;
}

function buildDecision(dataset, household, insight) {
  const classification = classifyInsight(dataset, household, insight);
  // Investment signals with a concrete funding source always need an action
  // path. Informational planning and research signals remain opt-in.
  const actionableInvestment = classification && ["concentration", "liquidity"].includes(classification.kind);
  if (!classification || (insight.decisionEligible === false && !actionableInvestment && !(household.name === "Long Household" && /trust distribution/i.test(insight.title)))) return null;
  const id = `${household.id}-decision-${hash(insight.id).toString(36)}`;
  const artifact = seededDecisionArtifact(id);
  const signalAt = artifact?.signalAt || isoDateOffset(household.asOf, -(2 + hash(`${household.id}:${insight.id}:signal`) % 43));
  const status = seededDecisionStatus(id);
  const updatedAt = artifact?.completedAt || artifact?.finalizedAt || artifact?.planAt || artifact?.openedAt || signalAt;
  const priority = insight.tone === "red" ? "Priority" : insight.severity === "Upcoming" ? "Time sensitive" : insight.tone === "amber" ? "Review" : "Opportunity";
  return {
    id,
    householdId: household.id,
    advisorId: household.advisorId,
    sourceInsightId: insight.id,
    kind: classification.kind,
    scenarioType: classification.scenarioType,
    implementationType: classification.implementationType,
    goalId: classification.goalId || null,
    title: classification.title,
    objective: classification.objective,
    summary: insight.title,
    evidenceSummary: insight.detail,
    tone: insight.tone,
    priority,
    status,
    signalAt,
    openedAt: artifact?.openedAt || null,
    updatedAt,
    owner: "Advisor",
    source: "Household signal engine",
  };
}

function buildDecisions(dataset) {
  const householdsById = new Map(dataset.households.map((household) => [household.id, household]));
  const grouped = new Map();
  for (const insight of dataset.insights) {
    if (!grouped.has(insight.householdId)) grouped.set(insight.householdId, []);
    grouped.get(insight.householdId).push(insight);
  }
  const decisions = [];
  for (const [householdId, insights] of grouped) {
    const household = householdsById.get(householdId);
    if (!household) continue;
    insights.forEach((insight) => {
      const decision = buildDecision(dataset, household, insight);
      if (decision) decisions.push(decision);
    });
  }
  return decisions;
}

function buildEvents(dataset, decisions) {
  const events = [];
  const decisionsByHousehold = new Map();
  for (const decision of decisions) {
    if (!decisionsByHousehold.has(decision.householdId)) decisionsByHousehold.set(decision.householdId, []);
    decisionsByHousehold.get(decision.householdId).push(decision);
  }

  for (const household of dataset.households) {
    events.push({
      id: `${household.id}-event-planning-review`,
      householdId: household.id,
      type: "planning",
      occurredAt: isoDateOffset(household.lastPlanningReview || household.asOf),
      title: "Planning review completed",
      detail: household.lastPlanningReview || "Most recent household planning review",
      source: "Planning record",
    });
    events.push({
      id: `${household.id}-event-reconciliation`,
      householdId: household.id,
      type: "portfolio",
      occurredAt: isoDateOffset(household.asOf),
      title: "Household portfolio reconciled",
      detail: household.asOf || "Current household data refreshed",
      source: "Portfolio accounting",
    });
    for (const decision of decisionsByHousehold.get(household.id) || []) {
      for (const [index, transition] of seededDecisionTransitions(decision).entries()) events.push({
        id: `${decision.id}-transition-${index + 1}`,
        householdId: household.id,
        decisionId: decision.id,
        type: transition.type,
        occurredAt: transition.occurredAt,
        title: transition.title,
        detail: decision.title,
        source: transition.status === "New" ? decision.source : "Advisor workflow",
        status: transition.status,
      });
    }
  }
  return events;
}

export function buildDecisionWorkspaceDataset(dataset) {
  const decisions = buildDecisions(dataset);
  return deepFreeze({ ...dataset, decisions, householdEvents: buildEvents(dataset, decisions) });
}

export const ADVISOR_WORKSPACE_DATASET = buildDecisionWorkspaceDataset(ADVISOR_BOOK_DATASET);

export { DEFAULT_ADVISOR_ID };
