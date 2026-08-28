import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_COLUMN_PRESETS, CATEGORY_COLUMN_RULES, CATEGORY_DEFAULT_COLUMNS, MAX_RESULT_COLUMNS, normalizeColumns } from "../lib/column-config.js";

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

test("normalization removes duplicates, rejects incompatible fields and caps noisy layouts", () => {
  assert.deepEqual(normalizeColumns("Equities", ["primary", "custodyFee", "forwardPE", "forwardPE"]), ["primary", "forwardPE"]);
  assert.deepEqual(normalizeColumns("Precious Metals", ["primary", "forwardPE", "custodyFee"]), ["primary", "custodyFee"]);
  const capped = normalizeColumns("ETFs", ["primary", "trend", "secYield", "expenseRatio", "perf1", "perf3", "risk"]);
  assert.equal(capped.length, MAX_RESULT_COLUMNS);
  assert.deepEqual(capped, ["primary", "trend", "secYield", "expenseRatio", "perf1"]);
});

test("empty or unknown layouts fail back to category defaults", () => {
  assert.deepEqual(normalizeColumns("SMAs", []), [...CATEGORY_DEFAULT_COLUMNS.SMAs]);
  assert.deepEqual(normalizeColumns("Crypto", ["custodyFee"]), [...CATEGORY_DEFAULT_COLUMNS.All]);
});
