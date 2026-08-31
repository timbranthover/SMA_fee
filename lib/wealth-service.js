import { createWealthRepository } from "./wealth-repository.js";

const DEFAULT_CACHE_LIMITS = Object.freeze({
  overview: 250,
  account: 1000,
  goal: 1000,
  concentration: 250,
  history: 100,
  workspace: 50,
});

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
  return {
    id: record.id,
    name: record.name,
    timing: record.timing,
    status: record.status,
    progress: goalProgress(record),
    tone: record.tone,
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
  return { id: record.id, severity: record.severity, tone: record.tone, title: record.title, detail: record.detail, action: record.action };
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
    cash: record.cashBalance,
  };
}

export function createWealthService(dataset, { cacheLimits = {} } = {}) {
  const repository = createWealthRepository(dataset);
  const limits = { ...DEFAULT_CACHE_LIMITS, ...cacheLimits };
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
    return accountCache.set(cacheKey, deepFreeze({
      ...projectAccountSummary(account),
      purpose: account.purpose,
      taxTreatment: account.taxTreatment,
      unrealizedGain: account.unrealizedGain,
      lastReconciled: account.lastReconciled,
      mix: repository.listAccountAllocations(account.id).map((item) => ({ label: item.label, value: item.weightPct, tone: item.tone })),
      holdings: repository.listAccountPositions(account.id).map(projectPosition),
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

    const household = {
      id: record.id,
      name: record.name,
      advisor: advisor?.displayName || record.advisorId,
      asOf: record.asOf,
      netWorth: financialAssets + nonFinancialAssets - liabilities,
      financialAssets,
      nonFinancialAssets,
      liabilities,
      investableCash,
      ytdChange: record.ytdChangeAmount,
      ytdReturn: record.ytdReturnPct,
      riskProfile: record.riskProfile,
      goalsOnTrack: goalRecords.filter((goal) => goal.tone === "good").length,
      goalsTotal: goalRecords.length,
    };

    return overviewCache.set(householdId, deepFreeze({
      household,
      allocation: repository.listHouseholdAllocationSnapshots(householdId).map(projectAllocation),
      accounts: accountRecords.map(projectAccountSummary),
      holdings: repository.listHouseholdHoldingSnapshots(householdId).map(projectHouseholdHolding),
      goals: goalRecords.map(projectGoalSummary),
      insights: repository.listHouseholdInsights(householdId).map(projectInsight),
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
    const positions = repository.listHouseholdPositionsByInstrument(householdId, policy.instrumentId);
    return concentrationCache.set(householdId, deepFreeze({
      holding,
      targetWeight: policy.targetWeightPct,
      unrealizedGain: sum(positions, (position) => position.unrealizedGain),
      costBasis: sum(positions, (position) => position.marketValue - position.unrealizedGain),
      accounts: positions.map((position) => ({
        name: repository.getAccount(position.accountId)?.name || position.accountId,
        value: position.marketValue,
        weight: position.accountWeightPct,
        gain: position.unrealizedGain,
      })),
      scenarios: policy.scenarios,
      research: policy.research,
    }));
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
    getHouseholdOverview,
    getHouseholdWorkspace,
    getHouseholdAccount,
    getHouseholdGoal,
    getHouseholdHistory,
    getHouseholdConcentrationReview,
  });
}
