import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "./advisor-book-source.js";

const DECISION_STATUSES = Object.freeze(["New", "Reviewing", "Plan drafted", "Client discussion", "In progress", "Complete"]);

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

function isoDay(day) {
  return `2026-08-${String(Math.max(1, Math.min(31, day))).padStart(2, "0")}`;
}

function planningDate(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "2026-07-01";
}

function firstWatchGoal(dataset, householdId) {
  return dataset.goals.find((goal) => goal.householdId === householdId && goal.tone === "watch") || null;
}

function classifyInsight(dataset, household, insight) {
  const id = String(insight.id || "").toLowerCase();
  if (id === "concentration" || id.endsWith("-concentration")) {
    const symbol = String(insight.title || "Concentrated position").split(" ")[0];
    return {
      kind: "concentration",
      scenarioType: "concentration",
      title: `Reduce ${symbol} concentration?`,
      objective: "Reduce single-position exposure while preserving the household's long-term portfolio intent.",
      implementationType: "diversified-us-equity",
    };
  }
  if (id === "cash" || id.endsWith("-cash")) {
    return {
      kind: "liquidity",
      scenarioType: "liquidity",
      title: "Put excess household cash to work?",
      objective: "Deploy excess liquidity while preserving the household's operating reserve and near-term needs.",
      implementationType: "cash-alternatives",
    };
  }
  if (id === "muni" || id.endsWith("-muni")) {
    return {
      kind: "allocation",
      scenarioType: "allocation",
      title: "Restore the municipal allocation?",
      objective: "Move the household back toward its stated fixed-income allocation using an explicit tax-aware implementation.",
      implementationType: "municipal-income",
    };
  }
  if (id.endsWith("-goal-review")) {
    const goal = firstWatchGoal(dataset, household.id);
    return {
      kind: "goal-funding",
      scenarioType: "goal-funding",
      title: goal ? `Adjust funding for ${goal.name}?` : "Review goal funding?",
      objective: "Close the planning gap while preserving enough household liquidity for other priorities.",
      implementationType: "none",
      goalId: goal?.id || null,
    };
  }
  if (insight.severity === "Upcoming") {
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

function decisionStatus(householdId, insightId) {
  if (householdId === "household-morrison" && insightId === "concentration") return "Reviewing";
  if (householdId === "household-morrison" && insightId === "capital-call") return "In progress";
  return DECISION_STATUSES[hash(`${householdId}:${insightId}:decision-stage`) % DECISION_STATUSES.length];
}

function buildDecision(dataset, household, insight, ordinal) {
  const classification = classifyInsight(dataset, household, insight);
  if (!classification) return null;
  const status = decisionStatus(household.id, insight.id);
  const openedDay = 16 + hash(`${household.id}:${insight.id}:opened`) % 12;
  const updatedDay = Math.min(31, openedDay + hash(`${household.id}:${insight.id}:updated`) % 4);
  const priority = insight.tone === "red" ? "Priority" : insight.severity === "Upcoming" ? "Time sensitive" : insight.tone === "amber" ? "Review" : "Opportunity";
  return {
    id: `${household.id}-decision-${ordinal + 1}`,
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
    openedAt: isoDay(openedDay),
    updatedAt: isoDay(updatedDay),
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
    insights.forEach((insight, ordinal) => {
      const decision = buildDecision(dataset, household, insight, ordinal);
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
      occurredAt: planningDate(household.lastPlanningReview),
      title: "Planning review completed",
      detail: household.lastPlanningReview || "Most recent household planning review",
      source: "Planning record",
    });
    events.push({
      id: `${household.id}-event-reconciliation`,
      householdId: household.id,
      type: "portfolio",
      occurredAt: "2026-08-21",
      title: "Household portfolio reconciled",
      detail: household.asOf || "Current household data refreshed",
      source: "Portfolio accounting",
    });
    for (const decision of decisionsByHousehold.get(household.id) || []) {
      events.push({
        id: `${decision.id}-event-opened`,
        householdId: household.id,
        decisionId: decision.id,
        type: "decision",
        occurredAt: decision.openedAt,
        title: "Decision opened",
        detail: decision.title,
        source: decision.source,
      });
      if (["Plan drafted", "Client discussion", "In progress", "Complete"].includes(decision.status)) {
        events.push({
          id: `${decision.id}-event-stage`,
          householdId: household.id,
          decisionId: decision.id,
          type: "plan",
          occurredAt: decision.updatedAt,
          title: decision.status === "Complete" ? "Decision completed" : `Decision moved to ${decision.status.toLowerCase()}`,
          detail: decision.title,
          source: "Advisor workflow",
        });
      }
    }
  }
  return events;
}

const decisions = buildDecisions(ADVISOR_BOOK_DATASET);
const householdEvents = buildEvents(ADVISOR_BOOK_DATASET, decisions);

export const ADVISOR_WORKSPACE_DATASET = deepFreeze({
  ...ADVISOR_BOOK_DATASET,
  decisions,
  householdEvents,
});

export { DEFAULT_ADVISOR_ID };
