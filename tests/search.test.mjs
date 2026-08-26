import test from "node:test";
import assert from "node:assert/strict";
import { getInvestmentDetail, getSearchIndex, searchCatalog, UNIVERSE_SIZE } from "../lib/catalog.js";
import searchHandler, { inputFromQuery } from "../api/search.js";
import detailHandler from "../api/detail.js";

test("the server index contains the exact shelf while responses stay bounded", () => {
  assert.equal(getSearchIndex().length, UNIVERSE_SIZE);
  const result = searchCatalog({});
  assert.equal(result.total, UNIVERSE_SIZE);
  assert.equal(result.items.length, 25);
  assert.equal(result.nextCursor, 25);
  assert.equal("_search" in result.items[0], false);
  assert.equal("fitReason" in result.items[0], false);
});

test("category facets are calculated from the indexed records", () => {
  const result = searchCatalog({});
  assert.equal(result.facets.categories.Equities, 22584);
  assert.equal(result.facets.categories["Fixed Income"], 93571);
});

test("text search never fabricates unrelated rows", () => {
  const result = searchCatalog({ q: "Apple" });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].symbol, "AAPL");
});

test("multiple governed flags use AND logic on every result", () => {
  const result = searchCatalog({ category: "SMAs", flags: ["Tax-Aware", "Direct Indexing"] });
  assert.ok(result.total > 0);
  assert.ok(result.items.every((item) => item.category === "SMAs"));
  assert.ok(result.items.every((item) => item.flags.includes("Tax-Aware") && item.flags.includes("Direct Indexing")));
});

test("sorting is global across pagination boundaries", () => {
  const first = searchCatalog({ category: "ETFs", sort: "fee" });
  const second = searchCatalog({ category: "ETFs", sort: "fee", cursor: first.nextCursor });
  assert.ok((first.items.at(-1).fee ?? Infinity) <= (second.items[0].fee ?? Infinity));
  assert.equal(second.previousCursor, 0);
});

test("natural language becomes approved structured criteria", () => {
  const result = searchCatalog({ q: "moderate tax-aware SMA under 50 bps" });
  assert.equal(result.appliedCategory, "SMAs");
  assert.ok(result.interpreted.includes("Tax-aware"));
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.category === "SMAs" && item.flags.includes("Tax-Aware") && item.risk === "Moderate"));
  assert.ok(result.items.every((item) => item.fee === null || item.fee <= 0.5));
});

test("invalid filters fail closed instead of crashing or changing meaning", () => {
  assert.throws(() => searchCatalog({ category: "Crypto" }), /Unknown investment category/);
  assert.throws(() => searchCatalog({ flags: ["Unapproved"] }), /Unknown flag/);
  assert.throws(() => searchCatalog({ cursor: -1 }), /Cursor/);
});

test("detail responses contain governed metadata without client fields", () => {
  const detail = getInvestmentDetail("sma-northstar");
  assert.equal(detail.category, "SMAs");
  assert.equal(detail.details.Identifier, "NX1A");
  assert.ok(detail.flagDetails.some((flag) => flag.owner === "Managed Solutions"));
  assert.equal(detail.documents.length, 3);
  assert.equal("eligibility" in detail, false);
});

test("API query parsing is explicit", () => {
  const input = inputFromQuery({ category: "Fixed Income", flags: "Tax-Aware,CIO House View", pageSize: "25" });
  assert.deepEqual(input.flags, ["Tax-Aware", "CIO House View"]);
  assert.equal(input.pageSize, 25);
  assert.equal("eligibleOnly" in input, false);
});

test("search API returns 400 for invalid input and timing for valid input", async () => {
  const valid = await searchHandler.fetch(new Request("https://example.test/api/search?category=ETFs&pageSize=25"));
  const invalid = await searchHandler.fetch(new Request("https://example.test/api/search?category=Crypto&pageSize=500"));
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).items.length, 25);
  assert.match(valid.headers.get("server-timing"), /^search;dur=/);
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /category|page size/i);
});

test("detail API validates identifiers and returns 404 for unknown records", async () => {
  const found = await detailHandler.fetch(new Request("https://example.test/api/detail?id=sma-aperio"));
  const invalid = await detailHandler.fetch(new Request("https://example.test/api/detail?id=%3Cscript%3E"));
  const missing = await detailHandler.fetch(new Request("https://example.test/api/detail?id=missing"));
  assert.equal(found.status, 200);
  assert.equal((await found.json()).symbol, "APLC");
  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
});
