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

test("advisor book projection stays bounded, searchable, sortable and filterable", () => {
  const firstPage = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { pageSize: 25 });
  assert.equal(firstPage.metrics.householdCount, 128);
  assert.equal(firstPage.items.length, 25);
  assert.equal(firstPage.nextCursor, 25);
  assert.ok(firstPage.metrics.financialAssets > 1_000_000_000);
  assert.ok(firstPage.focusCounts.priority > 0);
  assert.ok(firstPage.focusCounts.cash > 0);

  const secondPage = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { cursor: firstPage.nextCursor, pageSize: 25 });
  assert.equal(secondPage.items.length, 25);
  assert.notEqual(secondPage.items[0].id, firstPage.items[0].id);

  const morrison = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { query: "Morrison" });
  assert.equal(morrison.total, 1);
  assert.equal(morrison.items[0].id, "household-morrison");

  const cash = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "cash", sort: "cash-desc", pageSize: 200 });
  assert.equal(cash.total, firstPage.focusCounts.cash);
  assert.ok(cash.items.every((item) => item.focus.includes("cash")));
  for (let index = 1; index < cash.items.length; index += 1) assert.ok(cash.items[index - 1].cash >= cash.items[index].cash);
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
