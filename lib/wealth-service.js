import { createWealthRepository } from "./wealth-repository.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function sum(records, getter) {
  return records.reduce((total, record) => total + Number(getter(record) || 0), 0);
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

function projectGoal(record) {
  return {
    id: record.id,
    name: record.name,
    timing: record.timing,
    status: record.status,
    progress: record.targetAmount > 0 ? Math.round(record.fundedAmount / record.targetAmount * 100) : 0,
    tone: record.tone,
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

export function createWealthService(dataset) {
  const repository = createWealthRepository(dataset);
  const accountCache = new Map();
  const workspaceCache = new Map();

  function getHouseholdAccount(householdId, accountId) {
    const cacheKey = `${householdId}\u001f${accountId}`;
    if (accountCache.has(cacheKey)) return accountCache.get(cacheKey);
    const account = repository.getAccount(accountId);
    if (!account || account.householdId !== householdId) return null;
    const projected = deepFreeze({
      id: account.id,
      name: account.name,
      registration: account.registration,
      value: account.marketValue,
      allocation: account.allocationLabel,
      change: account.ytdReturnPct,
      purpose: account.purpose,
      taxTreatment: account.taxTreatment,
      program: account.program,
      cash: account.cashBalance,
      unrealizedGain: account.unrealizedGain,
      lastReconciled: account.lastReconciled,
      mix: repository.listAccountAllocations(account.id).map((item) => ({ label: item.label, value: item.weightPct, tone: item.tone })),
      holdings: repository.listAccountPositions(account.id).map(projectPosition),
    });
    accountCache.set(cacheKey, projected);
    return projected;
  }

  function getHouseholdGoal(householdId, goalId) {
    const goal = repository.getGoal(goalId);
    return goal?.householdId === householdId ? deepFreeze(projectGoal(goal)) : null;
  }

  function getHouseholdWorkspace(householdId) {
    if (workspaceCache.has(householdId)) return workspaceCache.get(householdId);
    const record = repository.getHousehold(householdId);
    if (!record) return null;

    const advisor = repository.getAdvisor(record.advisorId);
    const accountRecords = repository.listHouseholdAccounts(householdId);
    const accounts = accountRecords.map((account) => getHouseholdAccount(householdId, account.id));
    const goals = repository.listHouseholdGoals(householdId).map(projectGoal);
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
      goalsOnTrack: goals.filter((goal) => goal.tone === "good").length,
      goalsTotal: goals.length,
    };

    const allocation = repository.listHouseholdAllocationSnapshots(householdId).map(projectAllocation);
    const holdings = repository.listHouseholdHoldingSnapshots(householdId).map(projectHouseholdHolding);
    const insights = repository.listHouseholdInsights(householdId).map(projectInsight);
    const history = repository.listHouseholdHistories(householdId).find((item) => item.metric === "investable-wealth-usd-millions")?.points || [];

    const policies = repository.listHouseholdConcentrationPolicies(householdId);
    const policy = policies.find((item) => item.isPrimary) || policies[0] || null;
    let concentrationReview = null;
    if (policy) {
      const holdingSnapshot = repository.listHouseholdHoldingSnapshots(householdId).find((item) => item.instrumentId === policy.instrumentId);
      const holding = holdingSnapshot ? projectHouseholdHolding(holdingSnapshot) : null;
      const positions = repository.listHouseholdPositionsByInstrument(householdId, policy.instrumentId);
      concentrationReview = {
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
      };
    }

    const workspace = deepFreeze({ household, allocation, accounts, holdings, goals, insights, concentrationReview, history });
    workspaceCache.set(householdId, workspace);
    return workspace;
  }

  return Object.freeze({
    schemaVersion: repository.schemaVersion,
    getRepositoryStats: () => repository.stats,
    listHouseholdIds: repository.listHouseholdIds,
    getHouseholdWorkspace,
    getHouseholdAccount,
    getHouseholdGoal,
  });
}
