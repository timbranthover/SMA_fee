import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getWealthProjection, parseHouseholdId, parseProjectionView } from "../api/wealth.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthService } from "../lib/wealth-service.js";
import { MORRISON_WEALTH_DATASET } from "../lib/wealth-source.js";

const DEFAULT_HOUSEHOLD_ID = "household-morrison";
const wealthService = createWealthService(MORRISON_WEALTH_DATASET);
const defaultWorkspace = wealthService.getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
const defaultOverview = wealthService.getHouseholdOverview(DEFAULT_HOUSEHOLD_ID);
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

test("wealth source is normalized while the service preserves the full internal contract", () => {
  const rawHousehold = MORRISON_WEALTH_DATASET.households[0];
  const rawAccount = MORRISON_WEALTH_DATASET.accounts[0];
  assert.equal("netWorth" in rawHousehold, false);
  assert.equal("financialAssets" in rawHousehold, false);
  assert.equal("mix" in rawAccount, false);
  assert.equal("holdings" in rawAccount, false);
  assert.equal(rawAccount.householdId, DEFAULT_HOUSEHOLD_ID);

  const workspace = wealthService.getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
  assert.equal(workspace.household, HOUSEHOLD);
  assert.equal(workspace.accounts, HOUSEHOLD_ACCOUNTS);
  assert.equal(workspace.goals, HOUSEHOLD_GOALS);
  assert.deepEqual(workspace.concentrationReview, CONCENTRATION_REVIEW);
  assert.deepEqual(wealthService.getRepositoryStats(), {
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

test("overview projection excludes expensive drill-down data until requested", () => {
  assert.equal("history" in defaultOverview, false);
  assert.equal("concentrationReview" in defaultOverview, false);
  assert.ok(defaultOverview.accounts.length > 0);
  assert.ok(defaultOverview.goals.length > 0);
  assert.equal("mix" in defaultOverview.accounts[0], false);
  assert.equal("holdings" in defaultOverview.accounts[0], false);
  assert.equal("purpose" in defaultOverview.accounts[0], false);
  assert.equal("target" in defaultOverview.goals[0], false);
  assert.equal("funded" in defaultOverview.goals[0], false);

  assert.deepEqual(wealthService.getHouseholdHistory(DEFAULT_HOUSEHOLD_ID), WEALTH_HISTORY);
  assert.deepEqual(wealthService.getHouseholdConcentrationReview(DEFAULT_HOUSEHOLD_ID), CONCENTRATION_REVIEW);
  assert.deepEqual(wealthService.getHouseholdAccount(DEFAULT_HOUSEHOLD_ID, HOUSEHOLD_ACCOUNTS[0].id), HOUSEHOLD_ACCOUNTS[0]);
  assert.deepEqual(wealthService.getHouseholdGoal(DEFAULT_HOUSEHOLD_ID, HOUSEHOLD_GOALS[0].id), HOUSEHOLD_GOALS[0]);
});

test("household totals are derived from normalized records instead of duplicated summary values", () => {
  const changed = structuredClone(MORRISON_WEALTH_DATASET);
  changed.accounts[0].marketValue += 1000000;
  changed.accounts[0].cashBalance += 100000;
  changed.nonFinancialAssets[0].marketValue += 500000;
  changed.liabilities[0].balance += 100000;
  changed.goals[4].tone = "good";
  changed.goals[4].fundedAmount = 1000000;

  const workspace = createWealthService(changed).getHouseholdWorkspace(DEFAULT_HOUSEHOLD_ID);
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

  const service = createWealthService(dataset, { cacheLimits: { overview: 20, account: 40 } });
  assert.equal(service.getHouseholdOverview("h-2499").accounts.length, accountsPerHousehold);
  for (let index = 0; index < 100; index += 1) assert.equal(service.getHouseholdOverview(`h-${index}`).household.id, `h-${index}`);
  assert.equal(service.getHouseholdOverview("h-2499").household.id, "h-2499");

  const broken = structuredClone(dataset);
  broken.accounts[0].householdId = "missing-household";
  assert.throws(() => createWealthRepository(broken), /references missing householdId/);
});

test("wealth BFF exposes bounded projection views and rejects invalid identifiers", () => {
  assert.equal(parseHouseholdId(DEFAULT_HOUSEHOLD_ID), DEFAULT_HOUSEHOLD_ID);
  assert.equal(parseProjectionView(null), "overview");
  assert.throws(() => parseHouseholdId("../all-households"), /Invalid householdId/);
  assert.throws(() => parseProjectionView("everything"), /Invalid view/);
  assert.equal(getWealthProjection("missing-household", "overview"), null);
  assert.deepEqual(getWealthProjection(DEFAULT_HOUSEHOLD_ID, "overview"), defaultOverview);
  assert.deepEqual(getWealthProjection(DEFAULT_HOUSEHOLD_ID, "history"), WEALTH_HISTORY);
  assert.deepEqual(getWealthProjection(DEFAULT_HOUSEHOLD_ID, "concentration"), CONCENTRATION_REVIEW);
  assert.deepEqual(getWealthProjection(DEFAULT_HOUSEHOLD_ID, "account", "joint-brokerage"), HOUSEHOLD_ACCOUNTS[0]);
  assert.deepEqual(getWealthProjection(DEFAULT_HOUSEHOLD_ID, "goal", "retirement-income"), HOUSEHOLD_GOALS[0]);
});

test("Total Wealth keeps expensive work off the initial household critical path", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  const browserWealth = await readFile(new URL("../lib/wealth-data.js", import.meta.url), "utf8");
  const wealthApi = await readFile(new URL("../api/wealth.js", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(html, /id="bookView"/);
  assert.match(html, /id="wealthView" hidden/);
  assert.match(html, /id="investmentView" hidden/);
  assert.match(html, /data-workspace-view="book">Total Wealth/);
  assert.match(html, /id="bookSearch"/);
  assert.match(html, /id="bookBody"/);
  assert.match(html, /data-workspace-view="investments">Investments/);
  assert.match(html, /id="scenarioRibbon"/);
  assert.match(html, /id="wealthDrawer"/);
  assert.match(app, /function setWorkspaceView/);
  assert.match(app, /function ensureInvestmentWorkspaceLoaded/);
  assert.match(app, /function loadBook/);
  assert.match(app, /function openHousehold/);
  assert.match(app, /loadAdvisorBook/);
  assert.match(app, /ensureInvestmentWorkspaceLoaded/);
  assert.match(app, /loadWealthHistory\(householdId\)/);
  assert.match(app, /loadHouseholdAccount/);
  assert.match(app, /loadHouseholdGoal/);
  assert.match(app, /loadConcentrationReview/);
  assert.match(app, /import\("\/vendor\/nouislider\.mjs"\)/);
  assert.doesNotMatch(app, /import noUiSlider from/);
  assert.match(app, /data-household-scenario="concentration"/);
  assert.match(app, /flags: \["Tax-Aware", "Direct Indexing"\]/);
  assert.match(app, /Carry the objective—not hidden client data/);
  assert.match(app, /library\.AreaSeries/);
  assert.match(css, /\.wealth-layout/);
  assert.match(css, /\.wealth-drawer\.open/);

  assert.match(browserWealth, /loadAdvisorBook/);
  assert.match(browserWealth, /loadHouseholdOverview/);
  assert.match(browserWealth, /loadWealthHistory/);
  assert.match(browserWealth, /loadConcentrationReview/);
  assert.doesNotMatch(browserWealth, /wealth-source|wealth-repository|wealth-service/);
  assert.match(wealthApi, /PROJECTION_VIEWS/);
  assert.match(wealthApi, /getAdvisorBook/);
  assert.match(wealthApi, /Server-Timing/);
  assert.match(wealthApi, /private, no-store/);
  assert.match(wealthApi, /Vary/);
  assert.match(build, /"wealth-data\.js"/);
  assert.doesNotMatch(build, /"wealth-source\.js"|"wealth-repository\.js"|"wealth-service\.js"/);

  assert.ok(vercel.rewrites.some((rule) => rule.source === "/household/:id" && rule.destination === "/"));
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/investments" && rule.destination === "/"));
});
