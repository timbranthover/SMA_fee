import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_ORDER, EQUITY_REFERENCE_AS_OF, EQUITY_REFERENCE_SOURCE, FLAG_DEFINITIONS, getInvestmentDetail, getMarketSnapshots, getSearchIndex, searchCatalog, UNIVERSE_SIZE } from "../lib/catalog.js";
import { EQUITY_UNIVERSE } from "../lib/equity-universe.js";
import searchHandler, { inputFromQuery } from "../api/search.js";
import detailHandler from "../api/detail.js";
import snapshotHandler from "../api/snapshots.js";

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

test("the equity shelf uses a broad real issuer reference without repeated placeholder rows", () => {
  assert.ok(EQUITY_UNIVERSE.length >= 8000);
  assert.equal(EQUITY_REFERENCE_AS_OF, "2026-08-31");
  assert.match(EQUITY_REFERENCE_SOURCE, /^https:\/\/www\.sec\.gov\//);
  const result = searchCatalog({ category: "Equities" });
  assert.equal(result.items.length, 25);
  assert.equal(new Set(result.items.map((item) => item.name)).size, 25);
  assert.equal(new Set(result.items.map((item) => item.symbol)).size, 25);
  assert.ok(result.items.every((item) => !/Apex Digital Systems/i.test(item.name)));
  assert.ok(result.items.every((item) => !/\b(?:ETF|ETN|Fund)\b/i.test(item.name)));
  assert.ok(result.items.every((item) => item.id.startsWith("eq-")));
});

test("SEC-referenced equities support ticker, issuer-name, profile and snapshot flows", () => {
  const ticker = searchCatalog({ q: "AMZN" });
  const issuer = searchCatalog({ q: "Amazon.com" });
  assert.equal(ticker.total, 1);
  assert.equal(ticker.items[0].name, "Amazon.com, Inc.");
  assert.equal(ticker.items[0].matchReason, "Exact ticker match");
  assert.ok(issuer.items.some((item) => item.symbol === "AMZN"));
  const detail = getInvestmentDetail("AMZN");
  assert.equal(detail.symbol, "AMZN");
  assert.equal(detail.canonicalSlug, "AMZN");
  assert.match(detail.controls.data.source, /SEC issuer reference/);
  assert.equal(detail.profile.keyFacts.find((fact) => fact.label === "Primary market").value, "NASDAQ");
  assert.equal(getMarketSnapshots([detail.id])[detail.id].primary.label, "Market price");
});

test("all equity records retain unique names, tickers and stable identifiers", () => {
  const equities = getSearchIndex("Equities");
  assert.equal(equities.length, 22584);
  assert.equal(new Set(equities.map((item) => item.name)).size, equities.length);
  assert.equal(new Set(equities.map((item) => item.symbol)).size, equities.length);
  assert.equal(new Set(equities.map((item) => item.id)).size, equities.length);
});

test("fast shelf facets stay aligned with the complete index", () => {
  const index = getSearchIndex();
  const all = searchCatalog({});
  for (const risk of ["Conservative", "Moderate", "High"]) assert.equal(all.facets.risks[risk], index.filter((item) => item.risk === risk).length, `All ${risk} count drifted`);
  for (const status of ["Available", "New", "Limited"]) assert.equal(all.facets.statuses[status], index.filter((item) => item.status === status).length, `All ${status} count drifted`);
  for (const flag of Object.keys(FLAG_DEFINITIONS)) assert.equal(all.facets.flags[flag], index.filter((item) => item.flags.includes(flag)).length, `All ${flag} count drifted`);
  for (const category of CATEGORY_ORDER.slice(1)) {
    const records = index.filter((item) => item.category === category);
    const result = searchCatalog({ category });
    assert.equal(result.total, records.length);
    for (const risk of ["Conservative", "Moderate", "High"]) {
      assert.equal(result.facets.risks[risk], records.filter((item) => item.risk === risk).length, `${category} ${risk} count drifted`);
    }
    for (const status of ["Available", "New", "Limited"]) {
      assert.equal(result.facets.statuses[status], records.filter((item) => item.status === status).length, `${category} ${status} count drifted`);
    }
    for (const flag of Object.keys(FLAG_DEFINITIONS)) {
      assert.equal(result.facets.flags[flag], records.filter((item) => item.flags.includes(flag)).length, `${category} ${flag} count drifted`);
    }
  }
});

test("search summaries omit detail-only data and stay lightweight", () => {
  const result = searchCatalog({});
  assert.equal("description" in result.items[0], false);
  assert.equal("benchmark" in result.items[0], false);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 12000);
  assert.match(result.items[0].researchStatus.label, /Approved|Under review|Not rated/);
});

test("text search never fabricates unrelated rows", () => {
  const result = searchCatalog({ q: "Apple" });
  assert.ok(result.total >= 1);
  assert.equal(result.items[0].symbol, "AAPL");
  assert.equal(result.items[0].brandKey, "apple");
  assert.equal(result.items[0].matchReason, "Matched on product name");
  assert.ok(result.items.every((item) => /apple/i.test(item.name)));
  assert.equal(result.searchMode, "strict");
});

test("exact identifiers outrank text and explain why they matched", () => {
  const ticker = searchCatalog({ q: "AAPL" });
  const appleCusip = searchCatalog({ q: "037833100" });
  const formattedAppleCusip = searchCatalog({ q: "037-833-100" });
  const identifier = searchCatalog({ q: "594918CE2" });
  assert.equal(ticker.items[0].symbol, "AAPL");
  assert.equal(ticker.items[0].matchReason, "Exact ticker match");
  assert.deepEqual(appleCusip.items.map((item) => item.id), ticker.items.map((item) => item.id));
  assert.deepEqual(formattedAppleCusip.items.map((item) => item.id), ticker.items.map((item) => item.id));
  assert.equal(appleCusip.total, 1);
  assert.equal(appleCusip.items[0].matchReason, "Exact identifier match");
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
  assert.ok(result.items.every((item) => /\bvest/i.test(`${item.name} ${item.manager}`)));
  assert.ok(result.items.some((item) => item.manager === "Cboe Vest"));
  assert.ok(result.items.every((item) => item.manager !== "Parnassus Investments"));
});

test("typeahead prefixes work while typo correction remains controlled", () => {
  const prefix = searchCatalog({ q: "Micros" });
  const typo = searchCatalog({ q: "Microsft" });
  const unrelated = searchCatalog({ q: "quantum banana" });
  assert.ok(prefix.items.length > 0 && prefix.items.every((item) => /\bmicros/i.test(`${item.name} ${item.manager}`)));
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

test("CIO Select spans mutual funds, ETFs and SMAs only", () => {
  const categories = ["Mutual Funds", "ETFs", "SMAs"];
  for (const category of categories) {
    const result = searchCatalog({ category, flags: ["CIO Select"] });
    assert.ok(result.total > 0, `missing CIO Select ${category}`);
    assert.ok(result.items.every((item) => item.category === category && item.flags.includes("CIO Select")));
  }
  assert.equal(searchCatalog({ category: "Equities", flags: ["CIO Select"] }).total, 0);
  assert.equal("SMA Select" in FLAG_DEFINITIONS, false);
});

test("sorting is global across pagination boundaries", () => {
  const first = searchCatalog({ category: "ETFs", sort: "expenseRatio-asc" });
  const second = searchCatalog({ category: "ETFs", sort: "expenseRatio-asc", cursor: first.nextCursor });
  assert.ok((first.items.at(-1).fee ?? Infinity) <= (second.items[0].fee ?? Infinity));
  assert.equal(second.previousCursor, 0);
});

test("default shelf order is neutral and category sorts match displayed metrics", () => {
  const shelf = searchCatalog({});
  const shelfNames = shelf.items.map((item) => item.name);
  assert.deepEqual(shelfNames, [...shelfNames].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base", numeric: true })));

  const bonds = searchCatalog({ category: "Fixed Income", sort: "yieldToWorst-desc" });
  const snapshots = getMarketSnapshots(bonds.items.map((item) => item.id));
  const yields = bonds.items.map((item) => Number.parseFloat(snapshots[item.id].metrics.yieldToWorst.value));
  assert.ok(yields.every((value, index) => index === 0 || yields[index - 1] >= value));
});

test("sort fields fail closed when they do not apply to the active vehicle", () => {
  assert.throws(() => searchCatalog({ category: "Equities", sort: "expenseRatio-asc" }), /not available/);
  assert.throws(() => searchCatalog({ category: "All", sort: "yieldToWorst-desc" }), /not available/);
  assert.throws(() => searchCatalog({ sort: "relevance" }), /not available/);
  assert.doesNotThrow(() => searchCatalog({ q: "Apple", sort: "relevance" }));
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
  assert.equal("documents" in detail, false);
  assert.equal(detail.profile.quote.label, "3Y composite return");
  assert.ok(detail.profile.performance.benchmarkSeries.length > 10);
  assert.ok(detail.profile.operations.some((field) => field.label === "Customization review"));
  assert.equal("eligibility" in detail, false);
  assert.ok(detail.flags.includes("Model Delivered"));
  assert.equal(detail.flags.includes("Model Enabled"), false);
  assert.equal(detail.controls.research.label, "Approved · Qualitative");
  assert.equal(detail.controls.shelf.label, "Available");
  assert.equal(detail.controls.operations.label, "Operationally ready");
  assert.equal(detail.controls.data.source, "Strategy Master");
  assert.equal(detail.controls.changes.length, 3);
  assert.deepEqual(detail.controls.changes.map((change) => change.type), ["Data", "Research", "Shelf"]);
});

test("research, shelf and operational controls remain separate", () => {
  const limited = getInvestmentDetail("alt-bcred");
  assert.equal(limited.controls.shelf.label, "Limited capacity");
  assert.equal(limited.controls.operations.label, "Capacity constrained");
  assert.notEqual(limited.controls.research.label, limited.controls.shelf.label);

  const newlyAdded = getInvestmentDetail("sma-ups-climate");
  assert.equal(newlyAdded.controls.shelf.label, "New to shelf");
  assert.equal(newlyAdded.controls.research.label, "Under review");
  assert.equal(newlyAdded.controls.research.owner, "Product Due Diligence");
});

test("standalone profile slugs and vehicle-specific research are complete", () => {
  const apple = getInvestmentDetail("AAPL");
  assert.equal(apple.id, "eq-aapl");
  assert.equal(apple.canonicalSlug, "AAPL");
  assert.equal(apple.profile.quote.label, "Market price");
  const expectations = new Map([
    ["Equities", "Market price"], ["Mutual Funds", "NAV"], ["ETFs", "Market price"], ["SMAs", "3Y composite return"],
    ["Fixed Income", "Clean price"], ["Alternatives", "Latest reported NAV"], ["Structured", "Indicative value"],
    ["Managed Options", "3Y composite return"], ["Annuities", "Current crediting rate"], ["Precious Metals", "Reference price"],
  ]);
  const index = getSearchIndex();
  for (const [category, quoteLabel] of expectations) {
    const record = index.find((item) => item.category === category);
    const detail = getInvestmentDetail(record.id);
    assert.equal(detail.profile.quote.label, quoteLabel, `wrong primary value for ${category}`);
    assert.ok(detail.profile.keyFacts.length >= 6, `missing key facts for ${category}`);
    assert.ok(detail.profile.performance.rows.length >= 3, `missing performance for ${category}`);
    assert.ok(detail.profile.riskMetrics.length >= 4, `missing risk measures for ${category}`);
    assert.ok(detail.profile.operations.length >= 6, `missing operating terms for ${category}`);
  }
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
  const payload = await valid.json();
  assert.equal(payload.items.length, 25);
  assert.equal("marketSnapshot" in payload.items[0], false);
  assert.match(valid.headers.get("server-timing"), /^search;dur=/);
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /category|page size/i);
});

test("search snapshots expose decision-useful fields by vehicle", () => {
  const expectations = new Map([
    ["Equities", ["Market price", "Forward P/E", "Dividend yield"]],
    ["Mutual Funds", ["NAV", "30-day SEC yield", "Expense ratio"]],
    ["SMAs", ["3Y composite", "Minimum", "Manager fee"]],
    ["Fixed Income", ["Clean price", "Yield to worst", "Credit rating"]],
    ["Structured", ["Indicative value", "Contingent coupon", "Term"]],
  ]);
  for (const [category, labels] of expectations) {
    const [item] = searchCatalog({ category, pageSize: 1 }).items;
    const snapshot = getMarketSnapshots([item.id])[item.id];
    const featured = snapshot.featured.map((metric) => snapshot.metrics[metric]);
    assert.deepEqual([snapshot.primary.label, ...featured.map((metric) => metric.label)], labels);
    assert.equal(snapshot.trend.points.length, 14);
  }
});

test("snapshot API batches visible rows and rejects oversized requests", async () => {
  const ids = searchCatalog({ category: "Equities", pageSize: 3 }).items.map((item) => item.id);
  const valid = await snapshotHandler.fetch(new Request(`https://example.test/api/snapshots?ids=${ids.join(",")}`));
  const invalid = await snapshotHandler.fetch(new Request(`https://example.test/api/snapshots?ids=${Array.from({ length: 26 }, (_, index) => `eq-${index}`).join(",")}`));
  assert.equal(valid.status, 200);
  assert.equal(Object.keys((await valid.json()).snapshots).length, 3);
  assert.equal(invalid.status, 400);
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
