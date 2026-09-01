import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_COLUMN_PRESETS, CATEGORY_COLUMN_RULES, CATEGORY_DEFAULT_COLUMNS, MAX_RESULT_COLUMNS, normalizeColumns } from "../lib/column-config.js";
import { defaultSort, headerSort, sortOptions } from "../lib/sort-config.js";

test("every category default and preset stays valid and within the five-column cap", () => {
  for (const [category, allowed] of Object.entries(CATEGORY_COLUMN_RULES)) {
    const defaults = CATEGORY_DEFAULT_COLUMNS[category];
    assert.ok(defaults.length > 0 && defaults.length <= MAX_RESULT_COLUMNS);
    assert.ok(defaults.every((column) => allowed.includes(column)), `${category} has an invalid default`);
    for (const [preset, columns] of Object.entries(CATEGORY_COLUMN_PRESETS[category])) {
      assert.ok(columns.length > 0 && columns.length <= MAX_RESULT_COLUMNS, `${category} ${preset} exceeds the cap`);
      assert.ok(columns.every((column) => allowed.includes(column)), `${category} ${preset} has an invalid field`);
    }
  }
});

test("trend is not a selectable column and defaults lead with price/value plus 1Y return", () => {
  for (const [category, allowed] of Object.entries(CATEGORY_COLUMN_RULES)) {
    assert.equal(allowed.includes("trend"), false, `${category} still exposes trend`);
    assert.equal(CATEGORY_DEFAULT_COLUMNS[category][0], "primary", `${category} primary is not leftmost by default`);
    for (const [preset, columns] of Object.entries(CATEGORY_COLUMN_PRESETS[category])) {
      assert.equal(columns.includes("trend"), false, `${category} ${preset} still exposes trend`);
    }
  }
  for (const category of ["All", "Equities", "Mutual Funds", "ETFs", "SMAs", "Fixed Income", "Alternatives", "Structured", "Managed Options", "Annuities"]) {
    assert.ok(CATEGORY_DEFAULT_COLUMNS[category].includes("perf1"), `${category} default is missing 1Y return`);
  }
  assert.ok(CATEGORY_DEFAULT_COLUMNS["Precious Metals"].includes("return1Y"));
});

test("normalization removes duplicates, rejects incompatible fields and caps noisy layouts", () => {
  assert.deepEqual(normalizeColumns("Equities", ["primary", "custodyFee", "forwardPE", "forwardPE"]), ["primary", "forwardPE"]);
  assert.deepEqual(normalizeColumns("Precious Metals", ["primary", "forwardPE", "custodyFee"]), ["primary", "custodyFee"]);
  const capped = normalizeColumns("ETFs", ["primary", "aum", "secYield", "expenseRatio", "perf1", "perf3", "risk"]);
  assert.equal(capped.length, MAX_RESULT_COLUMNS);
  assert.deepEqual(capped, ["primary", "aum", "secYield", "expenseRatio", "perf1"]);
  assert.deepEqual(normalizeColumns("Equities", ["primary", "trend", "marketCap", "perf1"]), ["primary", "marketCap", "perf1"]);
});

test("empty or unknown layouts fail back to category defaults", () => {
  assert.deepEqual(normalizeColumns("SMAs", []), [...CATEGORY_DEFAULT_COLUMNS.SMAs]);
  assert.deepEqual(normalizeColumns("Crypto", ["custodyFee"]), [...CATEGORY_DEFAULT_COLUMNS.All]);
});

test("sort choices follow the active vehicle and visible columns", () => {
  const equityOptions = sortOptions("Equities", ["primary", "forwardPE", "risk"], false);
  assert.deepEqual(equityOptions.map(({ value }) => value), ["name-asc", "name-desc", "primary-desc", "primary-asc", "forwardPE-asc", "forwardPE-desc"]);
  assert.equal(sortOptions("All", ["primary", "perf1", "fee"], false).length, 2);
  assert.equal(sortOptions("ETFs", ["expenseRatio"], true)[0].value, "relevance");
  assert.ok(sortOptions("Structured", ["perf1"], false).some(({ value }) => value === "perf1-desc"));
  assert.equal(defaultSort(false), "name-asc");
  assert.equal(defaultSort(true), "relevance");
});

test("sortable headers toggle direction without exposing incompatible fields", () => {
  assert.equal(headerSort("Equities", "forwardPE", "name-asc").nextSort, "forwardPE-asc");
  assert.equal(headerSort("Equities", "forwardPE", "forwardPE-asc").nextSort, "forwardPE-desc");
  assert.equal(headerSort("Equities", "trend", "name-asc"), null);
  assert.equal(headerSort("Equities", "custodyFee", "name-asc"), null);
});

test("market size columns are first-class for equities and ETFs", () => {
  assert.ok(CATEGORY_DEFAULT_COLUMNS.Equities.includes("marketCap"));
  assert.ok(CATEGORY_DEFAULT_COLUMNS.ETFs.includes("aum"));
  assert.ok(sortOptions("Equities", ["marketCap"], false).some(({ value }) => value === "marketCap-desc"));
  assert.ok(sortOptions("ETFs", ["aum"], false).some(({ value }) => value === "aum-desc"));
  assert.equal(headerSort("Equities", "marketCap", "name-asc").nextSort, "marketCap-desc");
  assert.equal(headerSort("ETFs", "aum", "name-asc").nextSort, "aum-desc");
});
