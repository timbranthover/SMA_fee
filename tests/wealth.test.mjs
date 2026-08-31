import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getHouseholdProjection, parseHouseholdId } from "../api/wealth.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthClientService } from "../lib/wealth-service.js";
import { MORRISON_WEALTH_DATASET } from "../lib/wealth-source.js";

const DEFAULT_HOUSEHOLD_ID = "household-morrison";
const wealthClientService = createWealthClientService(MORRISON_WEALTH_DATASET);
const defaultWorkspace = wealthClientService.getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
const HOUSEHOLD = defaultWorkspace.household;
const WEALTH_ALLOCATION = defaultWorkspace.allocation;
const HOUSEHOLD_ACCOUNTS = defaultWorkspace.accounts;
const HOUSEHOLD_HOLDINGS = defaultWorkspace.holdings;
const HOUSEHOLD_GOALS = defaultWorkspace.goals;
const HOUSEHOLD_INSIGHTS = defaultWorkspace.insights;
const CONCENTRATION_REVIEW = defaultWorkspace.concentrationReview;
const WEALTH_HISTORY = defaultWorkspace.history;

test("the synthetic household is internally coherent and decision-useful", () => {
  assert.equal(HOUSEHOLD.name, "Morrison Household");
  assert.equal(HOUSEHOLD.netWorth, HOUSEHOLD.financialAssets + HOUSEHOLD.nonFinancialAssets - HOUSEHOLD.liabilities);
  assert.equal(WEALTH_ALLOCATION.reduce((sum, item) => sum + item.value, 0), 100);
  assert.equal(HOUSEHOLD_ACCOUNTS.reduce((sum, account) => sum + account.value, 0), HOUSEHOLD.financialAssets);
  assert.ok(HOUSEHOLD_HOLDINGS[0].weight > CONCENTRATION_REVIEW.targetWeight);
  assert.ok(CONCENTRATION_REVIEW.accounts.every((account) => account.gain > 0));
  assert.equal(HOUSEHOLD_GOALS.length, HOUSEHOLD.goalsTotal);
  assert.equal(HOUSEHOLD_GOALS.filter((goal) => goal.tone === "good").length, HOUSEHOLD.goalsOnTrack);
  assert.ok(HOUSEHOLD_INSIGHTS.some((insight) => insight.id === "concentration"));
});

test("account and planning drill-down data is coherent", () => {
  for (const account of HOUSEHOLD_ACCOUNTS) {
    assert.ok(account.id);
    assert.ok(account.cash >= 0 && account.cash <= account.value);
    assert.equal(account.mix.reduce((sum, item) => sum + item.value, 0), 100);
    assert.ok(account.holdings.every((holding) => holding.value <= account.value && holding.weight <= 100));
  }
  for (const goal of HOUSEHOLD_GOALS) {
    assert.ok(goal.id);
    assert.ok(goal.funded <= goal.target);
    assert.equal(Math.round(goal.funded / goal.target * 100), goal.progress);
    assert.ok(goal.confidence >= 0 && goal.confidence <= 100);
  }
});

test("household performance history is ordered, bounded and ends at the stated value", () => {
  assert.ok(WEALTH_HISTORY.length > 250);
  assert.equal(WEALTH_HISTORY.at(-1).time, "2026-08-21");
  assert.equal(WEALTH_HISTORY.at(-1).value, 11.98);
  for (let index = 1; index < WEALTH_HISTORY.length; index += 1) {
    assert.ok(WEALTH_HISTORY[index].time > WEALTH_HISTORY[index - 1].time);
    assert.ok(WEALTH_HISTORY[index].value > 0);
  }
});

test("wealth source is normalized while the service preserves the existing browser contract", () => {
  const rawHousehold = MORRISON_WEALTH_DATASET.households[0];
  const rawAccount = MORRISON_WEALTH_DATASET.accounts[0];
  assert.equal("netWorth" in rawHousehold, false);
  assert.equal("financialAssets" in rawHousehold, false);
  assert.equal("mix" in rawAccount, false);
  assert.equal("holdings" in rawAccount, false);
  assert.equal(rawAccount.householdId, DEFAULT_HOUSEHOLD_ID);

  const workspace = wealthClientService.getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
  assert.equal(workspace.household, HOUSEHOLD);
  assert.equal(workspace.accounts, HOUSEHOLD_ACCOUNTS);
  assert.equal(workspace.goals, HOUSEHOLD_GOALS);
  assert.deepEqual(workspace.concentrationReview, CONCENTRATION_REVIEW);
  assert.deepEqual(wealthClientService.getRepositoryStats(), {
    advisors: 1,
    households: 1,
    accounts: 6,
    accountAllocations: 27,
    positions: 9,
    householdAllocationSnapshots: 6,
    householdHoldingSnapshots: 5,
    nonFinancialAssets: 1,
    liabilities: 1,
    goals: 5,
    insights: 5,
    concentrationPolicies: 1,
    histories: 1,
  });
});

test("household totals are derived from normalized records instead of duplicated summary values", () => {
  const changed = structuredClone(MORRISON_WEALTH_DATASET);
  changed.accounts[0].marketValue += 1000000;
  changed.accounts[0].cashBalance += 100000;
  changed.nonFinancialAssets[0].marketValue += 500000;
  changed.liabilities[0].balance += 100000;
  changed.goals[4].tone = "good";
  changed.goals[4].fundedAmount = 1000000;

  const workspace = createWealthClientService(changed).getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
  assert.equal(workspace.household.financialAssets, HOUSEHOLD.financialAssets + 1000000);
  assert.equal(workspace.household.investableCash, HOUSEHOLD.investableCash + 100000);
  assert.equal(workspace.household.nonFinancialAssets, HOUSEHOLD.nonFinancialAssets + 500000);
  assert.equal(workspace.household.liabilities, HOUSEHOLD.liabilities + 100000);
  assert.equal(workspace.household.netWorth, HOUSEHOLD.netWorth + 1400000);
  assert.equal(workspace.household.goalsOnTrack, 5);
  assert.equal(workspace.goals[4].progress, 80);
});

test("repository validates relationships and indexes books with thousands of households", () => {
  const householdCount = 2500;
  const accountsPerHousehold = 10;
  const households = Array.from({ length: householdCount }, (_, index) => ({ id: `h-${index}`, advisorId: "advisor", name: `Household ${index}` }));
  const accounts = households.flatMap((household) => Array.from({ length: accountsPerHousehold }, (_, index) => ({
    id: `${household.id}-a-${index}`,
    householdId: household.id,
    marketValue: 1000000 + index,
    cashBalance: 10000,
  })));
  const dataset = {
    schemaVersion: 1,
    advisors: [{ id: "advisor", displayName: "Advisor" }],
    households,
    accounts,
    accountAllocations: [],
    positions: [],
    householdAllocationSnapshots: [],
    householdHoldingSnapshots: [],
    nonFinancialAssets: [],
    liabilities: [],
    goals: [],
    insights: [],
    concentrationPolicies: [],
    histories: [],
  };
  const repository = createWealthRepository(dataset);
  assert.equal(repository.stats.households, householdCount);
  assert.equal(repository.stats.accounts, householdCount * accountsPerHousehold);
  assert.equal(repository.listHouseholdAccounts("h-2499").length, accountsPerHousehold);
  assert.equal(repository.getAccount("h-2499-a-9").householdId, "h-2499");

  const broken = structuredClone(dataset);
  broken.accounts[0].householdId = "missing-household";
  assert.throws(() => createWealthRepository(broken), /references missing householdId/);
});

test("wealth BFF returns one bounded household projection and rejects invalid identifiers", () => {
  assert.equal(parseHouseholdId(DEFAULT_HOUSEHOLD_ID), DEFAULT_HOUSEHOLD_ID);
  assert.throws(() => parseHouseholdId("../all-households"), /Invalid householdId/);
  assert.equal(getHouseholdProjection("missing-household"), null);
  assert.deepEqual(getHouseholdProjection(DEFAULT_HOUSEHOLD_ID), defaultWorkspace);
});

test("Total Wealth connects to the existing screener through a server-side wealth boundary", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  const browserWealth = await readFile(new URL("../lib/wealth-data.js", import.meta.url), "utf8");
  const wealthApi = await readFile(new URL("../api/wealth.js", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(html, /id="wealthView"/);
  assert.match(html, /id="investmentView" hidden/);
  assert.match(html, /data-workspace-view="wealth">Total Wealth/);
  assert.match(html, /data-workspace-view="investments">Investments/);
  assert.match(html, /id="scenarioRibbon"/);
  assert.match(html, /id="wealthDrawer"/);
  assert.match(app, /function setWorkspaceView/);
  assert.match(app, /data-household-scenario="concentration"/);
  assert.match(app, /flags: \["Tax-Aware", "Direct Indexing"\]/);
  assert.match(app, /Carry the objective—not hidden client data/);
  assert.match(app, /library\.AreaSeries/);
  assert.match(app, /function accountsDrawer/);
  assert.match(app, /function accountDrawer/);
  assert.match(app, /function goalDrawer/);
  assert.match(app, /data-wealth-account/);
  assert.match(app, /data-wealth-goal/);
  assert.match(css, /\.wealth-layout/);
  assert.match(css, /\.wealth-drawer\.open/);
  assert.match(css, /\.account-review-metrics/);
  assert.match(css, /\.goal-funding-track/);

  assert.match(browserWealth, /fetch\(`\/api\/wealth\?\$\{params\}`/);
  assert.doesNotMatch(browserWealth, /wealth-source|wealth-repository|wealth-service/);
  assert.match(wealthApi, /private, no-store/);
  assert.match(wealthApi, /Vary/);
  assert.match(build, /"wealth-data\.js"/);
  assert.doesNotMatch(build, /"wealth-source\.js"|"wealth-repository\.js"|"wealth-service\.js"/);

  assert.ok(vercel.rewrites.some((rule) => rule.source === "/investments" && rule.destination === "/"));
});
