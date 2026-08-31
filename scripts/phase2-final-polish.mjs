import { readFile, writeFile } from "node:fs/promises";

async function edit(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  await writeFile(path, after);
}

function once(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(from, to);
}

function all(source, from, to, expected, label) {
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  return source.split(from).join(to);
}

await edit("lib/advisor-book-source.js", (source) => {
  source = once(source,
    'return name.split(/\\s+/).filter((part) => !["Household", "Family"].includes(part)).slice(0, 2).map((part) => part[0]).join("").toUpperCase();',
    'return name.split(/[\\s-]+/).filter((part) => !["Household", "Family"].includes(part)).slice(0, 2).map((part) => part[0]).join("").toUpperCase();',
    "hyphenated household initials"
  );
  source = once(source, 'if (cashPct >= 7) insights.push(', 'if (cashPct >= 10) insights.push(', "cash opportunity threshold");
  source = once(source,
    'const callAmount = round(50_000 + (seed % 7) * 25_000, 5000);',
    'const callAmount = round(50_000 + (Math.floor(seed / 7) % 6) * 25_000, 5000);',
    "capital-call variation"
  );
  source = once(source,
    '  advisors: base.advisors,',
    '  advisors: base.advisors.map((advisor) => ({ ...advisor, initials: advisor.initials || "A4" })),',
    "advisor presentation data"
  );
  return source;
});

await edit("lib/wealth-service.js", (source) => {
  source = all(source, 'record.name.split(/\\s+/)', 'record.name.split(/[\\s-]+/)', 2, "household initials fallback");
  source = once(source,
    '      advisor: advisor?.displayName || record.advisorId,\n      relationshipType:',
    '      advisor: advisor?.displayName || record.advisorId,\n      advisorInitials: advisor?.initials || (advisor?.displayName || record.advisorId).split(/[\\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),\n      advisorWorkspace: advisor?.workspaceLabel || "Advisor workspace",\n      relationshipType:',
    "household advisor projection"
  );
  source = once(source,
    '    if (financialAssets && cash / financialAssets >= 0.07) focus.push("cash");',
    '    if (insights.some((insight) => insight.severity === "Opportunity") || (financialAssets && cash / financialAssets >= 0.10)) focus.push("cash");',
    "book cash focus"
  );
  source = once(source,
    '    const metrics = {\n      householdCount:',
    '    const asOf = items.find((item) => item.asOf)?.asOf || null;\n    const metrics = {\n      householdCount:',
    "book as-of derivation"
  );
  source = once(source,
    '      advisor: { id: advisor.id, displayName: advisor.displayName, workspaceLabel: advisor.workspaceLabel },\n      metrics,',
    '      advisor: { id: advisor.id, displayName: advisor.displayName, initials: advisor.initials || advisor.displayName.split(/[\\s-]+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), workspaceLabel: advisor.workspaceLabel },\n      asOf,\n      metrics,',
    "book advisor projection"
  );
  source = once(source,
    '      advisor: base.advisor,\n      metrics: base.metrics,',
    '      advisor: base.advisor,\n      asOf: base.asOf,\n      metrics: base.metrics,',
    "paged book as-of"
  );
  source = once(source,
    '    getAdvisorBook,\n    getHouseholdOverview,',
    '    getAdvisorBook,\n    householdBelongsToAdvisor: (advisorId, householdId) => repository.getHousehold(householdId)?.advisorId === advisorId,\n    getHouseholdOverview,',
    "advisor entitlement seam"
  );
  return source;
});

await edit("api/wealth.js", (source) => {
  source = once(source,
    'const wealthService = createWealthService(ADVISOR_BOOK_DATASET);',
    'const wealthService = createWealthService(ADVISOR_BOOK_DATASET);\n// Prototype principal. Production authentication should resolve the signed-in FA to this advisor-domain ID server-side.\nconst DEMO_PRINCIPAL_ADVISOR_ID = DEFAULT_ADVISOR_ID;',
    "demo principal"
  );
  source = once(source,
    'export default async function handler(request, response) {',
    `export function getAuthorizedWealthProjection(principalAdvisorIdValue, idValue, viewValue = "overview", entityIdValue = "", options = {}) {\n  const principalAdvisorId = parseAdvisorId(principalAdvisorIdValue || DEMO_PRINCIPAL_ADVISOR_ID);\n  const view = parseProjectionView(viewValue);\n  if (view === "book") {\n    const advisorId = parseAdvisorId(idValue || principalAdvisorId);\n    if (advisorId !== principalAdvisorId) return null;\n    return wealthService.getAdvisorBook(advisorId, options);\n  }\n  const householdId = parseHouseholdId(idValue);\n  if (!wealthService.householdBelongsToAdvisor(principalAdvisorId, householdId)) return null;\n  return getWealthProjection(householdId, view, entityIdValue, options);\n}\n\nexport default async function handler(request, response) {`,
    "authorized projection"
  );
  source = once(source,
    '      data = getWealthProjection(id, view, "", {',
    '      data = getAuthorizedWealthProjection(DEMO_PRINCIPAL_ADVISOR_ID, id, view, "", {',
    "authorized book handler"
  );
  source = once(source,
    '      data = getWealthProjection(id, view, entityId);',
    '      data = getAuthorizedWealthProjection(DEMO_PRINCIPAL_ADVISOR_ID, id, view, entityId);',
    "authorized household handler"
  );
  return source;
});

await edit("local-server.mjs", (source) => {
  source = once(source,
    'import { getWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "./api/wealth.js";',
    'import { getAuthorizedWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "./api/wealth.js";\nimport { DEFAULT_ADVISOR_ID } from "./lib/advisor-book-source.js";',
    "local authorization import"
  );
  source = once(source,
    '        data = getWealthProjection(id, view, "", {',
    '        data = getAuthorizedWealthProjection(DEFAULT_ADVISOR_ID, id, view, "", {',
    "local authorized book"
  );
  source = once(source,
    '        data = getWealthProjection(id, view, entityId);',
    '        data = getAuthorizedWealthProjection(DEFAULT_ADVISOR_ID, id, view, entityId);',
    "local authorized household"
  );
  return source;
});

await edit("index.html", (source) => once(source,
  `        <div class="advisor-profile" aria-label="Demo workspace">\n          <span class="avatar">A4</span>\n          <span><strong>Advisor 042</strong><small>Demo workspace</small></span>\n        </div>`,
  `        <div class="advisor-profile" id="advisorProfile" aria-label="Advisor workspace">\n          <span class="avatar" id="advisorAvatar">—</span>\n          <span><strong id="advisorName">Advisor</strong><small id="advisorWorkspace">Workspace</small></span>\n        </div>`,
  "dynamic advisor header"
));

await edit("app.js", (source) => {
  source = once(source,
    'function renderBookSummary(data) {',
    `function renderAdvisorIdentity({ displayName, initials, workspaceLabel } = {}) {\n  el("advisorAvatar").textContent = initials || "—";\n  el("advisorName").textContent = displayName || "Advisor";\n  el("advisorWorkspace").textContent = workspaceLabel || "Advisor workspace";\n  el("advisorProfile").setAttribute("aria-label", workspaceLabel || "Advisor workspace");\n}\n\nfunction renderBookSummary(data) {`,
    "advisor identity renderer"
  );
  source = once(source,
    '  el("bookUpdated").textContent = "Updated through Aug 21, 2026 · 9:42 AM ET";\n  el("bookHouseholdCount")',
    '  el("bookUpdated").textContent = data.asOf ? `Updated through ${data.asOf}` : "Current client data";\n  renderAdvisorIdentity(data.advisor);\n  el("bookHouseholdCount")',
    "data-driven book timestamp"
  );
  source = once(source,
    'function renderWealthWorkspace() {\n  if (!HOUSEHOLD) return;\n  const concentration =',
    'function renderWealthWorkspace() {\n  if (!HOUSEHOLD) return;\n  renderAdvisorIdentity({ displayName: HOUSEHOLD.advisor, initials: HOUSEHOLD.advisorInitials, workspaceLabel: HOUSEHOLD.advisorWorkspace });\n  const concentration =',
    "household advisor identity"
  );
  source = once(source, 'pageSize: 64, signal: controller.signal', 'pageSize: 48, signal: controller.signal', "book initial page size");
  source = once(source,
    'q: `${HOUSEHOLD.location} municipal income under 50 bps`, flags: ["Tax-Aware"], risks: ["Conservative"]',
    'q: HOUSEHOLD.location === "New York" ? "New York municipal income under 50 bps" : "municipal income under 50 bps", flags: ["Tax-Aware"], risks: ["Conservative"]',
    "municipal scenario query"
  );
  return source;
});

await edit("tests/advisor-book.test.mjs", (source) => {
  source = once(source,
    '  assert.equal(firstPage.metrics.householdCount, 128);',
    '  assert.equal(firstPage.metrics.householdCount, 128);\n  assert.equal(firstPage.asOf, firstPage.items[0].asOf);\n  assert.equal(firstPage.advisor.initials, "A4");',
    "book metadata test"
  );
  source = once(source,
    '  assert.ok(firstPage.focusCounts.cash > 0);',
    '  assert.ok(firstPage.focusCounts.cash > 0);\n  assert.ok(firstPage.focusCounts.cash < firstPage.metrics.householdCount);',
    "cash signal selectivity"
  );
  source = once(source,
    '  const cash = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "cash", sort: "cash-desc", pageSize: 200 });',
    '  const hyphenated = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { query: "Patel-Brooks" });\n  assert.equal(hyphenated.items[0].initials, "PB");\n\n  const cash = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { focus: "cash", sort: "cash-desc", pageSize: 200 });',
    "initials test"
  );
  source = once(source,
    '  for (let index = 1; index < cash.items.length; index += 1) assert.ok(cash.items[index - 1].cash >= cash.items[index].cash);\n});',
    '  for (let index = 1; index < cash.items.length; index += 1) assert.ok(cash.items[index - 1].cash >= cash.items[index].cash);\n\n  const generatedCalls = ADVISOR_BOOK_DATASET.insights.filter((insight) => insight.severity === "Upcoming" && insight.id !== "capital-call");\n  assert.ok(new Set(generatedCalls.map((insight) => insight.title)).size >= 4);\n  assert.equal(service.householdBelongsToAdvisor(DEFAULT_ADVISOR_ID, "household-morrison"), true);\n  assert.equal(service.householdBelongsToAdvisor("advisor-other", "household-morrison"), false);\n});',
    "variation and ownership tests"
  );
  return source;
});

await edit("tests/wealth.test.mjs", (source) => {
  source = once(source,
    'import { getWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "../api/wealth.js";',
    'import { getAuthorizedWealthProjection, getWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "../api/wealth.js";',
    "authorized BFF test import"
  );
  source = once(source,
    '  assert.equal(book.nextCursor, 7);',
    '  assert.equal(book.nextCursor, 7);\n  assert.ok(book.asOf);\n  assert.equal(getAuthorizedWealthProjection("advisor-other", "advisor-042", "book", "", { pageSize: 7 }), null);\n  assert.equal(getAuthorizedWealthProjection("advisor-other", DEFAULT_HOUSEHOLD_ID, "overview"), null);\n  assert.equal(getAuthorizedWealthProjection("advisor-042", DEFAULT_HOUSEHOLD_ID, "overview").household.id, DEFAULT_HOUSEHOLD_ID);',
    "authorized BFF assertions"
  );
  source = once(source,
    '  assert.match(html, /id="bookBody"/);',
    '  assert.match(html, /id="bookBody"/);\n  assert.match(html, /id="advisorAvatar"/);\n  assert.match(html, /id="advisorName"/);\n  assert.doesNotMatch(html, /<strong>Advisor 042<\\/strong>/);',
    "dynamic advisor markup test"
  );
  source = once(source,
    '  assert.match(app, /loadAdvisorBook/);',
    '  assert.match(app, /loadAdvisorBook/);\n  assert.match(app, /renderAdvisorIdentity/);\n  assert.doesNotMatch(app, /Updated through Aug 21, 2026/);\n  assert.match(app, /pageSize: 48/);',
    "dynamic app test"
  );
  source = once(source,
    '  assert.match(wealthApi, /getAdvisorBook/);',
    '  assert.match(wealthApi, /getAdvisorBook/);\n  assert.match(wealthApi, /getAuthorizedWealthProjection/);\n  assert.match(wealthApi, /householdBelongsToAdvisor/);',
    "authorization seam test"
  );
  source = once(source,
    '  assert.doesNotMatch(build, /"wealth-source\\.js"|"wealth-repository\\.js"|"wealth-service\\.js"/);',
    '  assert.doesNotMatch(build, /"wealth-source\\.js"|"advisor-book-source\\.js"|"wealth-repository\\.js"|"wealth-service\\.js"/);',
    "server-only source test"
  );
  return source;
});

console.log("Phase Two final polish applied.");
