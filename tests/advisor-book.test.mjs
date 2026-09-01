import test from "node:test";
import assert from "node:assert/strict";
import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "../lib/advisor-book-source.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthService } from "../lib/wealth-service.js";

const repository = createWealthRepository(ADVISOR_BOOK_DATASET);
const service = createWealthService(ADVISOR_BOOK_DATASET);

test("advisor book contains many coherent distinct households", () => {
  const households = repository.listAdvisorHouseholds(DEFAULT_ADVISOR_ID);
  assert.equal(households.length, 128);
  assert.equal(new Set(households.map((household) => household.id)).size, households.length);
  assert.equal(new Set(households.map((household) => household.name)).size, households.length);
  for (const household of households) {
    const overview = service.getHouseholdOverview(household.id);
    assert.ok(overview);
    assert.equal(overview.household.id, household.id);
    assert.ok(overview.household.accountCount >= 4);
    assert.ok(overview.household.financialAssets > 0);
    assert.equal(overview.household.goalsTotal, overview.goals.length);
    assert.equal(overview.household.financialAssets, overview.accounts.reduce((sum, account) => sum + account.value, 0));
    assert.equal(overview.household.investableCash, overview.accounts.reduce((sum, account) => sum + account.cash, 0));
    const allocationTotal = overview.allocation.reduce((sum, item) => sum + item.value, 0);
    assert.equal(allocationTotal, 100, `${household.id} allocation should total 100%`);
  }
});

test("generated households stay materially varied across names, relationships, assets and signals", () => {
  const households = repository.listAdvisorHouseholds(DEFAULT_ADVISOR_ID).filter((household) => household.id !== "household-morrison");
  const familyRoots = households.map((household) => household.name.replace(/ (?:Household|Family)$/, "").split("-")[0]);
  assert.equal(new Set(familyRoots).size, households.length, "generated households should not recycle the same lead surname");
  assert.ok(new Set(households.map((household) => household.location)).size >= 24);
  assert.ok(new Set(households.map((household) => household.relationshipType)).size >= 6);

  const generatedIds = new Set(households.map((household) => household.id));
  const accounts = ADVISOR_BOOK_DATASET.accounts.filter((account) => generatedIds.has(account.householdId));
  assert.ok(new Set(accounts.map((account) => account.registration)).size >= 8);
  assert.ok(new Set(accounts.map((account) => account.purpose)).size >= 15);

  const goals = ADVISOR_BOOK_DATASET.goals.filter((goal) => generatedIds.has(goal.householdId));
  assert.ok(new Set(goals.map((goal) => goal.name)).size >= 12);

  const nonFinancialAssets = ADVISOR_BOOK_DATASET.nonFinancialAssets.filter((asset) => generatedIds.has(asset.householdId));
  const liabilities = ADVISOR_BOOK_DATASET.liabilities.filter((liability) => generatedIds.has(liability.householdId));
  assert.ok(new Set(nonFinancialAssets.map((asset) => asset.category)).size >= 4);
  assert.ok(new Set(liabilities.map((liability) => liability.category)).size >= 4);

  const generatedInsights = ADVISOR_BOOK_DATASET.insights.filter((insight) => generatedIds.has(insight.householdId));
  assert.ok(new Set(generatedInsights.map((insight) => insight.kind)).size >= 6);
  assert.ok(new Set(generatedInsights.map((insight) => insight.title)).size >= 90);

  const concentrationSymbols = ADVISOR_BOOK_DATASET.concentrationPolicies
    .filter((policy) => generatedIds.has(policy.householdId))
    .map((policy) => ADVISOR_BOOK_DATASET.householdHoldingSnapshots.find((holding) => holding.householdId === policy.householdId && holding.instrumentId === policy.instrumentId)?.symbol)
    .filter(Boolean);
  const concentrationFrequency = new Map();
  concentrationSymbols.forEach((symbol) => concentrationFrequency.set(symbol, (concentrationFrequency.get(symbol) || 0) + 1));
  assert.ok(new Set(concentrationSymbols).size >= 24, "concentration alerts should span a broad security set");
  assert.ok(Math.max(...concentrationFrequency.values()) <= 2, "no one security should dominate generated concentration alerts");

  const upcoming = generatedInsights.filter((insight) => insight.severity === "Upcoming");
  assert.ok(upcoming.length >= 20);
  assert.ok(new Set(upcoming.map((insight) => insight.title)).size >= 15);
});

test("advisor book projection stays bounded, searchable, sortable and filterable", () => {
  const firstPage = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { pageSize: 25 });
  assert.equal(firstPage.metrics.householdCount, 128);
  assert.equal(firstPage.asOf, firstPage.items[0].asOf);
  assert.equal(firstPage.advisor.initials, "A4");
  assert.equal(firstPage.items.length, 25);
  assert.equal(firstPage.nextCursor, 25);
  assert.ok(firstPage.metrics.financialAssets > 1_000_000_000);
  assert.ok(firstPage.focusCounts.priority > 0);
  assert.ok(firstPage.focusCounts.cash > 0);
  assert.ok(firstPage.focusCounts.cash < firstPage.metrics.householdCount);

  const secondPage = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { cursor: firstPage.nextCursor, pageSize: 25 });
  assert.equal(secondPage.items.length, 25);
  assert.notEqual(secondPage.items[0].id, firstPage.items[0].id);

  const morrison = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { query: "Morrison" });
  assert.equal(morrison.total, 1);
  assert.equal(morrison.items[0].id, "household-morrison");

  const hyphenatedHousehold = ADVISOR_BOOK_DATASET.households.find((household) => household.id !== "household-morrison" && household.name.includes("-"));
  assert.ok(hyphenatedHousehold);
  const hyphenated = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { query: hyphenatedHousehold.name.replace(/ Household$/, "") });
  assert.equal(hyphenated.items[0].id, hyphenatedHousehold.id);
  assert.equal(hyphenated.items[0].initials.length, 2);

  const cash = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "cash", sort: "cash-desc", pageSize: 200 });
  assert.equal(cash.total, firstPage.focusCounts.cash);
  assert.ok(cash.items.every((item) => item.focus.includes("cash")));
  for (let index = 1; index < cash.items.length; index += 1) assert.ok(cash.items[index - 1].cash >= cash.items[index].cash);

  const generatedCalls = ADVISOR_BOOK_DATASET.insights.filter((insight) => insight.severity === "Upcoming" && insight.id !== "capital-call");
  assert.ok(new Set(generatedCalls.map((insight) => insight.title)).size >= 15);
  assert.equal(service.householdBelongsToAdvisor(DEFAULT_ADVISOR_ID, "household-morrison"), true);
  assert.equal(service.householdBelongsToAdvisor("advisor-other", "household-morrison"), false);
});

test("household detail remains isolated to the selected relationship", () => {
  const households = repository.listAdvisorHouseholds(DEFAULT_ADVISOR_ID).filter((item) => item.id !== "household-morrison");
  const left = service.getHouseholdOverview(households[0].id);
  const right = service.getHouseholdOverview(households[1].id);
  assert.notEqual(left.household.name, right.household.name);
  assert.notEqual(left.accounts[0].id, right.accounts[0].id);
  assert.ok(left.accounts.every((account) => account.id.startsWith(`${left.household.id}-`)));
  assert.ok(right.accounts.every((account) => account.id.startsWith(`${right.household.id}-`)));
  const account = service.getHouseholdAccount(left.household.id, left.accounts[0].id);
  assert.ok(account);
  assert.equal(service.getHouseholdAccount(right.household.id, left.accounts[0].id), null);
});
