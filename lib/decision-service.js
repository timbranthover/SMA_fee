import { createWealthRepository } from "./wealth-repository.js";
import { createWealthService } from "./wealth-service.js";

const ACTIVE_PLAN_STATUSES = new Set(["Plan drafted", "Client discussion", "In progress"]);
const CLOSED_STATUSES = new Set(["Complete"]);
const DEFAULT_CACHE_LIMITS = Object.freeze({ summary: 300, detail: 1000, scenario: 600, meeting: 300, timeline: 300 });

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function createLruCache(limit) {
  const values = new Map();
  return Object.freeze({
    get(key) {
      if (!values.has(key)) return undefined;
      const value = values.get(key);
      values.delete(key);
      values.set(key, value);
      return value;
    },
    set(key, value) {
      if (values.has(key)) values.delete(key);
      values.set(key, value);
      while (values.size > limit) values.delete(values.keys().next().value);
      return value;
    },
  });
}

function clamp(value, min, max) {
  const numeric = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : min));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) / 1000) * 1000;
}

function pct(value, total) {
  return total ? Number((Number(value || 0) / total * 100).toFixed(1)) : 0;
}

function statusRank(status) {
  const order = { New: 5, Reviewing: 4, "Plan drafted": 3, "Client discussion": 2, "In progress": 1, Complete: 0 };
  return order[status] ?? 0;
}

function projectDecision(record) {
  return {
    id: record.id,
    sourceInsightId: record.sourceInsightId,
    kind: record.kind,
    title: record.title,
    summary: record.summary,
    evidenceSummary: record.evidenceSummary,
    objective: record.objective,
    tone: record.tone,
    priority: record.priority,
    status: record.status,
    owner: record.owner,
    openedAt: record.openedAt,
    updatedAt: record.updatedAt,
    implementationType: record.implementationType,
  };
}

function goalProjection(goal) {
  if (!goal) return null;
  const progress = goal.targetAmount > 0 ? Math.round(goal.fundedAmount / goal.targetAmount * 100) : 0;
  return {
    id: goal.id,
    name: goal.name,
    timing: goal.timing,
    status: goal.status,
    target: goal.targetAmount,
    funded: goal.fundedAmount,
    remaining: Math.max(0, goal.targetAmount - goal.fundedAmount),
    progress,
    nextReview: goal.nextReview,
  };
}

function moneyFromText(value) {
  const match = String(value || "").replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)\s*([KMB])?/i);
  if (!match) return 0;
  const multiplier = String(match[2] || "").toUpperCase() === "B" ? 1_000_000_000 : String(match[2] || "").toUpperCase() === "M" ? 1_000_000 : String(match[2] || "").toUpperCase() === "K" ? 1_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

function percentagesFromText(value) {
  return [...String(value || "").matchAll(/([0-9]+(?:\.[0-9]+)?)%/g)].map((match) => Number(match[1]));
}

function planTemplate(kind) {
  const templates = {
    concentration: [
      "Confirm the household concentration target",
      "Review account location and available tax lots",
      "Validate gain and tax-reserve assumptions",
      "Evaluate explicit replacement investments",
      "Discuss the proposed path with the client",
      "Implement the approved changes and verify exposure",
    ],
    liquidity: [
      "Confirm the household operating-liquidity reserve",
      "Define the amount available for deployment",
      "Evaluate implementation alternatives",
      "Review the proposed allocation with the client",
      "Implement the approved allocation and verify cash",
    ],
    "goal-funding": [
      "Confirm the goal amount and timing",
      "Validate the funding gap",
      "Confirm the household funding source",
      "Review the household-wide liquidity impact",
      "Discuss the funding path with the client",
      "Complete funding and verify goal progress",
    ],
    allocation: [
      "Confirm the household allocation target",
      "Determine the amount required to close the gap",
      "Review the available funding source",
      "Evaluate tax-aware implementation alternatives",
      "Discuss the proposed allocation with the client",
      "Implement and verify the post-trade allocation",
    ],
    "upcoming-liquidity": [
      "Confirm the obligation amount and due date",
      "Confirm the designated funding source",
      "Validate remaining household liquidity",
      "Schedule the required transfer",
      "Verify completion before the due date",
    ],
  };
  return (templates[kind] || ["Review the underlying household facts", "Confirm the intended path with the client", "Complete and verify the agreed action"]).map((title, index) => ({ id: `step-${index + 1}`, title }));
}

function implementationFor(record, overview, amount = 0) {
  const risk = /conservative/i.test(overview.household.riskProfile) ? "Conservative" : "Moderate";
  if (record.implementationType === "diversified-us-equity") return {
    enabled: amount > 0,
    amount: roundMoney(amount),
    objective: "Diversified US equity",
    category: "SMAs",
    query: "",
    flags: ["Tax-Aware", "Direct Indexing"],
    risks: [risk],
    tags: [overview.household.name, "Tax-aware implementation", "Reduce concentrated exposure"],
    criteriaVisible: true,
  };
  if (record.implementationType === "cash-alternatives") return {
    enabled: amount > 0,
    amount: roundMoney(amount),
    objective: "Deploy excess liquidity",
    category: "Fixed Income",
    query: "short duration cash management",
    flags: [],
    risks: ["Conservative"],
    tags: [overview.household.name, "Daily liquidity", "Explicit cash objective"],
    criteriaVisible: true,
  };
  if (record.implementationType === "municipal-income") return {
    enabled: amount > 0,
    amount: roundMoney(amount),
    objective: "Restore municipal allocation",
    category: "Fixed Income",
    query: overview.household.location === "New York" ? "New York municipal income under 50 bps" : "municipal income under 50 bps",
    flags: ["Tax-Aware"],
    risks: ["Conservative"],
    tags: [overview.household.name, overview.household.location, "Tax-aware municipal income"],
    criteriaVisible: true,
  };
  return { enabled: false, amount: 0, objective: record.objective, category: null, query: "", flags: [], risks: [], tags: [overview.household.name], criteriaVisible: true };
}

export function createDecisionService(dataset, { repository: repositoryOverride = null, wealthService: wealthServiceOverride = null, cacheLimits = {} } = {}) {
  const repository = repositoryOverride || createWealthRepository(dataset);
  const wealthService = wealthServiceOverride || createWealthService(dataset, { repository });
  const limits = { ...DEFAULT_CACHE_LIMITS, ...cacheLimits };
  const summaryCache = createLruCache(limits.summary);
  const detailCache = createLruCache(limits.detail);
  const scenarioCache = createLruCache(limits.scenario);
  const meetingCache = createLruCache(limits.meeting);
  const timelineCache = createLruCache(limits.timeline);

  function getHouseholdDecisionSummary(householdId) {
    const cached = summaryCache.get(householdId);
    if (cached) return cached;
    if (!repository.getHousehold(householdId)) return null;
    const decisions = repository.listHouseholdDecisions(householdId).map(projectDecision).sort((left, right) => statusRank(right.status) - statusRank(left.status) || left.title.localeCompare(right.title));
    const open = decisions.filter((decision) => !CLOSED_STATUSES.has(decision.status));
    const plans = open.filter((decision) => ACTIVE_PLAN_STATUSES.has(decision.status));
    return summaryCache.set(householdId, deepFreeze({
      householdId,
      openCount: open.length,
      planCount: plans.length,
      decisions,
    }));
  }

  function getDecisionDetail(householdId, decisionId) {
    const cacheKey = `${householdId}\u001f${decisionId}`;
    const cached = detailCache.get(cacheKey);
    if (cached) return cached;
    const record = repository.getDecision(decisionId);
    if (!record || record.householdId !== householdId) return null;
    const overview = wealthService.getHouseholdOverview(householdId);
    if (!overview) return null;
    const insight = repository.listHouseholdInsights(householdId).find((item) => item.id === record.sourceInsightId) || null;
    const goal = record.goalId ? repository.getGoal(record.goalId) : repository.listHouseholdGoals(householdId).find((item) => item.tone === "watch") || null;
    const relatedGoal = goalProjection(goal);
    const facts = [];
    const model = { type: record.scenarioType, defaults: {}, bounds: {}, assumptions: [] };

    if (record.kind === "concentration") {
      const review = wealthService.getHouseholdConcentrationReview(householdId);
      if (review) {
        facts.push(
          { label: "Position", value: `${review.holding.symbol} · ${review.holding.weight.toFixed(1)}%` },
          { label: "Market value", value: review.holding.value },
          { label: "Household target", value: `${review.targetWeight.toFixed(1)}%` },
          { label: "Unrealized gain", value: review.unrealizedGain },
          { label: "Accounts", value: review.accounts.length },
          { label: "Available cash", value: overview.household.investableCash },
        );
        model.defaults = { targetWeight: review.targetWeight, taxRate: 23.8, stressDrop: 35, goalId: relatedGoal?.id || "", goalFunding: 0, redeployAmount: roundMoney(review.targetRelease * 0.65) };
        model.bounds = { targetWeight: { min: 1, max: Math.ceil(review.holding.weight), step: 0.5 }, taxRate: { min: 0, max: 50, step: 0.1 }, stressDrop: { min: 10, max: 60, step: 5 }, goalFunding: { min: 0, max: relatedGoal?.remaining || 0, step: 5000 }, redeployAmount: { min: 0, max: review.targetRelease, step: 5000 } };
        model.assumptions = ["Proceeds remain inside the household unless explicitly earmarked.", "Tax reserve uses an editable effective capital-gains-rate assumption.", "Stress loss uses an editable single-position drawdown assumption.", "Redeployed proceeds are modeled as diversified US equity for allocation impact only."];
      }
    } else if (record.kind === "liquidity") {
      const policyCashPct = 4;
      const targetCash = overview.household.financialAssets * policyCashPct / 100;
      const excessCash = Math.max(0, overview.household.investableCash - targetCash);
      facts.push(
        { label: "Available cash", value: overview.household.investableCash },
        { label: "Current cash", value: `${overview.household.liquidityPct.toFixed(1)}%` },
        { label: "Working reserve", value: `${policyCashPct.toFixed(1)}%` },
        { label: "Excess above reserve", value: roundMoney(excessCash) },
      );
      model.defaults = { deployAmount: roundMoney(excessCash), reservePct: policyCashPct };
      model.bounds = { deployAmount: { min: 0, max: overview.household.investableCash, step: 5000 }, reservePct: { min: 2, max: 15, step: 0.5 } };
      model.assumptions = ["The working cash reserve is an explicit scenario assumption, not a suitability rule.", "Deployment is modeled without changing total financial assets."];
    } else if (record.kind === "goal-funding") {
      const fundingGap = relatedGoal?.remaining || 0;
      facts.push(
        { label: "Goal", value: relatedGoal?.name || "Planning goal" },
        { label: "Current funding", value: relatedGoal ? `${relatedGoal.progress}%` : "—" },
        { label: "Funding gap", value: fundingGap },
        { label: "Available cash", value: overview.household.investableCash },
      );
      model.defaults = { fundingAmount: roundMoney(Math.min(fundingGap, overview.household.investableCash * 0.5)), goalId: relatedGoal?.id || "" };
      model.bounds = { fundingAmount: { min: 0, max: Math.min(fundingGap, overview.household.investableCash), step: 5000 } };
      model.assumptions = ["Funding is modeled from current household cash.", "Goal progress changes only by the explicit amount entered in this scenario."];
    } else if (record.kind === "allocation") {
      const percentages = percentagesFromText(insight?.detail);
      const currentPct = percentages[0] ?? 0;
      const targetPct = percentages[1] ?? Math.max(currentPct, 10);
      const required = Math.max(0, overview.household.financialAssets * (targetPct - currentPct) / 100);
      facts.push(
        { label: "Current municipal allocation", value: `${currentPct.toFixed(1)}%` },
        { label: "Household target", value: `${targetPct.toFixed(1)}%` },
        { label: "Amount to target", value: roundMoney(required) },
        { label: "Available cash", value: overview.household.investableCash },
      );
      model.defaults = { allocationAmount: roundMoney(Math.min(required, overview.household.investableCash)), currentPct, targetPct };
      model.bounds = { allocationAmount: { min: 0, max: Math.min(required || overview.household.investableCash, overview.household.investableCash), step: 5000 } };
      model.assumptions = ["The municipal target comes directly from the household signal evidence.", "The scenario uses available cash and does not imply a recommendation."];
    } else if (record.kind === "upcoming-liquidity") {
      const obligationAmount = moneyFromText(insight?.title) || moneyFromText(insight?.detail);
      facts.push(
        { label: "Upcoming obligation", value: obligationAmount },
        { label: "Available cash", value: overview.household.investableCash },
        { label: "Coverage", value: obligationAmount ? `${(overview.household.investableCash / obligationAmount).toFixed(1)}×` : "—" },
        { label: "Timing", value: insight?.detail || "Upcoming" },
      );
      model.defaults = { obligationAmount, fundingAmount: Math.min(obligationAmount, overview.household.investableCash) };
      model.bounds = { fundingAmount: { min: 0, max: Math.min(obligationAmount || overview.household.investableCash, overview.household.investableCash), step: 5000 } };
      model.assumptions = ["Funding is modeled from currently available household cash.", "The scenario does not assume an investment sale unless cash is insufficient."];
    }

    facts.push({ label: "Risk profile", value: overview.household.riskProfile });
    return detailCache.set(cacheKey, deepFreeze({
      decision: projectDecision(record),
      household: { id: overview.household.id, name: overview.household.name, financialAssets: overview.household.financialAssets, investableCash: overview.household.investableCash, riskProfile: overview.household.riskProfile, location: overview.household.location },
      evidence: { title: insight?.title || record.summary, detail: insight?.detail || record.evidenceSummary, severity: insight?.severity || record.priority, source: record.source },
      facts,
      relatedGoal,
      model,
      planTemplate: planTemplate(record.kind),
    }));
  }

  function modelDecisionScenario(householdId, decisionId, input = {}) {
    const detail = getDecisionDetail(householdId, decisionId);
    if (!detail) return null;
    const record = repository.getDecision(decisionId);
    const overview = wealthService.getHouseholdOverview(householdId);
    const key = `${householdId}\u001f${decisionId}\u001f${JSON.stringify(input)}`;
    const cached = scenarioCache.get(key);
    if (cached) return cached;
    const allocation = new Map(overview.allocation.map((item) => [item.label, item]));
    const usEquity = allocation.get("US equity") || { amount: 0, value: 0 };
    let result;

    if (record.kind === "concentration") {
      const review = wealthService.getHouseholdConcentrationReview(householdId);
      if (!review) return null;
      const targetWeight = clamp(input.targetWeight ?? detail.model.defaults.targetWeight, detail.model.bounds.targetWeight.min, Math.min(detail.model.bounds.targetWeight.max, review.holding.weight));
      const targetValue = roundMoney(overview.household.financialAssets * targetWeight / 100);
      const release = Math.max(0, roundMoney(review.holding.value - targetValue));
      const gainRatio = review.holding.value > 0 ? Math.max(0, review.unrealizedGain / review.holding.value) : 0;
      const realizedGain = roundMoney(release * gainRatio);
      const taxRate = clamp(input.taxRate ?? detail.model.defaults.taxRate, 0, 50);
      const taxReserve = roundMoney(realizedGain * taxRate / 100);
      const stressDrop = clamp(input.stressDrop ?? detail.model.defaults.stressDrop, 10, 60);
      const relatedGoal = detail.relatedGoal;
      const goalFunding = relatedGoal ? clamp(input.goalFunding ?? detail.model.defaults.goalFunding, 0, Math.min(relatedGoal.remaining, release)) : 0;
      const maxRedeploy = Math.max(0, release - goalFunding);
      const redeployAmount = clamp(input.redeployAmount ?? detail.model.defaults.redeployAmount, 0, maxRedeploy);
      const remainingCashProceeds = Math.max(0, release - redeployAmount);
      const afterCash = overview.household.investableCash + remainingCashProceeds;
      const afterUsEquity = Math.max(0, usEquity.amount - release + redeployAmount);
      const goalAfterFunded = relatedGoal ? Math.min(relatedGoal.target, relatedGoal.funded + goalFunding) : 0;
      result = {
        inputs: { targetWeight, taxRate, stressDrop, goalId: relatedGoal?.id || "", goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount) },
        before: { concentrationPct: review.holding.weight, concentrationValue: review.holding.value, cash: overview.household.investableCash, cashPct: overview.household.liquidityPct, usEquityPct: pct(usEquity.amount, overview.household.financialAssets), stressLoss: roundMoney(review.holding.value * stressDrop / 100), goalProgress: relatedGoal?.progress ?? null },
        after: { concentrationPct: pct(targetValue, overview.household.financialAssets), concentrationValue: targetValue, cash: roundMoney(afterCash), cashPct: pct(afterCash, overview.household.financialAssets), usEquityPct: pct(afterUsEquity, overview.household.financialAssets), stressLoss: roundMoney(targetValue * stressDrop / 100), goalProgress: relatedGoal ? Math.round(goalAfterFunded / relatedGoal.target * 100) : null },
        economics: { release, realizedGain, taxReserve, goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount), remainingCashProceeds: roundMoney(remainingCashProceeds) },
        implementation: implementationFor(record, overview, redeployAmount),
        assumptions: detail.model.assumptions,
      };
    } else if (record.kind === "liquidity") {
      const reservePct = clamp(input.reservePct ?? detail.model.defaults.reservePct, 2, 15);
      const reserveAmount = overview.household.financialAssets * reservePct / 100;
      const maxDeploy = Math.max(0, overview.household.investableCash - reserveAmount);
      const deployAmount = clamp(input.deployAmount ?? detail.model.defaults.deployAmount, 0, Math.min(overview.household.investableCash, maxDeploy || overview.household.investableCash));
      const afterCash = overview.household.investableCash - deployAmount;
      result = {
        inputs: { deployAmount: roundMoney(deployAmount), reservePct },
        before: { cash: overview.household.investableCash, cashPct: overview.household.liquidityPct, usEquityPct: pct(usEquity.amount, overview.household.financialAssets) },
        after: { cash: roundMoney(afterCash), cashPct: pct(afterCash, overview.household.financialAssets), usEquityPct: pct(usEquity.amount, overview.household.financialAssets) },
        economics: { deployAmount: roundMoney(deployAmount), reserveAmount: roundMoney(reserveAmount) },
        implementation: implementationFor(record, overview, deployAmount),
        assumptions: detail.model.assumptions,
      };
    } else if (record.kind === "goal-funding") {
      const goal = detail.relatedGoal;
      if (!goal) return null;
      const fundingAmount = clamp(input.fundingAmount ?? detail.model.defaults.fundingAmount, 0, Math.min(goal.remaining, overview.household.investableCash));
      const afterCash = overview.household.investableCash - fundingAmount;
      const afterFunded = Math.min(goal.target, goal.funded + fundingAmount);
      result = {
        inputs: { fundingAmount: roundMoney(fundingAmount), goalId: goal.id },
        before: { cash: overview.household.investableCash, cashPct: overview.household.liquidityPct, goalProgress: goal.progress, goalFunded: goal.funded },
        after: { cash: roundMoney(afterCash), cashPct: pct(afterCash, overview.household.financialAssets), goalProgress: Math.round(afterFunded / goal.target * 100), goalFunded: roundMoney(afterFunded) },
        economics: { fundingAmount: roundMoney(fundingAmount), remainingGap: roundMoney(Math.max(0, goal.target - afterFunded)) },
        implementation: implementationFor(record, overview, 0),
        assumptions: detail.model.assumptions,
      };
    } else if (record.kind === "allocation") {
      const maxAmount = detail.model.bounds.allocationAmount.max;
      const allocationAmount = clamp(input.allocationAmount ?? detail.model.defaults.allocationAmount, 0, maxAmount);
      const afterCash = overview.household.investableCash - allocationAmount;
      const currentPct = detail.model.defaults.currentPct;
      const afterPct = currentPct + allocationAmount / overview.household.financialAssets * 100;
      result = {
        inputs: { allocationAmount: roundMoney(allocationAmount) },
        before: { allocationPct: currentPct, cash: overview.household.investableCash, cashPct: overview.household.liquidityPct },
        after: { allocationPct: Number(afterPct.toFixed(1)), cash: roundMoney(afterCash), cashPct: pct(afterCash, overview.household.financialAssets) },
        economics: { allocationAmount: roundMoney(allocationAmount), targetPct: detail.model.defaults.targetPct },
        implementation: implementationFor(record, overview, allocationAmount),
        assumptions: detail.model.assumptions,
      };
    } else {
      const obligationAmount = detail.model.defaults.obligationAmount || 0;
      const fundingAmount = clamp(input.fundingAmount ?? detail.model.defaults.fundingAmount, 0, Math.min(obligationAmount || overview.household.investableCash, overview.household.investableCash));
      const afterCash = overview.household.investableCash - fundingAmount;
      result = {
        inputs: { fundingAmount: roundMoney(fundingAmount), obligationAmount },
        before: { cash: overview.household.investableCash, cashPct: overview.household.liquidityPct, obligationCoveredPct: obligationAmount ? 0 : 100 },
        after: { cash: roundMoney(afterCash), cashPct: pct(afterCash, overview.household.financialAssets), obligationCoveredPct: obligationAmount ? Math.min(100, Math.round(fundingAmount / obligationAmount * 100)) : 100 },
        economics: { fundingAmount: roundMoney(fundingAmount), remainingObligation: roundMoney(Math.max(0, obligationAmount - fundingAmount)) },
        implementation: implementationFor(record, overview, 0),
        assumptions: detail.model.assumptions,
      };
    }

    return scenarioCache.set(key, deepFreeze({ householdId, decisionId, scenarioType: record.scenarioType, ...result }));
  }

  function getHouseholdTimeline(householdId) {
    const cached = timelineCache.get(householdId);
    if (cached) return cached;
    if (!repository.getHousehold(householdId)) return null;
    const events = [...repository.listHouseholdEvents(householdId)].sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)) || left.title.localeCompare(right.title));
    return timelineCache.set(householdId, deepFreeze(events.map((event) => ({ id: event.id, decisionId: event.decisionId || null, type: event.type, occurredAt: event.occurredAt, title: event.title, detail: event.detail, source: event.source }))));
  }

  function getMeetingBrief(householdId) {
    const cached = meetingCache.get(householdId);
    if (cached) return cached;
    const overview = wealthService.getHouseholdOverview(householdId);
    const summary = getHouseholdDecisionSummary(householdId);
    if (!overview || !summary) return null;
    const timeline = getHouseholdTimeline(householdId);
    const openDecisions = summary.decisions.filter((decision) => !CLOSED_STATUSES.has(decision.status));
    const plans = openDecisions.filter((decision) => ACTIVE_PLAN_STATUSES.has(decision.status));
    const upcoming = overview.insights.filter((insight) => insight.severity === "Upcoming");
    const changes = [
      { label: "YTD net-worth change", value: overview.household.ytdChange },
      { label: "Investable cash", value: overview.household.investableCash },
      { label: "Largest position", value: overview.holdings[0] ? `${overview.holdings[0].symbol} · ${overview.holdings[0].weight.toFixed(1)}%` : "—" },
      { label: "Goals on track", value: `${overview.household.goalsOnTrack} of ${overview.household.goalsTotal}` },
    ];
    return meetingCache.set(householdId, deepFreeze({
      household: { id: overview.household.id, name: overview.household.name, members: overview.household.members, relationshipType: overview.household.relationshipType, lastPlanningReview: overview.household.lastPlanningReview, asOf: overview.household.asOf },
      changes,
      openDecisions: openDecisions.slice(0, 5),
      plansInProgress: plans.slice(0, 4),
      upcoming: upcoming.slice(0, 4),
      discussionItems: openDecisions.slice(0, 4).map((decision) => ({ title: decision.title, detail: decision.evidenceSummary, status: decision.status })),
      recentActivity: timeline.slice(0, 6),
    }));
  }

  return Object.freeze({
    schemaVersion: repository.schemaVersion,
    getHouseholdDecisionSummary,
    getDecisionDetail,
    modelDecisionScenario,
    getHouseholdTimeline,
    getMeetingBrief,
  });
}
