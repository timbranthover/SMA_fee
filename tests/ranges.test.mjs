import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_ORDER } from "../lib/shared-config.js";
import { getMarketSnapshots, searchCatalog } from "../lib/catalog.js";
import { normalizeRanges, parseRanges, rangeDefinitions, serializeRanges } from "../lib/range-config.js";
import { inputFromQuery } from "../api/search.js";

test("numeric criteria stay compact and vehicle-aware", () => {
  for (const category of CATEGORY_ORDER) {
    const definitions = rangeDefinitions(category);
    assert.ok(definitions.length >= 2 && definitions.length <= 4, `${category} has a noisy numeric filter set`);
    assert.equal(new Set(definitions.map(({ field }) => field)).size, definitions.length, `${category} repeats a range field`);
  }
  assert.deepEqual(rangeDefinitions("Equities").map(({ field }) => field), ["forwardPE", "dividendYield", "perf1"]);
  assert.deepEqual(rangeDefinitions("Fixed Income").map(({ field }) => field), ["yieldToWorst", "minimum", "perf1"]);
  assert.equal(rangeDefinitions("Precious Metals").some(({ field }) => field === "forwardPE"), false);
});

test("range state round-trips through concise share URLs", () => {
  const ranges = { forwardPE: { min: 16, max: 24 }, dividendYield: { min: 1.2 } };
  const serialized = serializeRanges(ranges);
  assert.equal(serialized, "forwardPE:16:24;dividendYield:1.2:");
  assert.deepEqual(parseRanges(serialized), ranges);
  assert.deepEqual(normalizeRanges(parseRanges(serialized), "Equities"), ranges);
  assert.deepEqual(normalizeRanges(parseRanges(serialized), "Fixed Income"), {});
});

test("distribution facets are bounded, internally consistent and stable while filtering", () => {
  const baseline = searchCatalog({ category: "Equities" });
  const filtered = searchCatalog({ category: "Equities", ranges: { forwardPE: { min: 18, max: 24 } } });
  for (const facet of Object.values(baseline.facets.ranges)) {
    assert.equal(facet.bins.length, 12);
    assert.equal(facet.bins.reduce((total, count) => total + count, 0), facet.valueCount);
    assert.ok(facet.min <= facet.median && facet.median <= facet.max);
  }
  assert.deepEqual(filtered.facets.ranges.forwardPE.bins, baseline.facets.ranges.forwardPE.bins);
  assert.deepEqual(filtered.appliedRanges, { forwardPE: { min: 18, max: 24 } });
  assert.ok(filtered.total > 0 && filtered.total < baseline.total);
});

test("numeric criteria apply globally and match the displayed market metrics", () => {
  const result = searchCatalog({ category: "Equities", ranges: { forwardPE: { min: 18, max: 24 }, dividendYield: { min: 0.8, max: 2.2 } } });
  assert.ok(result.total > result.items.length);
  const snapshots = getMarketSnapshots(result.items.map(({ id }) => id));
  for (const item of result.items) {
    const forwardPE = Number.parseFloat(snapshots[item.id].metrics.forwardPE.value);
    const dividendYield = Number.parseFloat(snapshots[item.id].metrics.dividendYield.value);
    assert.ok(forwardPE >= 18 && forwardPE <= 24);
    assert.ok(dividendYield >= 0.8 && dividendYield <= 2.2);
  }
});

test("invalid or incompatible numeric criteria fail closed", () => {
  assert.throws(() => searchCatalog({ category: "Equities", ranges: { yieldToWorst: { min: 4 } } }), /not available/);
  assert.throws(() => searchCatalog({ category: "ETFs", ranges: { fee: { min: 1, max: 0 } } }), /minimum exceeds maximum/);
  assert.throws(() => searchCatalog({ category: "All", ranges: { fee: { min: -1 } } }), /non-negative/);
});

test("the search API parses generic range criteria without expanding its public surface", () => {
  const input = inputFromQuery({ category: "SMAs", ranges: "minimum:100000:500000;fee::0.4" });
  assert.deepEqual(input.ranges, { minimum: { min: 100000, max: 500000 }, fee: { max: 0.4 } });
});
