import { createWealthRepository } from "./wealth-repository.js";

const ACTIVE_PLAN_STATUSES = new Set(["Plan drafted", "Client discussion", "In progress"]);
const CLOSED_DECISION_STATUSES = new Set(["Complete"]);

const DEFAULT_CACHE_LIMITS = Object.freeze({
  book: 20,
  overview: 250,
  account: 1000,
  goal: 1000,
  concentration: 250,
  history: 100,
  workspace: 50,
});
const DEFAULT_PROJECTION_LIMITS = Object.freeze({ topHoldings: 5, priorityInsights: 5, accountHoldings: 10 });

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function sum(records, getter) {
  return records.reduce((total, record) => total + Number(getter(record) || 0), 0);
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

function projectAllocation(record) {
  return { label: record.label, value: record.weightPct, amount: record.marketValue, tone: record.tone };
}

function projectPosition(record) {
  return { symbol: record.symbol, name: record.name, value: record.marketValue, weight: record.accountWeightPct, brandKey: record.brandKey };
}

function projectHouseholdHolding(record) {
  return { symbol: record.symbol, name: record.name, value: record.marketValue, weight: record.householdWeightPct, change: record.ytdReturnPct, brandKey: record.brandKey };
}

function goalProgress(record) {
  return record.targetAmount > 0 ? Math.round(record.fundedAmount / record.targetAmount * 100) : 0;
}

function projectGoalSummary(record) {
  const statusKey = String(record.status || "review").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tone = statusKey === "on-track" || statusKey === "funded" ? "good" : statusKey === "off-track" ? "risk" : "watch";
  return {
    id: record.id,
    name: record.name,
    timing: record.timing,
    status: record.status,
    progress: goalProgress(record),
    statusKey,
    tone,
  };
}

function projectGoal(record) {
  return {
    ...projectGoalSummary(record),
    target: record.targetAmount,
    funded: record.fundedAmount,
    confidence: record.confidencePct,
    annualFunding: record.annualFundingAmount,
    nextReview: record.nextReview,
    owner: record.owner,
    action: record.action,
  };
}

function projectInsight(record) {
  return {
    id: record.id,
    kind: record.kind || "detail",
    severity: record.severity,
    tone: record.tone,
    title: record.title,
    detail: record.detail,
    actionLabel: record.actionLabel || record.action || "View",
    action: record.actionMetadata || { type: "detail" },
    details: record.details || null,
  };
}

function projectAccountSummary(record) {
  return {
    id: record.id,
    name: record.name,
    registration: record.registration,
    value: record.marketValue,
    allocation: record.allocationLabel,
    change: record.ytdReturnPct,
    program: record.program,
    custodyType: record.custodyType,
    currency: record.currency,
    sourceSystem: record.sourceSystem,
    cash: record.cashBalance,
    lastReconciled: record.lastReconciled,
  };
}

function priorityRank(insight) {
  if (!insight) return 0;
  if (insight.tone === "red") return 5;
  if (insight.severity === "Upcoming") return 4;
  if (insight.tone === "amber") return 3;
  if (insight.tone === "green") return 2;
  return 1;
}

function choosePriority(insights) {
  return [...insights].sort((left, right) => priorityRank(right) - priorityRank(left))[0] || null;
}

export function createWealthService(dataset, { cacheLimits = {}, projectionLimits = {}, repository: repositoryOverride = null } = {}) {
  const repository = repositoryOverride || createWealthRepository(dataset);
  const limits = { ...DEFAULT_CACHE_LIMITS, ...cacheLimits };
  const projections = { ...DEFAULT_PROJECTION_LIMITS, ...projectionLimits };
  const bookCache = createLruCache(limits.book);
  const overviewCache = createLruCache(limits.overview);
  const accountCache = createLruCache(limits.account);
  const goalCache = createLruCache(limits.goal);
  const concentrationCache = createLruCache(limits.concentration);
  const historyCache = createLruCache(limits.history);
  const workspaceCache = createLruCache(limits.workspace);

  function getHouseholdAccount(householdId, accountId) {
    const cacheKey = `${householdId}\u001f${accountId}`;
    const cached = accountCache.get(cacheKey);
    if (cached) return cached;
    const account = repository.getAccount(accountId);
    if (!account || account.householdId !== householdId) return null;
    const positions = [...repository.listAccountPositions(account.id)].sort((left, right) => right.marketValue - left.marketValue);
    return accountCache.set(cacheKey, deepFreeze({
      ...projectAccountSummary(account),
      purpose: account.purpose,
      taxTreatment: account.taxTreatment,
      unrealizedGain: account.unrealizedGain,
      lastReconciled: account.lastReconciled,
      mix: repository.listAccountAllocations(account.id).map((item) => ({ label: item.label, value: item.weightPct, tone: item.tone })),
      holdings: positions.slice(0, projections.accountHoldings).map(projectPosition),
      holdingsTotal: positions.length,
    }));
  }

  function getHouseholdGoal(householdId, goalId) {
    const cacheKey = `${householdId}\u001f${goalId}`;
    const cached = goalCache.get(cacheKey);
    if (cached) return cached;
    const goal = repository.getGoal(goalId);
    if (!goal || goal.householdId !== householdId) return null;
    return goalCache.set(cacheKey, deepFreeze(projectGoal(goal)));
  }

  function getHouseholdOverview(householdId) {
    const cached = overviewCache.get(householdId);
    if (cached) return cached;
    const record = repository.getHousehold(householdId);
    if (!record) return null;

    const advisor = repository.getAdvisor(record.advisorId);
    const accountRecords = repository.listHouseholdAccounts(householdId);
    const goalRecords = repository.listHouseholdGoals(householdId);
    const financialAssets = sum(accountRecords, (account) => account.marketValue);
    const nonFinancialAssets = sum(repository.listHouseholdNonFinancialAssets(householdId), (asset) => asset.marketValue);
    const liabilities = sum(repository.listHouseholdLiabilities(householdId), (liability) => liability.balance);
    const investableCash = sum(accountRecords, (account) => account.cashBalance);
    const heldAwayAssets = sum(accountRecords.filter((account) => account.custodyType === "held-away"), (account) => account.marketValue);

    const household = {
      id: record.id,
      name: record.name,
      initials: record.initials || record.name.split(/[\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      advisorId: record.advisorId,
      advisor: advisor?.displayName || record.advisorId,
      advisorInitials: advisor?.initials || (advisor?.displayName || record.advisorId).split(/[\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      advisorWorkspace: advisor?.workspaceLabel || "Advisor workspace",
      relationshipType: record.relationshipType || "Primary relationship",
      location: record.location || "—",
      members: record.members || [],
      entitySummary: record.entitySummary || "Household entities",
      serviceModel: record.serviceModel || "Advisory",
      lastPlanningReview: record.lastPlanningReview || "—",
      asOf: record.asOf,
      netWorth: financialAssets + nonFinancialAssets - liabilities,
      financialAssets,
      nonFinancialAssets,
      liabilities,
      investableCash,
      liquidityPct: financialAssets ? investableCash / financialAssets * 100 : 0,
      heldAwayAssets,
      heldAwayCount: accountRecords.filter((account) => account.custodyType === "held-away").length,
      custodiedCount: accountRecords.filter((account) => account.custodyType !== "held-away").length,
      accountCount: accountRecords.length,
      hasConcentrationPolicy: repository.listHouseholdConcentrationPolicies(householdId).length > 0,
      ytdChange: record.ytdChangeAmount,
      ytdReturn: record.ytdReturnPct,
      netFlows: record.netFlowsAmount || 0,
      riskProfile: record.riskProfile,
      goalsOnTrack: goalRecords.map(projectGoalSummary).filter((goal) => goal.statusKey === "on-track" || goal.statusKey === "funded").length,
      goalsTotal: goalRecords.length,
    };

    return overviewCache.set(householdId, deepFreeze({
      household,
      allocation: repository.listHouseholdAllocationSnapshots(householdId).map(projectAllocation),
      accounts: accountRecords.map(projectAccountSummary),
      holdings: [...repository.listHouseholdHoldingSnapshots(householdId)].sort((left, right) => right.marketValue - left.marketValue).slice(0, projections.topHoldings).map(projectHouseholdHolding),
      goals: goalRecords.map(projectGoalSummary),
      insights: [...repository.listHouseholdInsights(householdId)].sort((left, right) => priorityRank(right) - priorityRank(left)).slice(0, projections.priorityInsights).map(projectInsight),
    }));
  }

  function getHouseholdHistory(householdId) {
    const cached = historyCache.get(householdId);
    if (cached) return cached;
    if (!repository.getHousehold(householdId)) return null;
    const history = repository.listHouseholdHistories(householdId).find((item) => item.metric === "investable-wealth-usd-millions")?.points || [];
    return historyCache.set(householdId, deepFreeze([...history]));
  }

  function getHouseholdConcentrationReview(householdId) {
    const cached = concentrationCache.get(householdId);
    if (cached) return cached;
    if (!repository.getHousehold(householdId)) return null;
    const policies = repository.listHouseholdConcentrationPolicies(householdId);
    const policy = policies.find((item) => item.isPrimary) || policies[0] || null;
    if (!policy) return null;

    const holdingSnapshot = repository.listHouseholdHoldingSnapshots(householdId).find((item) => item.instrumentId === policy.instrumentId);
    const holding = holdingSnapshot ? projectHouseholdHolding(holdingSnapshot) : null;
    if (!holding) return null;
    const positions = repository.listHouseholdPositionsByInstrument(householdId, policy.instrumentId);
    const financialAssets = sum(repository.listHouseholdAccounts(householdId), (account) => account.marketValue);
    return concentrationCache.set(householdId, deepFreeze({
      holding,
      targetWeight: policy.targetWeightPct,
      targetRelease: Math.max(0, holding.value - financialAssets * policy.targetWeightPct / 100),
      riskContribution: policy.modeledRiskContributionPct || null,
      unrealizedGain: sum(positions, (position) => position.unrealizedGain),
      costBasis: sum(positions, (position) => position.marketValue - position.unrealizedGain),
      accounts: positions.map((position) => ({
        name: repository.getAccount(position.accountId)?.name || position.accountId,
        registration: repository.getAccount(position.accountId)?.registration || "Account",
        value: position.marketValue,
        weight: position.accountWeightPct,
        gain: position.unrealizedGain,
      })),
      scenarios: policy.scenarios,
      research: policy.research,
      searchIntent: policy.searchIntent || null,
    }));
  }

  function buildBookHousehold(record) {
    const householdId = record.id;
    const accounts = repository.listHouseholdAccounts(householdId);
    const goals = repository.listHouseholdGoals(householdId);
    const goalSummaries = goals.map(projectGoalSummary);
    const insights = repository.listHouseholdInsights(householdId).map(projectInsight);
    const decisions = repository.listHouseholdDecisions(householdId);
    const openDecisions = decisions.filter((decision) => !CLOSED_DECISION_STATUSES.has(decision.status));
    const plans = openDecisions.filter((decision) => ACTIVE_PLAN_STATUSES.has(decision.status));
    const financialAssets = sum(accounts, (account) => account.marketValue);
    const nonFinancialAssets = sum(repository.listHouseholdNonFinancialAssets(householdId), (asset) => asset.marketValue);
    const liabilities = sum(repository.listHouseholdLiabilities(householdId), (liability) => liability.balance);
    const cash = sum(accounts, (account) => account.cashBalance);
    const heldAway = sum(accounts.filter((account) => account.custodyType === "held-away"), (account) => account.marketValue);
    const priority = choosePriority(insights);
    const focus = [];
    if (insights.some((insight) => insight.tone === "red")) focus.push("priority");
    if (insights.some((insight) => insight.severity === "Opportunity") || (financialAssets && cash / financialAssets >= 0.10)) focus.push("cash");
    if (goalSummaries.some((goal) => goal.statusKey !== "on-track" && goal.statusKey !== "funded")) focus.push("goals");
    if (insights.some((insight) => insight.severity === "Upcoming")) focus.push("upcoming");
    if (heldAway > 0) focus.push("held-away");
    if (openDecisions.length) focus.push("decisions");
    if (plans.length) focus.push("plans");
    return deepFreeze({
      id: record.id,
      name: record.name,
      initials: record.initials || record.name.split(/[\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      location: record.location || "—",
      relationshipType: record.relationshipType || "Primary relationship",
      riskProfile: record.riskProfile,
      financialAssets,
      netWorth: financialAssets + nonFinancialAssets - liabilities,
      cash,
      cashPct: financialAssets ? cash / financialAssets * 100 : 0,
      heldAway,
      ytdReturn: record.ytdReturnPct,
      ytdChange: record.ytdChangeAmount,
      accountCount: accounts.length,
      goalsOnTrack: goalSummaries.filter((goal) => goal.statusKey === "on-track" || goal.statusKey === "funded").length,
      goalsTotal: goals.length,
      attentionCount: insights.filter((insight) => insight.tone === "red" || insight.tone === "amber" || insight.tone === "green").length,
      openDecisionCount: openDecisions.length,
      planCount: plans.length,
      decisionStatus: plans[0]?.status || openDecisions[0]?.status || null,
      priority: priority ? { severity: priority.severity, tone: priority.tone, title: priority.title, detail: priority.detail } : null,
      priorityScore: priorityRank(priority),
      focus,
      asOf: record.asOf,
      searchText: `${record.name} ${record.location || ""} ${record.riskProfile || ""} ${priority?.title || ""} ${openDecisions.map((decision) => decision.title).join(" ")}`.toLowerCase(),
    });
  }

  function getAdvisorBookBase(advisorId) {
    const cached = bookCache.get(advisorId);
    if (cached) return cached;
    const advisor = repository.getAdvisor(advisorId);
    if (!advisor) return null;
    const items = repository.listAdvisorHouseholds(advisorId).map(buildBookHousehold);
    const focusKeys = ["priority", "cash", "goals", "upcoming", "held-away", "decisions", "plans"];
    const focusCounts = Object.fromEntries(focusKeys.map((key) => [key, items.filter((item) => item.focus.includes(key)).length]));
    const asOf = items.find((item) => item.asOf)?.asOf || null;
    const metrics = {
      householdCount: items.length,
      financialAssets: sum(items, (item) => item.financialAssets),
      netWorth: sum(items, (item) => item.netWorth),
      investableCash: sum(items, (item) => item.cash),
      heldAwayAssets: sum(items, (item) => item.heldAway),
      attentionHouseholds: items.filter((item) => item.priorityScore >= 3).length,
      openDecisions: sum(items, (item) => item.openDecisionCount),
      plansInProgress: sum(items, (item) => item.planCount),
    };
    return bookCache.set(advisorId, deepFreeze({
      advisor: { id: advisor.id, displayName: advisor.displayName, initials: advisor.initials || advisor.displayName.split(/[\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), workspaceLabel: advisor.workspaceLabel },
      asOf,
      metrics,
      focusCounts,
      items,
    }));
  }

  function getAdvisorBook(advisorId, { query = "", focus = "all", sort = "attention", cursor = 0, pageSize = 80 } = {}) {
    const base = getAdvisorBookBase(advisorId);
    if (!base) return null;
    const normalizedQuery = String(query || "").trim().toLowerCase();
    let items = base.items.filter((item) => (!normalizedQuery || item.searchText.includes(normalizedQuery)) && (focus === "all" || item.focus.includes(focus)));
    const sorters = {
      attention: (left, right) => right.priorityScore - left.priorityScore || right.netWorth - left.netWorth || left.name.localeCompare(right.name),
      "net-worth-desc": (left, right) => right.netWorth - left.netWorth || left.name.localeCompare(right.name),
      "cash-desc": (left, right) => right.cash - left.cash || right.netWorth - left.netWorth,
      "return-desc": (left, right) => right.ytdReturn - left.ytdReturn || right.netWorth - left.netWorth,
      "name-asc": (left, right) => left.name.localeCompare(right.name),
    };
    items = [...items].sort(sorters[sort] || sorters.attention);
    const safeCursor = Math.max(0, Number(cursor) || 0);
    const safePageSize = Math.max(1, Math.min(200, Number(pageSize) || 80));
    const page = items.slice(safeCursor, safeCursor + safePageSize).map(({ searchText, priorityScore, ...item }) => item);
    const nextCursor = safeCursor + page.length < items.length ? safeCursor + page.length : null;
    return deepFreeze({
      advisor: base.advisor,
      asOf: base.asOf,
      metrics: base.metrics,
      focusCounts: base.focusCounts,
      items: page,
      total: items.length,
      cursor: safeCursor,
      nextCursor,
      pageSize: safePageSize,
    });
  }

  function getHouseholdWorkspace(householdId) {
    const cached = workspaceCache.get(householdId);
    if (cached) return cached;
    const overview = getHouseholdOverview(householdId);
    if (!overview) return null;
    return workspaceCache.set(householdId, deepFreeze({
      ...overview,
      accounts: overview.accounts.map((account) => getHouseholdAccount(householdId, account.id)),
      goals: overview.goals.map((goal) => getHouseholdGoal(householdId, goal.id)),
      concentrationReview: getHouseholdConcentrationReview(householdId),
      history: getHouseholdHistory(householdId),
    }));
  }

  return Object.freeze({
    schemaVersion: repository.schemaVersion,
    getRepositoryStats: () => repository.stats,
    listHouseholdIds: repository.listHouseholdIds,
    getAdvisorBook,
    householdBelongsToAdvisor: (advisorId, householdId) => repository.getHousehold(householdId)?.advisorId === advisorId,
    getHouseholdOverview,
    getHouseholdWorkspace,
    getHouseholdAccount,
    getHouseholdGoal,
    getHouseholdHistory,
    getHouseholdConcentrationReview,
  });
}
