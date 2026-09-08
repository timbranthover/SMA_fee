import test from "node:test";
import assert from "node:assert/strict";
import { getSearchIndex, searchCatalog, getInvestmentDetail } from "../lib/catalog.js";

test("every synthetic SMA has a distinct stable identity and coherent mandate", () => {
  const records = getSearchIndex("SMAs").filter((item) => item.id.startsWith("syn-"));
  assert.equal(new Set(records.map((item) => item.name)).size, records.length);
  assert.equal(new Set(records.map((item) => item.symbol)).size, records.length);
  for (const item of records) {
    assert.equal(item.type, "Illustrative SMA");
    if (item.flags.includes("Direct Indexing")) {
      assert.ok(item.flags.includes("Tax-Aware"));
      assert.match(item.assetClass, /^US /);
      assert.equal(item.risk, "Moderate");
    }
    if (item.assetClass === "Municipal Bond") {
      assert.match(item.benchmark, /Municipal/);
      assert.equal(item.risk, "Conservative");
    }
  }
});

test("proposal search returns distinguishable strategies with matching detail terms", () => {
  const result = searchCatalog({ category: "SMAs", flags: ["Tax-Aware", "Direct Indexing"], risks: ["Moderate"], sort: "name-asc" });
  assert.equal(new Set(result.items.map((item) => item.name)).size, result.items.length);
  assert.ok(new Set(result.items.map((item) => item.benchmark)).size > 2);
  for (const item of result.items) {
    const detail = getInvestmentDetail(item.id);
    for (const field of ["name", "symbol", "manager", "minimum", "fee", "benchmark", "assetClass", "objective", "status"]) assert.deepEqual(item[field], detail[field]);
  }
});

// Product names must take precedence over generic vehicle inference.
test("exact SMA names remain findable when their names mention bonds or equity", () => {
  for (const name of ["Alder Grove Short Municipal Income", "Alder Grove International Quality Equity", "Intermediate Municipal Bond"]) {
    const result = searchCatalog({ q: name });
    assert.equal(result.items[0]?.name, name);
    assert.equal(result.items[0]?.category, "SMAs");
  }
});
