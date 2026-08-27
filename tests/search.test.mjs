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
  assert.equal(result.items[0].brandKey, "apple");
  assert.equal(result.items[0].matchReason, "Matched on product name");
  assert.equal(result.searchMode, "strict");
});

test("exact identifiers outrank text and explain why they matched", () => {
  const ticker = searchCatalog({ q: "AAPL" });
  const identifier = searchCatalog({ q: "594918CE2" });
  assert.equal(ticker.items[0].symbol, "AAPL");
  assert.equal(ticker.items[0].matchReason, "Exact ticker match");
  assert.equal(identifier.items[0].id, "fi-msft");
  assert.equal(identifier.items[0].matchReason, "Exact identifier match");
});

test("multiword manager search requires every meaningful term", () => {
  const result = searchCatalog({ q: "Cboe Vest" });
  assert.ok(result.total > 0);
  assert.ok(result.items.every((item) => item.manager === "Cboe Vest"));
  assert.equal(result.items[0].matchReason, "Exact manager match");
});

test("whole-word matching does not confuse Vest with Investments", () => {
  const result = searchCatalog({ q: "Vest" });
  assert.ok(result.total > 0);
  assert.ok(result.items.every((item) => item.manager === "Cboe Vest"));
  assert.ok(result.items.every((item) => item.manager !== "Parnassus Investments"));
});

test("typeahead prefixes work while typo correction remains controlled", () => {
  const prefix = searchCatalog({ q: "Micros" });
  const typo = searchCatalog({ q: "Microsft" });
  const unrelated = searchCatalog({ q: "quantum banana" });
  assert.ok(prefix.items.length > 0 && prefix.items.every((item) => /microsoft/i.test(`${item.name} ${item.manager}`)));
  assert.equal(prefix.searchMode, "strict");
  assert.equal(typo.items[0].symbol, "MSFT");
  assert.equal(typo.searchMode, "fuzzy");
  assert.match(typo.items[0].matchReason, /^Close /);
  assert.equal(unrelated.total, 0);
});

test("natural language vehicle terms narrow before text relevance", () => {
  const result = searchCatalog({ q: "Microsoft bond" });
  assert.equal(result.appliedCategory, "Fixed Income");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "fi-msft");
});

test("brand identity enrichment is deterministic and falls back cleanly", () => {
  assert.equal(getInvestmentDetail("eq-msft").brandKey, "microsoft");
  assert.equal(getInvestmentDetail("fi-jpm").brandKey, "chase");
  assert.equal(getInvestmentDetail("mf-vfiax").brandKey, "vanguard");
  assert.equal(getInvestmentDetail("sma-northstar").brandKey, null);
});

test("the expanded manager-logo registry maps all ten new brands", () => {
  const expected = new Map([
    ["T. Rowe Price", "t-rowe-price"],
    ["AllianceBernstein", "alliance-bernstein"],
    ["Nuveen Asset Management", "nuveen"],
    ["Neuberger Berman", "neuberger-berman"],
    ["Parnassus Investments", "parnassus"],
    ["PIMCO", "pimco"],
    ["MFS Investment Management", "mfs"],
    ["Blackstone Credit & Insurance", "blackstone"],
    ["Cboe Vest", "cboe"],
    ["Charles Schwab Investment Management", "schwab"],
  ]);
  const index = getSearchIndex();
  for (const [manager, brandKey] of expected) {
    const record = index.find((item) => item.manager === manager);
    assert.ok(record, `missing catalog record for ${manager}`);
    assert.equal(record.brandKey, brandKey, `wrong brand key for ${manager}`);
  }
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
