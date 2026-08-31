const EMPTY = Object.freeze([]);
const REQUIRED_COLLECTIONS = Object.freeze([
  "advisors",
  "households",
  "accounts",
  "accountAllocations",
  "positions",
  "householdAllocationSnapshots",
  "householdHoldingSnapshots",
  "nonFinancialAssets",
  "liabilities",
  "goals",
  "insights",
  "concentrationPolicies",
  "histories",
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid wealth dataset: ${message}`);
}

function buildIdIndex(records, label) {
  const index = new Map();
  for (const record of records) {
    assert(record && typeof record === "object", `${label} contains a non-object record`);
    assert(typeof record.id === "string" && record.id.length > 0, `${label} record is missing id`);
    assert(!index.has(record.id), `${label} contains duplicate id ${record.id}`);
    index.set(record.id, record);
  }
  return index;
}

function buildGroupIndex(records, key) {
  const index = new Map();
  for (const record of records) {
    const value = record[key];
    if (!index.has(value)) index.set(value, []);
    index.get(value).push(record);
  }
  for (const [value, group] of index) index.set(value, Object.freeze(group));
  return index;
}

function compositeKey(...parts) {
  return parts.join("\u001f");
}

function buildHouseholdInstrumentIndex(records) {
  const index = new Map();
  for (const record of records) {
    const key = compositeKey(record.householdId, record.instrumentId);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }
  for (const [key, group] of index) index.set(key, Object.freeze(group));
  return index;
}

function assertForeignKey(records, field, target, label) {
  for (const record of records) assert(target.has(record[field]), `${label} ${record.id} references missing ${field} ${record[field]}`);
}

export function createWealthRepository(dataset) {
  assert(dataset && typeof dataset === "object", "dataset must be an object");
  assert(dataset.schemaVersion === 1, `unsupported schemaVersion ${dataset.schemaVersion}`);
  for (const collection of REQUIRED_COLLECTIONS) assert(Array.isArray(dataset[collection]), `${collection} must be an array`);

  const advisorsById = buildIdIndex(dataset.advisors, "advisors");
  const householdsById = buildIdIndex(dataset.households, "households");
  const accountsById = buildIdIndex(dataset.accounts, "accounts");
  const accountAllocationsById = buildIdIndex(dataset.accountAllocations, "accountAllocations");
  const positionsById = buildIdIndex(dataset.positions, "positions");
  const householdAllocationSnapshotsById = buildIdIndex(dataset.householdAllocationSnapshots, "householdAllocationSnapshots");
  const householdHoldingSnapshotsById = buildIdIndex(dataset.householdHoldingSnapshots, "householdHoldingSnapshots");
  const nonFinancialAssetsById = buildIdIndex(dataset.nonFinancialAssets, "nonFinancialAssets");
  const liabilitiesById = buildIdIndex(dataset.liabilities, "liabilities");
  const goalsById = buildIdIndex(dataset.goals, "goals");
  const insightsById = buildIdIndex(dataset.insights, "insights");
  const concentrationPoliciesById = buildIdIndex(dataset.concentrationPolicies, "concentrationPolicies");
  const historiesById = buildIdIndex(dataset.histories, "histories");

  assertForeignKey(dataset.households, "advisorId", advisorsById, "household");
  assertForeignKey(dataset.accounts, "householdId", householdsById, "account");
  assertForeignKey(dataset.accountAllocations, "accountId", accountsById, "account allocation");
  assertForeignKey(dataset.positions, "householdId", householdsById, "position");
  assertForeignKey(dataset.positions, "accountId", accountsById, "position");
  assertForeignKey(dataset.householdAllocationSnapshots, "householdId", householdsById, "household allocation snapshot");
  assertForeignKey(dataset.householdHoldingSnapshots, "householdId", householdsById, "household holding snapshot");
  assertForeignKey(dataset.nonFinancialAssets, "householdId", householdsById, "non-financial asset");
  assertForeignKey(dataset.liabilities, "householdId", householdsById, "liability");
  assertForeignKey(dataset.goals, "householdId", householdsById, "goal");
  assertForeignKey(dataset.insights, "householdId", householdsById, "insight");
  assertForeignKey(dataset.concentrationPolicies, "householdId", householdsById, "concentration policy");
  assertForeignKey(dataset.histories, "householdId", householdsById, "history");

  for (const position of dataset.positions) {
    const account = accountsById.get(position.accountId);
    assert(account.householdId === position.householdId, `position ${position.id} crosses household/account boundaries`);
  }
  for (const account of dataset.accounts) {
    assert(Number.isFinite(account.marketValue) && account.marketValue >= 0, `account ${account.id} has invalid marketValue`);
    assert(Number.isFinite(account.cashBalance) && account.cashBalance >= 0 && account.cashBalance <= account.marketValue, `account ${account.id} has invalid cashBalance`);
  }

  const accountsByHousehold = buildGroupIndex(dataset.accounts, "householdId");
  const allocationsByAccount = buildGroupIndex(dataset.accountAllocations, "accountId");
  const positionsByAccount = buildGroupIndex(dataset.positions, "accountId");
  const positionsByHouseholdInstrument = buildHouseholdInstrumentIndex(dataset.positions);
  const allocationSnapshotsByHousehold = buildGroupIndex(dataset.householdAllocationSnapshots, "householdId");
  const holdingSnapshotsByHousehold = buildGroupIndex(dataset.householdHoldingSnapshots, "householdId");
  const nonFinancialAssetsByHousehold = buildGroupIndex(dataset.nonFinancialAssets, "householdId");
  const liabilitiesByHousehold = buildGroupIndex(dataset.liabilities, "householdId");
  const goalsByHousehold = buildGroupIndex(dataset.goals, "householdId");
  const insightsByHousehold = buildGroupIndex(dataset.insights, "householdId");
  const concentrationPoliciesByHousehold = buildGroupIndex(dataset.concentrationPolicies, "householdId");
  const historiesByHousehold = buildGroupIndex(dataset.histories, "householdId");

  const stats = Object.freeze(Object.fromEntries(REQUIRED_COLLECTIONS.map((collection) => [collection, dataset[collection].length])));

  return Object.freeze({
    schemaVersion: dataset.schemaVersion,
    stats,
    getAdvisor: (id) => advisorsById.get(id) || null,
    getHousehold: (id) => householdsById.get(id) || null,
    getAccount: (id) => accountsById.get(id) || null,
    getGoal: (id) => goalsById.get(id) || null,
    listHouseholdIds: () => Object.freeze([...householdsById.keys()]),
    listHouseholdAccounts: (householdId) => accountsByHousehold.get(householdId) || EMPTY,
    listAccountAllocations: (accountId) => allocationsByAccount.get(accountId) || EMPTY,
    listAccountPositions: (accountId) => positionsByAccount.get(accountId) || EMPTY,
    listHouseholdPositionsByInstrument: (householdId, instrumentId) => positionsByHouseholdInstrument.get(compositeKey(householdId, instrumentId)) || EMPTY,
    listHouseholdAllocationSnapshots: (householdId) => allocationSnapshotsByHousehold.get(householdId) || EMPTY,
    listHouseholdHoldingSnapshots: (householdId) => holdingSnapshotsByHousehold.get(householdId) || EMPTY,
    listHouseholdNonFinancialAssets: (householdId) => nonFinancialAssetsByHousehold.get(householdId) || EMPTY,
    listHouseholdLiabilities: (householdId) => liabilitiesByHousehold.get(householdId) || EMPTY,
    listHouseholdGoals: (householdId) => goalsByHousehold.get(householdId) || EMPTY,
    listHouseholdInsights: (householdId) => insightsByHousehold.get(householdId) || EMPTY,
    listHouseholdConcentrationPolicies: (householdId) => concentrationPoliciesByHousehold.get(householdId) || EMPTY,
    listHouseholdHistories: (householdId) => historiesByHousehold.get(householdId) || EMPTY,
  });
}
