import test from "node:test";
import assert from "node:assert/strict";
import { searchCatalog } from "../lib/catalog.js";
import { clearAllSearchFilters, clearQueryDerivedFilters } from "../lib/search-state.js";

test("common investment language resolves to meaningful results", () => {
  for (const q of ["bond", "bond ETF", "treasury", "municipal", "low fee dividend ETF", "sustainable large cap under 0.2% fee"]) {
    const result = searchCatalog({ q });
    assert.ok(result.total > 0, `${q} should return investments`);
  }
  const etfs = searchCatalog({ category: "ETFs", q: "bond" });
  assert.ok(etfs.total > 0);
  assert.equal(etfs.appliedCategory, "ETFs");
  assert.ok(etfs.items.every((item) => item.category === "ETFs"));
  assert.ok(!etfs.interpreted.includes("Fixed income"));
});

test("governed query filters disappear on query change without erasing manual filters", () => {
  const interpreted = searchCatalog({ q: "sustainable large cap under 0.2% fee" });
  assert.ok(interpreted.appliedFilters.query.flags.includes("Sustainable"));
  assert.ok(interpreted.appliedFilters.query.ranges.fee);
  const state = {
    q: "sustainable large cap under 0.2% fee", category: "ETFs",
    flags: new Set(["Sustainable", "CIO House View"]), risks: new Set(["Moderate"]), statuses: new Set(),
    ranges: { fee: { max: 0.2 }, aum: { min: 100 } },
    queryFilterKeys: new Set(["flag:Sustainable", "range:fee"]),
    excludedQueryFilters: new Set(["risk:High"]), suppressInferenceFor: null,
  };
  clearQueryDerivedFilters(state);
  state.q = "PIMCO";
  assert.deepEqual([...state.flags], ["CIO House View"]);
  assert.deepEqual(state.ranges, { aum: { min: 100 } });
  assert.equal(state.risks.has("Moderate"), true);
  assert.equal(state.queryFilterKeys.size, 0);
  assert.equal(state.excludedQueryFilters.size, 0);
});

test("clear all keeps the selected tab and the search wording", () => {
  const state = {
    q: "bond", category: "ETFs", flags: new Set(["Tax-Aware"]), risks: new Set(["Moderate"]),
    statuses: new Set(["New"]), ranges: { fee: { max: 0.2 } },
    queryFilterKeys: new Set(["range:fee"]), excludedQueryFilters: new Set(), suppressInferenceFor: null,
  };
  clearAllSearchFilters(state);
  assert.equal(state.category, "ETFs");
  assert.equal(state.q, "bond");
  assert.equal(state.flags.size + state.risks.size + state.statuses.size + Object.keys(state.ranges).length, 0);
  assert.equal(state.suppressInferenceFor, "bond");
  assert.ok(searchCatalog({ category: state.category, q: state.q, suppressInference: true }).total > 0);
});

test("removing a query-derived fee filter and changing text does not leave a stale cap", () => {
  const initial = searchCatalog({ q: "sustainable large cap under 0.2% fee" });
  assert.deepEqual(initial.appliedRanges.fee, { max: 0.2 });
  const withoutFee = searchCatalog({ q: "sustainable large cap under 0.2% fee", excludedQueryFilters: ["range:fee"] });
  assert.equal(withoutFee.appliedRanges.fee, undefined);
  const replacement = searchCatalog({ q: "PIMCO" });
  assert.equal(replacement.appliedRanges.fee, undefined);
  assert.ok(replacement.total > 0);
});
