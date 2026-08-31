from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text()


def write(path, value):
    (ROOT / path).write_text(value)


def replace_once(source, old, new, label):
    if source.count(old) != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {source.count(old)}")
    return source.replace(old, new, 1)


def regex_once(source, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated

# ---------------------------------------------------------------------------
# Repository: optional normalized decision/event collections + indexes.
# ---------------------------------------------------------------------------
path = "lib/wealth-repository.js"
source = read(path)
source = replace_once(source,
'''  for (const collection of REQUIRED_COLLECTIONS) assert(Array.isArray(dataset[collection]), `${collection} must be an array`);

  const advisorsById''',
'''  for (const collection of REQUIRED_COLLECTIONS) assert(Array.isArray(dataset[collection]), `${collection} must be an array`);
  const decisionRecords = Array.isArray(dataset.decisions) ? dataset.decisions : EMPTY;
  const householdEventRecords = Array.isArray(dataset.householdEvents) ? dataset.householdEvents : EMPTY;

  const advisorsById''', "repository optional collections")
source = replace_once(source,
'''  const concentrationPoliciesById = buildIdIndex(dataset.concentrationPolicies, "concentrationPolicies");
  const historiesById = buildIdIndex(dataset.histories, "histories");''',
'''  const concentrationPoliciesById = buildIdIndex(dataset.concentrationPolicies, "concentrationPolicies");
  const historiesById = buildIdIndex(dataset.histories, "histories");
  const decisionsById = buildIdIndex(decisionRecords, "decisions");
  const householdEventsById = buildIdIndex(householdEventRecords, "householdEvents");''', "repository decision indexes")
source = replace_once(source,
'''  assertForeignKey(dataset.concentrationPolicies, "householdId", householdsById, "concentration policy");
  assertForeignKey(dataset.histories, "householdId", householdsById, "history");

  for (const position of dataset.positions) {''',
'''  assertForeignKey(dataset.concentrationPolicies, "householdId", householdsById, "concentration policy");
  assertForeignKey(dataset.histories, "householdId", householdsById, "history");
  assertForeignKey(decisionRecords, "householdId", householdsById, "decision");
  assertForeignKey(decisionRecords, "advisorId", advisorsById, "decision");
  assertForeignKey(householdEventRecords, "householdId", householdsById, "household event");
  for (const decision of decisionRecords) {
    const household = householdsById.get(decision.householdId);
    assert(household.advisorId === decision.advisorId, `decision ${decision.id} crosses advisor/household boundaries`);
    if (decision.sourceInsightId) {
      const insight = insightsById.get(decision.sourceInsightId);
      assert(insight && insight.householdId === decision.householdId, `decision ${decision.id} references invalid sourceInsightId ${decision.sourceInsightId}`);
    }
  }
  for (const event of householdEventRecords) {
    if (!event.decisionId) continue;
    const decision = decisionsById.get(event.decisionId);
    assert(decision && decision.householdId === event.householdId, `household event ${event.id} references invalid decisionId ${event.decisionId}`);
  }

  for (const position of dataset.positions) {''', "repository decision fks")
source = replace_once(source,
'''  const concentrationPoliciesByHousehold = buildGroupIndex(dataset.concentrationPolicies, "householdId");
  const historiesByHousehold = buildGroupIndex(dataset.histories, "householdId");

  const stats = Object.freeze(Object.fromEntries(REQUIRED_COLLECTIONS.map((collection) => [collection, dataset[collection].length])));''',
'''  const concentrationPoliciesByHousehold = buildGroupIndex(dataset.concentrationPolicies, "householdId");
  const historiesByHousehold = buildGroupIndex(dataset.histories, "householdId");
  const decisionsByHousehold = buildGroupIndex(decisionRecords, "householdId");
  const householdEventsByHousehold = buildGroupIndex(householdEventRecords, "householdId");

  const stats = Object.freeze({
    ...Object.fromEntries(REQUIRED_COLLECTIONS.map((collection) => [collection, dataset[collection].length])),
    decisions: decisionRecords.length,
    householdEvents: householdEventRecords.length,
  });''', "repository decision groups")
source = replace_once(source,
'''    getAccount: (id) => accountsById.get(id) || null,
    getGoal: (id) => goalsById.get(id) || null,''',
'''    getAccount: (id) => accountsById.get(id) || null,
    getGoal: (id) => goalsById.get(id) || null,
    getDecision: (id) => decisionsById.get(id) || null,''', "repository get decision")
source = replace_once(source,
'''    listHouseholdConcentrationPolicies: (householdId) => concentrationPoliciesByHousehold.get(householdId) || EMPTY,
    listHouseholdHistories: (householdId) => historiesByHousehold.get(householdId) || EMPTY,''',
'''    listHouseholdConcentrationPolicies: (householdId) => concentrationPoliciesByHousehold.get(householdId) || EMPTY,
    listHouseholdHistories: (householdId) => historiesByHousehold.get(householdId) || EMPTY,
    listHouseholdDecisions: (householdId) => decisionsByHousehold.get(householdId) || EMPTY,
    listHouseholdEvents: (householdId) => householdEventsByHousehold.get(householdId) || EMPTY,''', "repository decision readers")
write(path, source)

# ---------------------------------------------------------------------------
# Wealth service: shared repository option and lightweight decision state in book.
# ---------------------------------------------------------------------------
path = "lib/wealth-service.js"
source = read(path)
source = replace_once(source,
'''const DEFAULT_CACHE_LIMITS = Object.freeze({
  book: 20,''',
'''const ACTIVE_PLAN_STATUSES = new Set(["Plan drafted", "Client discussion", "In progress"]);
const CLOSED_DECISION_STATUSES = new Set(["Complete"]);

const DEFAULT_CACHE_LIMITS = Object.freeze({
  book: 20,''', "wealth service decision constants")
source = replace_once(source,
'''export function createWealthService(dataset, { cacheLimits = {} } = {}) {
  const repository = createWealthRepository(dataset);''',
'''export function createWealthService(dataset, { cacheLimits = {}, repository: repositoryOverride = null } = {}) {
  const repository = repositoryOverride || createWealthRepository(dataset);''', "wealth service shared repository")
source = replace_once(source,
'''    const insights = repository.listHouseholdInsights(householdId).map(projectInsight);
    const financialAssets = sum(accounts, (account) => account.marketValue);''',
'''    const insights = repository.listHouseholdInsights(householdId).map(projectInsight);
    const decisions = repository.listHouseholdDecisions(householdId);
    const openDecisions = decisions.filter((decision) => !CLOSED_DECISION_STATUSES.has(decision.status));
    const plans = openDecisions.filter((decision) => ACTIVE_PLAN_STATUSES.has(decision.status));
    const financialAssets = sum(accounts, (account) => account.marketValue);''', "book decision records")
source = replace_once(source,
'''    if (heldAway > 0) focus.push("held-away");
    return deepFreeze({''',
'''    if (heldAway > 0) focus.push("held-away");
    if (openDecisions.length) focus.push("decisions");
    if (plans.length) focus.push("plans");
    return deepFreeze({''', "book decision focus")
source = replace_once(source,
'''      attentionCount: insights.filter((insight) => insight.tone === "red" || insight.tone === "amber" || insight.tone === "green").length,
      priority: priority ? { severity: priority.severity, tone: priority.tone, title: priority.title, detail: priority.detail } : null,''',
'''      attentionCount: insights.filter((insight) => insight.tone === "red" || insight.tone === "amber" || insight.tone === "green").length,
      openDecisionCount: openDecisions.length,
      planCount: plans.length,
      decisionStatus: plans[0]?.status || openDecisions[0]?.status || null,
      priority: priority ? { severity: priority.severity, tone: priority.tone, title: priority.title, detail: priority.detail } : null,''', "book decision summary")
source = replace_once(source,
'''      searchText: `${record.name} ${record.location || ""} ${record.riskProfile || ""} ${priority?.title || ""}`.toLowerCase(),''',
'''      searchText: `${record.name} ${record.location || ""} ${record.riskProfile || ""} ${priority?.title || ""} ${openDecisions.map((decision) => decision.title).join(" ")}`.toLowerCase(),''', "book decision search")
source = replace_once(source,
'''    const focusKeys = ["priority", "cash", "goals", "upcoming", "held-away"];''',
'''    const focusKeys = ["priority", "cash", "goals", "upcoming", "held-away", "decisions", "plans"];''', "book decision focus counts")
source = replace_once(source,
'''      heldAwayAssets: sum(items, (item) => item.heldAway),
      attentionHouseholds: items.filter((item) => item.priorityScore >= 3).length,''',
'''      heldAwayAssets: sum(items, (item) => item.heldAway),
      attentionHouseholds: items.filter((item) => item.priorityScore >= 3).length,
      openDecisions: sum(items, (item) => item.openDecisionCount),
      plansInProgress: sum(items, (item) => item.planCount),''', "book decision metrics")
write(path, source)

# ---------------------------------------------------------------------------
# Wealth API uses decision-enriched workspace dataset and new book focus keys.
# ---------------------------------------------------------------------------
path = "api/wealth.js"
source = read(path)
source = replace_once(source,
'''import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "../lib/advisor-book-source.js";''',
'''import { ADVISOR_WORKSPACE_DATASET, DEFAULT_ADVISOR_ID } from "../lib/decision-source.js";''', "wealth api workspace dataset import")
source = source.replace("createWealthService(ADVISOR_BOOK_DATASET)", "createWealthService(ADVISOR_WORKSPACE_DATASET)")
source = replace_once(source,
'''const BOOK_FOCUS = new Set(["all", "priority", "cash", "goals", "upcoming", "held-away"]);''',
'''const BOOK_FOCUS = new Set(["all", "priority", "cash", "goals", "upcoming", "held-away", "decisions", "plans"]);''', "wealth api decision focus")
write(path, source)

# ---------------------------------------------------------------------------
# Local server: decision endpoint and keep server-only domain modules private.
# ---------------------------------------------------------------------------
path = "local-server.mjs"
source = read(path)
source = replace_once(source,
'''import { getAuthorizedWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "./api/wealth.js";
import { DEFAULT_ADVISOR_ID } from "./lib/advisor-book-source.js";''',
'''import { getAuthorizedWealthProjection, parseAdvisorId, parseHouseholdId, parseProjectionView } from "./api/wealth.js";
import { getAuthorizedDecisionProjection } from "./api/decision.js";
import { DEFAULT_ADVISOR_ID } from "./lib/decision-source.js";''', "local decision imports")
wealth_route_end = '''  const requested = url.pathname === "/" || /^\\/household\\/[^/]+\\/?$/.test(url.pathname) || /^\\/investments\\/?$/.test(url.pathname) || /^\\/investment\\/[^/]+\\/?$/.test(url.pathname)
'''
decision_route = r'''  if (url.pathname === "/api/decision") {
    const startedAt = performance.now();
    try {
      const view = String(url.searchParams.get("view") || "summary").toLowerCase();
      const householdId = url.searchParams.get("householdId");
      const decisionId = view === "detail" || view === "scenario" ? url.searchParams.get("decisionId") : "";
      const numericKeys = ["targetWeight", "taxRate", "stressDrop", "goalFunding", "redeployAmount", "deployAmount", "reservePct", "fundingAmount", "allocationAmount"];
      const inputs = Object.fromEntries(numericKeys.map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value !== null && value !== "").map(([key, value]) => [key, Number(value)]));
      if (Object.values(inputs).some((value) => !Number.isFinite(value))) throw new RangeError("Invalid decision scenario input");
      const data = getAuthorizedDecisionProjection(DEFAULT_ADVISOR_ID, householdId, view, decisionId, inputs);
      return data === null
        ? json(response, { error: "Decision workspace not found" }, 404)
        : json(response, { schemaVersion: 1, householdId, decisionId: decisionId || null, view, data }, 200, { "Server-Timing": `decision;dur=${Math.max(0.1, performance.now() - startedAt).toFixed(1)}` });
    } catch (error) {
      return json(response, { error: error.message }, error instanceof RangeError ? 400 : 500);
    }
  }
  if (/^\/lib\/(?:wealth-source|advisor-book-source|decision-source|wealth-repository|wealth-service|decision-service)\.js$/.test(url.pathname)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
'''
source = replace_once(source, wealth_route_end, decision_route + wealth_route_end, "local decision route")
write(path, source)

# ---------------------------------------------------------------------------
# Static browser build + syntax gate.
# ---------------------------------------------------------------------------
path = "scripts/build-static.mjs"
source = read(path)
source = replace_once(source,
'''["shared-config.js", "brand-logos.js", "column-config.js", "sort-config.js", "range-config.js", "wealth-data.js"]''',
'''["shared-config.js", "brand-logos.js", "column-config.js", "sort-config.js", "range-config.js", "wealth-data.js", "decision-data.js"]''', "static decision client")
write(path, source)

path = "package.json"
source = read(path)
source = replace_once(source,
'''node --check lib/wealth-source.js && node --check lib/advisor-book-source.js && node --check lib/wealth-repository.js && node --check lib/wealth-service.js && node --check lib/wealth-data.js''',
'''node --check lib/wealth-source.js && node --check lib/advisor-book-source.js && node --check lib/decision-source.js && node --check lib/wealth-repository.js && node --check lib/wealth-service.js && node --check lib/decision-service.js && node --check lib/wealth-data.js && node --check lib/decision-data.js''', "package decision syntax")
source = replace_once(source,
'''node --check api/snapshots.js && node --check api/wealth.js && node --check local-server.mjs''',
'''node --check api/snapshots.js && node --check api/wealth.js && node --check api/decision.js && node --check local-server.mjs''', "package decision api syntax")
write(path, source)

# ---------------------------------------------------------------------------
# Index: My Book evolves toward decision workflow + full-screen studio shell.
# ---------------------------------------------------------------------------
path = "index.html"
source = read(path)
source = replace_once(source,
'''    <link rel="modulepreload" href="/lib/wealth-data.js" />''',
'''    <link rel="modulepreload" href="/lib/wealth-data.js" />
    <link rel="modulepreload" href="/lib/decision-data.js" />''', "decision preload")
source = replace_once(source,
'''          <div><span>Needs attention</span><strong class="book-watch" id="bookAttentionCount">—</strong><small>Priority or review items</small></div>''',
'''          <div><span>Open decisions</span><strong class="book-watch" id="bookOpenDecisionCount">—</strong><small>Across active relationships</small></div>''', "book decision metric")
source = replace_once(source,
'''              <button type="button" class="active" data-book-focus="all">All households</button>
              <button type="button" data-book-focus="priority">Priority risk <span id="bookFilterPriority">—</span></button>''',
'''              <button type="button" class="active" data-book-focus="all">All households</button>
              <button type="button" data-book-focus="decisions">Open decisions <span id="bookFilterDecisions">—</span></button>
              <button type="button" data-book-focus="priority">Priority risk <span id="bookFilterPriority">—</span></button>''', "book decision filter")
source = source.replace("<th>Needs attention</th>", "<th>Decision / attention</th>", 1)
source = replace_once(source,
'''              <button type="button" data-book-focus="priority"><i class="book-signal red"></i><span><small>Priority risk</small><strong id="bookIntelPriority">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="cash"><i class="book-signal green"></i><span><small>Deployable cash</small><strong id="bookIntelCash">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="goals"><i class="book-signal amber"></i><span><small>Planning</small><strong id="bookIntelGoals">— goal reviews</strong></span><b>›</b></button>
              <button type="button" data-book-focus="upcoming"><i class="book-signal blue"></i><span><small>Upcoming</small><strong id="bookIntelUpcoming">— obligations</strong></span><b>›</b></button>
              <button type="button" data-book-focus="held-away"><i class="book-signal slate"></i><span><small>Full balance sheet</small><strong id="bookIntelHeldAway">— with held-away assets</strong></span><b>›</b></button>''',
'''              <button type="button" data-book-focus="decisions"><i class="book-signal red"></i><span><small>Open decisions</small><strong id="bookIntelDecisions">— active</strong></span><b>›</b></button>
              <button type="button" data-book-focus="plans"><i class="book-signal slate"></i><span><small>Plans in motion</small><strong id="bookIntelPlans">— active plans</strong></span><b>›</b></button>
              <button type="button" data-book-focus="priority"><i class="book-signal red"></i><span><small>Priority risk</small><strong id="bookIntelPriority">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="cash"><i class="book-signal green"></i><span><small>Deployable cash</small><strong id="bookIntelCash">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="goals"><i class="book-signal amber"></i><span><small>Planning</small><strong id="bookIntelGoals">— goal reviews</strong></span><b>›</b></button>
              <button type="button" data-book-focus="upcoming"><i class="book-signal blue"></i><span><small>Upcoming</small><strong id="bookIntelUpcoming">— obligations</strong></span><b>›</b></button>''', "book intelligence decision rail")
source = replace_once(source,
'''            <div class="book-intelligence-note"><span>BOOK VIEW</span><p>Select any relationship to enter the same Total Wealth experience, with only that household's data loaded.</p></div>''',
'''            <div class="book-intelligence-note"><span>DECISION WORKFLOW</span><p>Move from a book-level signal into the household, model the consequence, then carry an explicit plan into implementation.</p></div>''', "book decision note")
source = replace_once(source,
'''    <aside class="wealth-drawer" id="wealthDrawer" role="dialog" aria-labelledby="wealthDrawerTitle" aria-hidden="true">
      <div id="wealthDrawerContent"></div>
    </aside>

    <dialog class="modal compare-modal"''',
'''    <aside class="wealth-drawer" id="wealthDrawer" role="dialog" aria-labelledby="wealthDrawerTitle" aria-hidden="true">
      <div id="wealthDrawerContent"></div>
    </aside>

    <div class="decision-studio-backdrop" id="decisionStudioBackdrop" hidden></div>
    <section class="decision-studio" id="decisionStudio" role="dialog" aria-modal="true" aria-labelledby="decisionStudioTitle" aria-hidden="true" hidden>
      <div id="decisionStudioContent"></div>
    </section>

    <dialog class="modal compare-modal"''', "decision studio shell")
write(path, source)

# ---------------------------------------------------------------------------
# App: decision-aware book, household workflow, studio, modeling and plan loop.
# ---------------------------------------------------------------------------
path = "app.js"
source = read(path)
source = replace_once(source,
'''import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";''',
'''import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";
import { addDecisionCandidates, getDecisionPlan, getHouseholdPlanSummary, loadDecisionDetail, loadDecisionSummary, loadHouseholdTimeline, loadMeetingBrief, modelDecisionScenario, saveDecisionPlan, setDecisionPlanStatus, toggleDecisionPlanStep } from "/lib/decision-data.js";''', "app decision import")
source = replace_once(source,
'''  currentHouseholdId: null,
  bookController: null,''',
'''  currentHouseholdId: null,
  decisionSummary: null,
  activeDecisionDetail: null,
  activeDecisionScenario: null,
  activeDecisionPlan: null,
  decisionController: null,
  decisionScenarioController: null,
  bookController: null,''', "app decision state")
source = replace_once(source,
'''let bookPrefetchTimer = null;

const elementCache''',
'''let bookPrefetchTimer = null;
let decisionRequest = 0;
let decisionModelTimer = null;

const elementCache''', "app decision globals")

book_priority = r'''function bookPriorityMarkup(item) {
  const localPlan = getHouseholdPlanSummary(item.id);
  const planStatus = localPlan?.status || (item.planCount ? item.decisionStatus : null);
  const parts = [];
  if (planStatus) parts.push(`<span class="book-plan-pill"><i></i>${escapeHtml(planStatus)}</span>`);
  if (item.priority) parts.push(`<span class="book-priority book-priority-${escapeHtml(item.priority.tone)}"><i></i><span><strong>${escapeHtml(item.priority.title)}</strong><small>${escapeHtml(item.priority.detail)}</small></span></span>`);
  else if (item.openDecisionCount) parts.push(`<span class="book-priority-none"><strong>${item.openDecisionCount} open ${item.openDecisionCount === 1 ? "decision" : "decisions"}</strong><small>Relationship workflow active</small></span>`);
  else parts.push(`<span class="book-priority-none">No material exception</span>`);
  return `<span class="book-attention-stack">${parts.join("")}</span>`;
}
'''
source = regex_once(source, r'function bookPriorityMarkup\(item\) \{.*?\n\}\n\n(?=function renderAdvisorIdentity)', book_priority + "\n", "book priority workflow")

book_summary = r'''function renderBookSummary(data) {
  el("bookSubtitle").textContent = `${data.metrics.householdCount} households · one connected view of your client book`;
  el("bookUpdated").textContent = data.asOf ? `Updated through ${data.asOf}` : "Current client data";
  renderAdvisorIdentity(data.advisor);
  el("bookHouseholdCount").textContent = formatCount(data.metrics.householdCount);
  el("bookFinancialAssets").textContent = formatWealthCurrency(data.metrics.financialAssets);
  el("bookNetWorth").textContent = formatWealthCurrency(data.metrics.netWorth);
  el("bookCash").textContent = formatWealthCurrency(data.metrics.investableCash);
  el("bookOpenDecisionCount").textContent = formatCount(data.metrics.openDecisions || 0);
  const counts = data.focusCounts || {};
  const countMap = {
    bookFilterDecisions: counts.decisions,
    bookFilterPriority: counts.priority,
    bookFilterCash: counts.cash,
    bookFilterGoals: counts.goals,
    bookFilterUpcoming: counts.upcoming,
  };
  Object.entries(countMap).forEach(([id, value]) => { el(id).textContent = formatCount(value || 0); });
  el("bookIntelDecisions").textContent = `${formatCount(data.metrics.openDecisions || 0)} active`;
  el("bookIntelPlans").textContent = `${formatCount(data.metrics.plansInProgress || 0)} active plans`;
  el("bookIntelPriority").textContent = `${formatCount(counts.priority || 0)} households`;
  el("bookIntelCash").textContent = `${formatCount(counts.cash || 0)} households`;
  el("bookIntelGoals").textContent = `${formatCount(counts.goals || 0)} goal reviews`;
  el("bookIntelUpcoming").textContent = `${formatCount(counts.upcoming || 0)} obligations`;
}
'''
source = regex_once(source, r'function renderBookSummary\(data\) \{.*?\n\}\n\n(?=function renderBookRows)', book_summary + "\n", "book decision summary renderer")

book_rows = r'''function renderBookRows() {
  const rows = state.bookItems.map((item) => `<tr data-book-household-row="${escapeHtml(item.id)}"><th><button type="button" class="book-household-link" data-household-id="${escapeHtml(item.id)}"><span class="book-avatar">${escapeHtml(item.initials)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.location)} · ${item.accountCount} accounts · ${escapeHtml(item.riskProfile)}${item.openDecisionCount ? ` · ${item.openDecisionCount} open` : ""}</small></span><b>›</b></button></th><td>${formatWealthCurrency(item.netWorth)}</td><td>${formatWealthCurrency(item.financialAssets)}</td><td><strong>${formatWealthCurrency(item.cash)}</strong><small>${item.cashPct.toFixed(1)}%</small></td><td class="${item.ytdReturn >= 0 ? "positive" : "negative"}">${item.ytdReturn >= 0 ? "+" : ""}${item.ytdReturn.toFixed(1)}%</td><td>${item.goalsOnTrack} / ${item.goalsTotal}</td><td>${bookPriorityMarkup(item)}</td></tr>`).join("");
  updateHtml(el("bookBody"), rows || `<tr><td colspan="7" class="book-empty"><strong>No households match this view</strong><span>Try another search or focus filter.</span></td></tr>`);
  el("bookResultCount").textContent = formatCount(state.bookTotal);
  el("bookLoadedCount").textContent = state.bookItems.length < state.bookTotal ? `${formatCount(state.bookItems.length)} shown` : `${formatCount(state.bookTotal)} shown`;
  el("bookLoadMoreWrap").hidden = state.bookNextCursor === null;
  const focusLabels = { all: "Prioritized across your book", decisions: "Relationships with open decisions", plans: "Relationships with plans in motion", priority: "Households with priority risk", cash: "Households with deployable cash", goals: "Households with goal reviews", upcoming: "Households with upcoming obligations", "held-away": "Relationships with held-away assets" };
  el("bookViewStatus").textContent = focusLabels[state.bookFocus] || focusLabels.all;
  document.querySelectorAll("[data-book-focus]").forEach((button) => button.classList.toggle("active", button.dataset.bookFocus === state.bookFocus));
}
'''
source = regex_once(source, r'function renderBookRows\(\) \{.*?\n\}\n\n(?=async function loadBook)', book_rows + "\n", "book decision rows")

source = replace_once(source,
'''  state.workspaceView = next;
  el("bookView").hidden = next !== "book";''',
'''  state.workspaceView = next;
  if (next !== "wealth" && el("decisionStudio") && !el("decisionStudio").hidden) closeDecisionStudio({ restoreFocus: false });
  el("bookView").hidden = next !== "book";''', "workspace closes studio")

source = replace_once(source,
'''  state.currentHouseholdId = householdId;
  resetWealthChart();''',
'''  state.currentHouseholdId = householdId;
  state.decisionSummary = null;
  state.activeDecisionDetail = null;
  state.activeDecisionScenario = null;
  state.activeDecisionPlan = null;
  closeDecisionStudio({ restoreFocus: false });
  resetWealthChart();''', "household resets decision state")
source = replace_once(source,
'''    assignHouseholdOverview(overview);
    renderWealthWorkspace();
    document.title = `${HOUSEHOLD.name} | Advisor Workspace`;''',
'''    assignHouseholdOverview(overview);
    renderWealthWorkspace();
    hydrateDecisionSummary(householdId, request);
    document.title = `${HOUSEHOLD.name} | Advisor Workspace`;''', "household hydrates decisions")

hydrate_summary = r'''async function hydrateDecisionSummary(householdId, request) {
  try {
    const summary = await loadDecisionSummary(householdId);
    if (request !== householdRequest || state.currentHouseholdId !== householdId) return;
    state.decisionSummary = summary;
    renderWealthWorkspace();
  } catch {
    if (request !== householdRequest || state.currentHouseholdId !== householdId) return;
    state.decisionSummary = { householdId, openCount: 0, planCount: 0, decisions: [] };
    renderWealthWorkspace();
  }
}

'''
source = replace_once(source, "function renderWealthWorkspace() {", hydrate_summary + "function renderWealthWorkspace() {", "decision summary helper")

# Add decision map inside household renderer.
source = replace_once(source,
'''  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));
  const topHolding = HOUSEHOLD_HOLDINGS[0];''',
'''  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));
  const topHolding = HOUSEHOLD_HOLDINGS[0];
  const decisionByInsight = new Map((state.decisionSummary?.decisions || []).map((decision) => [decision.sourceInsightId, decision]));
  const openDecisionCount = state.decisionSummary?.openCount;''', "household decision map")

# Replace the dynamic household header statement only inside renderWealthWorkspace.
marker = source.index("function renderWealthWorkspace() {")
head = source[:marker]
tail = source[marker:]
header_pattern = r'updateHtml\(el\("wealthHeading"\), `[^`]*`\);'
header_replacement = r'''updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar" aria-hidden="true">${escapeHtml(HOUSEHOLD.initials)}</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>${escapeHtml(HOUSEHOLD.name)}</h1><p>${escapeHtml(HOUSEHOLD.relationshipType)} · ${escapeHtml(HOUSEHOLD.location)} · ${HOUSEHOLD.accountCount} financial accounts</p></div><button class="household-switcher" type="button" data-wealth-action="relationship" aria-label="Open household profile">›</button></div></div><div class="wealth-heading-meta"><div class="wealth-heading-status"><span>Illustrative household</span><strong>Updated ${escapeHtml(HOUSEHOLD.asOf)}</strong></div><div class="household-heading-actions"><button class="panel-action" type="button" data-wealth-action="meeting">Prepare meeting</button><button class="panel-action decision-count-button" type="button" data-wealth-action="decisions">Open decisions <b>${openDecisionCount ?? "—"}</b></button><button class="panel-action" type="button" data-wealth-action="timeline">Timeline</button></div></div>`);'''
tail, count = re.subn(header_pattern, header_replacement, tail, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"household decision header: expected 1 match, found {count}")
source = head + tail

old_insights = '''  updateHtml(el("wealthInsights"), HOUSEHOLD_INSIGHTS.map((insight) => `<button type="button" class="attention-item tone-${escapeHtml(insight.tone)}" data-wealth-insight="${escapeHtml(insight.id)}"><i aria-hidden="true"></i><span class="attention-copy"><small>${escapeHtml(insight.severity)}</small><strong>${escapeHtml(insight.title)}</strong><em data-insight-detail="${escapeHtml(insight.id)}">${escapeHtml(insight.detail)}</em></span><span class="attention-action">${escapeHtml(insight.action)} <b>›</b></span></button>`).join(""));'''
new_insights = '''  updateHtml(el("wealthInsights"), HOUSEHOLD_INSIGHTS.map((insight) => {
    const decision = decisionByInsight.get(insight.id);
    return `<button type="button" class="attention-item tone-${escapeHtml(insight.tone)}" data-wealth-insight="${escapeHtml(insight.id)}"><i aria-hidden="true"></i><span class="attention-copy"><small>${escapeHtml(insight.severity)}${decision ? ` · ${escapeHtml(getDecisionPlan(decision.id)?.status || decision.status)}` : ""}</small><strong>${escapeHtml(insight.title)}</strong><em data-insight-detail="${escapeHtml(insight.id)}">${escapeHtml(insight.detail)}</em></span><span class="attention-action">${decision ? "Decide" : escapeHtml(insight.action)} <b>›</b></span></button>`;
  }).join(""));'''
source = replace_once(source, old_insights, new_insights, "decision-aware insights")

# Decision-list / meeting / timeline drawer renderers.
drawer_helpers = r'''function formatDecisionDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : chartDate.format(date);
}

function decisionListDrawer(summary) {
  const decisions = summary?.decisions || [];
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD WORKFLOW · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close decisions">×</button></header><div class="wealth-drawer-body decision-list-drawer"><div class="drawer-section-heading"><span class="panel-kicker">OPEN DECISIONS</span><h2 id="wealthDrawerTitle">${summary?.openCount || 0} active across this relationship</h2><p>Each item is grounded in a household signal and can be modeled before anything moves toward implementation.</p></div><div class="decision-list">${decisions.map((decision) => { const plan = getDecisionPlan(decision.id); return `<button type="button" class="decision-list-item tone-${escapeHtml(decision.tone)}" data-decision-open="${escapeHtml(decision.id)}"><i></i><span><small>${escapeHtml(decision.priority)} · ${escapeHtml(plan?.status || decision.status)}</small><strong>${escapeHtml(decision.title)}</strong><em>${escapeHtml(decision.evidenceSummary)}</em></span><b>›</b></button>`; }).join("") || `<div class="drawer-empty">No open decisions for this household.</div>`}</div></div>`;
}

function meetingBriefDrawer(data) {
  const decisionRows = (data.openDecisions || []).map((decision) => `<button type="button" class="meeting-decision" data-decision-open="${escapeHtml(decision.id)}"><span><strong>${escapeHtml(decision.title)}</strong><small>${escapeHtml(decision.evidenceSummary)}</small></span><em>${escapeHtml(getDecisionPlan(decision.id)?.status || decision.status)}</em></button>`).join("");
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">MEETING PREP · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close meeting brief">×</button></header><div class="wealth-drawer-body meeting-brief"><div class="drawer-section-heading"><span class="panel-kicker">RELATIONSHIP BRIEF</span><h2 id="wealthDrawerTitle">Prepare the conversation</h2><p>${escapeHtml(data.household.members.join(" · "))} · Last planning review ${escapeHtml(data.household.lastPlanningReview)}</p></div><section><h3>Current household</h3><div class="meeting-metric-grid">${data.changes.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${typeof item.value === "number" ? formatSignedWealthCurrency(item.value) : escapeHtml(item.value)}</strong></div>`).join("")}</div></section><section><h3>Open decisions</h3><div class="meeting-decision-list">${decisionRows || `<p class="drawer-empty">No active decisions.</p>`}</div></section><section><h3>Upcoming</h3><div class="meeting-copy-list">${(data.upcoming || []).map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`).join("") || `<p class="drawer-empty">No material upcoming obligations.</p>`}</div></section><section><h3>Recent relationship activity</h3><div class="meeting-copy-list">${(data.recentActivity || []).slice(0, 5).map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${formatDecisionDate(item.occurredAt)} · ${escapeHtml(item.detail)}</span></div>`).join("")}</div></section></div>`;
}

function timelineDrawer(events) {
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">RELATIONSHIP HISTORY · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close timeline">×</button></header><div class="wealth-drawer-body relationship-timeline"><div class="drawer-section-heading"><span class="panel-kicker">HOUSEHOLD TIMELINE</span><h2 id="wealthDrawerTitle">What changed and when</h2><p>Planning, portfolio and decision events from the same household model.</p></div><ol>${(events || []).map((event) => `<li><i class="timeline-${escapeHtml(event.type)}"></i><div><span>${formatDecisionDate(event.occurredAt)} · ${escapeHtml(event.source)}</span>${event.decisionId ? `<button type="button" data-decision-open="${escapeHtml(event.decisionId)}"><strong>${escapeHtml(event.title)}</strong></button>` : `<strong>${escapeHtml(event.title)}</strong>`}<p>${escapeHtml(event.detail)}</p></div></li>`).join("")}</ol></div>`;
}

'''
source = replace_once(source, "function wealthDrawerError(error) {", drawer_helpers + "function wealthDrawerError(error) {", "decision drawer helpers")
source = replace_once(source,
'''  if (id === "concentration") detailRequest = loadConcentrationReview(state.currentHouseholdId).then((review) => review ? concentrationDrawer(review) : operationalDrawer("relationship"));
  else if (id === "accounts") html = accountsDrawer();''',
'''  if (id === "concentration") detailRequest = loadConcentrationReview(state.currentHouseholdId).then((review) => review ? concentrationDrawer(review) : operationalDrawer("relationship"));
  else if (id === "decisions") detailRequest = loadDecisionSummary(state.currentHouseholdId).then(decisionListDrawer);
  else if (id === "meeting") detailRequest = loadMeetingBrief(state.currentHouseholdId).then(meetingBriefDrawer);
  else if (id === "timeline") detailRequest = loadHouseholdTimeline(state.currentHouseholdId).then(timelineDrawer);
  else if (id === "accounts") html = accountsDrawer();''', "decision drawer routing")

# Full Decision Studio + implementation handoff.
decision_functions = r'''function decisionValue(value, label = "") {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return escapeHtml(value);
  if (/account|count/i.test(label)) return formatCount(value);
  return formatWealthCurrency(value);
}

function decisionPercent(value) {
  return value === null || value === undefined ? "—" : `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
}

function decisionOutcome(label, before, after, formatter = decisionValue) {
  return `<div class="decision-outcome"><span>${escapeHtml(label)}</span><div><small>Current</small><strong>${formatter(before, label)}</strong></div><b>→</b><div><small>Scenario</small><strong>${formatter(after, label)}</strong></div></div>`;
}

function decisionMoneyControl(key, label, value, bounds, help = "") {
  const safeBounds = bounds || { min: 0, max: Math.max(0, Number(value) || 0), step: 5000 };
  return `<label class="decision-control"><span><strong>${escapeHtml(label)}</strong><em data-decision-value="${escapeHtml(key)}">${formatWealthCurrency(value)}</em></span><input type="range" data-decision-input="${escapeHtml(key)}" min="${safeBounds.min}" max="${Math.max(safeBounds.min, safeBounds.max)}" step="${safeBounds.step || 5000}" value="${Number(value) || 0}" />${help ? `<small>${escapeHtml(help)}</small>` : ""}</label>`;
}

function decisionScenarioControls(detail, scenario) {
  const inputs = scenario.inputs || {};
  const bounds = detail.model.bounds || {};
  if (detail.decision.kind === "concentration") {
    return `<div class="decision-control-stack"><label class="decision-control decision-control-primary"><span><strong>Target concentration</strong><em data-decision-value="targetWeight">${decisionPercent(inputs.targetWeight)}</em></span><input type="range" data-decision-input="targetWeight" min="${bounds.targetWeight.min}" max="${bounds.targetWeight.max}" step="${bounds.targetWeight.step}" value="${inputs.targetWeight}" /><small>Move the position to a different household weight. Nothing is executed.</small></label>${detail.relatedGoal ? decisionMoneyControl("goalFunding", `Earmark for ${detail.relatedGoal.name}`, inputs.goalFunding, bounds.goalFunding, "Optional. This changes the modeled goal funding path.") : ""}${decisionMoneyControl("redeployAmount", "Redeploy into diversified US equity", inputs.redeployAmount, { ...bounds.redeployAmount, max: scenario.economics.release }, "This amount becomes the explicit implementation objective passed into Investments.")}<div class="decision-assumption-inputs"><label><span>Tax reserve assumption</span><div><input type="number" data-decision-input="taxRate" min="0" max="50" step="0.1" value="${inputs.taxRate}" /><em>%</em></div></label><label><span>Single-stock stress</span><div><input type="number" data-decision-input="stressDrop" min="10" max="60" step="5" value="${inputs.stressDrop}" /><em>%</em></div></label></div></div>`;
  }
  if (detail.decision.kind === "liquidity") return `<div class="decision-control-stack">${decisionMoneyControl("deployAmount", "Amount to deploy", inputs.deployAmount, bounds.deployAmount, "Leaves the modeled reserve in cash.")}<label class="decision-control compact"><span><strong>Working cash reserve</strong><em data-decision-value="reservePct">${decisionPercent(inputs.reservePct)}</em></span><input type="range" data-decision-input="reservePct" min="${bounds.reservePct.min}" max="${bounds.reservePct.max}" step="${bounds.reservePct.step}" value="${inputs.reservePct}" /></label></div>`;
  if (detail.decision.kind === "goal-funding") return `<div class="decision-control-stack">${decisionMoneyControl("fundingAmount", `Fund ${detail.relatedGoal?.name || "goal"}`, inputs.fundingAmount, bounds.fundingAmount, "Uses current household cash and updates only this goal's explicit funded amount.")}</div>`;
  if (detail.decision.kind === "allocation") return `<div class="decision-control-stack">${decisionMoneyControl("allocationAmount", "Amount to municipal allocation", inputs.allocationAmount, bounds.allocationAmount, "Uses household cash to move toward the documented target.")}</div>`;
  return `<div class="decision-control-stack">${decisionMoneyControl("fundingAmount", "Funding amount", inputs.fundingAmount, bounds.fundingAmount, "Uses currently available household cash.")}</div>`;
}

function decisionScenarioOutcomes(detail, scenario) {
  if (detail.decision.kind === "concentration") {
    const goalOutcome = scenario.before.goalProgress === null ? "" : decisionOutcome(detail.relatedGoal?.name || "Goal funding", scenario.before.goalProgress, scenario.after.goalProgress, (value) => decisionPercent(value));
    return `<div class="decision-outcome-grid">${decisionOutcome("Concentration", scenario.before.concentrationPct, scenario.after.concentrationPct, (value) => decisionPercent(value))}${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("US equity", scenario.before.usEquityPct, scenario.after.usEquityPct, (value) => decisionPercent(value))}${decisionOutcome("Single-stock stress loss", scenario.before.stressLoss, scenario.after.stressLoss)}${goalOutcome}</div><div class="decision-economics"><div><span>Position value released</span><strong>${formatWealthCurrency(scenario.economics.release)}</strong></div><div><span>Estimated realized gain</span><strong>${formatWealthCurrency(scenario.economics.realizedGain)}</strong></div><div><span>Estimated tax reserve</span><strong>${formatWealthCurrency(scenario.economics.taxReserve)}</strong></div><div><span>Implementation amount</span><strong>${formatWealthCurrency(scenario.economics.redeployAmount)}</strong></div></div>`;
  }
  if (detail.decision.kind === "liquidity") return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("Cash weight", scenario.before.cashPct, scenario.after.cashPct, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Amount to deploy</span><strong>${formatWealthCurrency(scenario.economics.deployAmount)}</strong></div><div><span>Modeled reserve</span><strong>${formatWealthCurrency(scenario.economics.reserveAmount)}</strong></div></div>`;
  if (detail.decision.kind === "goal-funding") return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome(detail.relatedGoal?.name || "Goal progress", scenario.before.goalProgress, scenario.after.goalProgress, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Funding amount</span><strong>${formatWealthCurrency(scenario.economics.fundingAmount)}</strong></div><div><span>Remaining gap</span><strong>${formatWealthCurrency(scenario.economics.remainingGap)}</strong></div></div>`;
  if (detail.decision.kind === "allocation") return `<div class="decision-outcome-grid">${decisionOutcome("Municipal allocation", scenario.before.allocationPct, scenario.after.allocationPct, (value) => decisionPercent(value))}${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}</div><div class="decision-economics"><div><span>Implementation amount</span><strong>${formatWealthCurrency(scenario.economics.allocationAmount)}</strong></div><div><span>Target allocation</span><strong>${decisionPercent(scenario.economics.targetPct)}</strong></div></div>`;
  return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("Obligation covered", scenario.before.obligationCoveredPct, scenario.after.obligationCoveredPct, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Funding amount</span><strong>${formatWealthCurrency(scenario.economics.fundingAmount)}</strong></div><div><span>Remaining obligation</span><strong>${formatWealthCurrency(scenario.economics.remainingObligation)}</strong></div></div>`;
}

function decisionPlanMarkup(detail, plan) {
  if (!plan) return `<div class="decision-plan-empty"><span class="panel-kicker">ACTION PLAN</span><h3>Turn the scenario into work</h3><p>Capture the intended path, then track it across client discussion and implementation.</p><button type="button" class="primary-button" data-decision-build-plan>Build plan</button></div>`;
  const statuses = ["Plan drafted", "Client discussion", "In progress", "Complete"];
  const candidateMarkup = plan.candidates.length ? `<div class="decision-candidates"><span>Implementation candidates</span>${plan.candidates.map((candidate) => `<div><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.category)}${candidate.symbol ? ` · ${escapeHtml(candidate.symbol)}` : ""}</small></div>`).join("")}</div>` : "";
  return `<div class="decision-plan-active"><div class="decision-plan-heading"><div><span class="panel-kicker">ACTION PLAN</span><h3>${escapeHtml(plan.title)}</h3></div><label>Status<select data-decision-plan-status>${statuses.map((status) => `<option value="${status}"${status === plan.status ? " selected" : ""}>${status}</option>`).join("")}</select></label></div><div class="decision-plan-steps">${plan.steps.map((step) => `<button type="button" class="${step.complete ? "complete" : ""}" data-decision-plan-step="${escapeHtml(step.id)}"><i>${step.complete ? "✓" : ""}</i><span>${escapeHtml(step.title)}</span></button>`).join("")}</div>${candidateMarkup}</div>`;
}

function renderDecisionStudio() {
  const detail = state.activeDecisionDetail;
  const scenario = state.activeDecisionScenario;
  if (!detail || !scenario) return;
  const plan = state.activeDecisionPlan || getDecisionPlan(detail.decision.id);
  state.activeDecisionPlan = plan;
  const status = plan?.status || detail.decision.status;
  const implementation = scenario.implementation;
  const implementationCard = implementation?.enabled ? `<section class="decision-implementation"><span class="panel-kicker">IMPLEMENTATION</span><h3>${escapeHtml(implementation.objective)}</h3><strong>${formatWealthCurrency(implementation.amount)}</strong><div>${implementation.tags.slice(1, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div><button type="button" class="primary-button" data-decision-implement>Explore investments</button><p>The criteria passed into Investments stay visible and editable. No hidden suitability score is applied.</p></section>` : `<section class="decision-implementation muted"><span class="panel-kicker">IMPLEMENTATION</span><h3>No investment search required yet</h3><p>This scenario is currently about household funding or workflow rather than selecting a product.</p></section>`;
  updateHtml(el("decisionStudioContent"), `<header class="decision-studio-header"><button type="button" class="decision-back" data-close-decision-studio>← ${escapeHtml(HOUSEHOLD.name)}</button><div><span class="eyebrow">DECISION STUDIO · ${escapeHtml(detail.decision.priority.toUpperCase())}</span><h2 id="decisionStudioTitle">${escapeHtml(detail.decision.title)}</h2><p>${escapeHtml(detail.decision.objective)}</p></div><span class="decision-status">${escapeHtml(status)}</span><button type="button" class="decision-close" data-close-decision-studio aria-label="Close decision studio">×</button></header><div class="decision-studio-body"><aside class="decision-facts"><div class="decision-signal tone-${escapeHtml(detail.decision.tone)}"><span>${escapeHtml(detail.evidence.severity)}</span><strong>${escapeHtml(detail.evidence.title)}</strong><p>${escapeHtml(detail.evidence.detail)}</p><small>${escapeHtml(detail.evidence.source)}</small></div><section><span class="panel-kicker">WHAT WE KNOW</span><div class="decision-fact-list">${detail.facts.map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${decisionValue(fact.value, fact.label)}</strong></div>`).join("")}</div></section><section class="decision-assumptions"><span class="panel-kicker">MODEL ASSUMPTIONS</span>${scenario.assumptions.map((assumption) => `<p>${escapeHtml(assumption)}</p>`).join("")}</section></aside><main class="decision-model"><div class="decision-model-heading"><span class="panel-kicker">WHAT COULD CHANGE</span><h3>Model the household consequence</h3><p>Adjust only explicit assumptions. The resulting changes are calculated from this household's current data.</p></div>${decisionScenarioControls(detail, scenario)}<div class="decision-consequence-heading"><span class="panel-kicker">HOUSEHOLD CONSEQUENCE</span><h3>Before and after</h3></div>${decisionScenarioOutcomes(detail, scenario)}</main><aside class="decision-plan-column">${implementationCard}${decisionPlanMarkup(detail, plan)}</aside></div>`);
}

function closeDecisionStudio({ restoreFocus = true } = {}) {
  decisionRequest += 1;
  state.decisionScenarioController?.abort();
  state.decisionScenarioController = null;
  window.clearTimeout(decisionModelTimer);
  if (el("decisionStudio")) {
    el("decisionStudio").hidden = true;
    el("decisionStudio").setAttribute("aria-hidden", "true");
  }
  if (el("decisionStudioBackdrop")) el("decisionStudioBackdrop").hidden = true;
  document.body.classList.remove("decision-studio-open");
  if (restoreFocus && state.lastFocus?.focus) state.lastFocus.focus();
}

async function openDecisionStudio(decisionId) {
  if (!state.currentHouseholdId) return;
  const request = ++decisionRequest;
  state.lastFocus = document.activeElement;
  closeWealthDrawer({ restoreFocus: false });
  state.activeDecisionDetail = null;
  state.activeDecisionScenario = null;
  state.activeDecisionPlan = getDecisionPlan(decisionId);
  el("decisionStudioContent").innerHTML = `<div class="decision-studio-loading"><span></span><p>Preparing household decision…</p></div>`;
  el("decisionStudioBackdrop").hidden = false;
  el("decisionStudio").hidden = false;
  el("decisionStudio").setAttribute("aria-hidden", "false");
  document.body.classList.add("decision-studio-open");
  try {
    const detail = await loadDecisionDetail(decisionId, state.currentHouseholdId);
    if (request !== decisionRequest) return;
    const scenario = await modelDecisionScenario(decisionId, state.currentHouseholdId, detail.model.defaults);
    if (request !== decisionRequest) return;
    state.activeDecisionDetail = detail;
    state.activeDecisionScenario = scenario;
    state.activeDecisionPlan = getDecisionPlan(decisionId);
    renderDecisionStudio();
  } catch (error) {
    if (request !== decisionRequest) return;
    el("decisionStudioContent").innerHTML = `<div class="decision-studio-error"><button type="button" data-close-decision-studio>← Household</button><h2>Decision workspace unavailable</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function collectDecisionInputs() {
  return Object.fromEntries([...el("decisionStudio").querySelectorAll("[data-decision-input]")].map((input) => [input.dataset.decisionInput, Number(input.value)]).filter(([, value]) => Number.isFinite(value)));
}

function updateDecisionInputLabels() {
  for (const input of el("decisionStudio").querySelectorAll("[data-decision-input]")) {
    const target = el("decisionStudio").querySelector(`[data-decision-value="${input.dataset.decisionInput}"]`);
    if (!target) continue;
    const key = input.dataset.decisionInput;
    target.textContent = /Amount|Funding/i.test(key) ? formatWealthCurrency(Number(input.value)) : decisionPercent(Number(input.value));
  }
}

function scheduleDecisionModel() {
  updateDecisionInputLabels();
  window.clearTimeout(decisionModelTimer);
  decisionModelTimer = window.setTimeout(refreshDecisionScenario, 120);
}

async function refreshDecisionScenario() {
  const detail = state.activeDecisionDetail;
  if (!detail || !state.currentHouseholdId) return;
  state.decisionScenarioController?.abort();
  const controller = new AbortController();
  state.decisionScenarioController = controller;
  try {
    const scenario = await modelDecisionScenario(detail.decision.id, state.currentHouseholdId, collectDecisionInputs(), { signal: controller.signal });
    if (controller !== state.decisionScenarioController) return;
    state.activeDecisionScenario = scenario;
    renderDecisionStudio();
  } catch (error) {
    if (error.name !== "AbortError") showToast("Unable to update decision scenario");
  }
}

function buildActiveDecisionPlan() {
  const detail = state.activeDecisionDetail;
  if (!detail) return null;
  const plan = saveDecisionPlan({ decision: detail.decision, householdId: state.currentHouseholdId, steps: detail.planTemplate, implementationAmount: state.activeDecisionScenario?.implementation?.amount || 0 });
  state.activeDecisionPlan = plan;
  renderDecisionStudio();
  renderBookRows();
  showToast("Action plan drafted");
  return plan;
}

function launchInvestmentContext(scenario) {
  closeWealthDrawer({ restoreFocus: false });
  state.q = scenario.q || "";
  state.category = scenario.category || "All";
  state.appliedCategory = state.category;
  state.flags = new Set(scenario.flags || []);
  state.risks = new Set((scenario.risks || []).filter((risk) => RISKS.includes(risk)));
  state.statuses.clear();
  state.ranges = {};
  state.sort = defaultSort(Boolean(state.q));
  state.sortExplicit = false;
  el("searchInput").value = state.q;
  showScenarioRibbon(scenario);
  state.investmentSearchStarted = true;
  setWorkspaceView("investments");
  runSearch();
}

function launchDecisionImplementation() {
  const detail = state.activeDecisionDetail;
  const scenario = state.activeDecisionScenario;
  if (!detail || !scenario?.implementation?.enabled) return;
  if (!getDecisionPlan(detail.decision.id)) buildActiveDecisionPlan();
  const implementation = scenario.implementation;
  state.compare.clear();
  renderCompareTray();
  closeDecisionStudio({ restoreFocus: false });
  launchInvestmentContext({
    source: "FROM DECISION STUDIO",
    title: `Implement ${implementation.objective.toLowerCase()}`,
    tags: [formatWealthCurrency(implementation.amount), ...implementation.tags.slice(1)],
    category: implementation.category,
    q: implementation.query,
    flags: implementation.flags,
    risks: implementation.risks,
    decisionId: detail.decision.id,
    implementationAmount: implementation.amount,
  });
}

async function returnFromInvestmentContext() {
  const context = state.householdScenario;
  if (!context?.householdId) return;
  if (context.decisionId) {
    const candidates = [...state.compare.values()];
    if (candidates.length) addDecisionCandidates(context.decisionId, candidates);
    await openHousehold(context.householdId);
    openDecisionStudio(context.decisionId);
    return;
  }
  openHousehold(context.householdId);
}

function openPrimaryConcentrationDecision() {
  const decision = state.decisionSummary?.decisions?.find((item) => item.kind === "concentration");
  if (decision) openDecisionStudio(decision.id);
  else openWealthDrawer("concentration");
}

'''
source = replace_once(source, "function showScenarioRibbon({ source, title, tags }) {", decision_functions + "function showScenarioRibbon({ source, title, tags, decisionId = null, implementationAmount = 0 }) {", "decision studio functions")

show_scenario = r'''function showScenarioRibbon({ source, title, tags, decisionId = null, implementationAmount = 0 }) {
  state.householdScenario = { source, title, tags, householdId: state.currentHouseholdId, householdName: HOUSEHOLD.name, decisionId, implementationAmount };
  el("scenarioBack").textContent = decisionId ? "← Decision" : `← ${HOUSEHOLD.name}`;
  el("scenarioSource").textContent = source;
  el("scenarioTitle").textContent = title;
  el("scenarioTags").innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  el("scenarioRibbon").hidden = false;
}
'''
source = regex_once(source, r'function showScenarioRibbon\(\{ source, title, tags, decisionId = null, implementationAmount = 0 \}\) \{.*?\n\}\n\n(?=function applyHouseholdScenario)', show_scenario + "\n", "decision scenario ribbon")

apply_scenario = r'''function applyHouseholdScenario(id) {
  if (!HOUSEHOLD) return;
  const supportedRisk = /conservative/i.test(HOUSEHOLD.riskProfile) ? "Conservative" : /growth/i.test(HOUSEHOLD.riskProfile) ? "Moderate" : "Moderate";
  const scenarios = {
    concentration: { source: "FROM CONCENTRATION REVIEW", title: "Explore diversification options", tags: [HOUSEHOLD.name, "Tax-aware implementation", "Reduce concentrated exposure"], category: "SMAs", q: "", flags: ["Tax-Aware", "Direct Indexing"], risks: [supportedRisk] },
    cash: { source: "FROM LIQUIDITY REVIEW", title: "Explore cash alternatives", tags: [`${formatWealthCurrency(HOUSEHOLD.investableCash)} available`, HOUSEHOLD.riskProfile, "Daily liquidity"], category: "Fixed Income", q: "short duration cash management", flags: [], risks: ["Conservative"] },
    muni: { source: "FROM ALLOCATION REVIEW", title: "Restore municipal allocation", tags: [HOUSEHOLD.location, "Tax aware", "Fee under 0.50%"], category: "Fixed Income", q: HOUSEHOLD.location === "New York" ? "New York municipal income under 50 bps" : "municipal income under 50 bps", flags: ["Tax-Aware"], risks: ["Conservative"] },
  };
  const scenario = scenarios[id];
  if (!scenario) return;
  launchInvestmentContext(scenario);
}
'''
source = regex_once(source, r'function applyHouseholdScenario\(id\) \{.*?\n\}\n\n(?=function handleWealthInsight)', apply_scenario + "\n", "scenario launcher refactor")

handle_insight = r'''function handleWealthInsight(id) {
  const decision = state.decisionSummary?.decisions?.find((item) => item.sourceInsightId === id);
  if (decision) { openDecisionStudio(decision.id); return; }
  if (id === "concentration" || id.endsWith("-concentration")) { openWealthDrawer("concentration"); return; }
  if (id === "cash" || id.endsWith("-cash")) { applyHouseholdScenario("cash"); return; }
  if (id === "muni" || id.endsWith("-muni")) { applyHouseholdScenario("muni"); return; }
  if (id.endsWith("-goal-review")) {
    const goal = HOUSEHOLD_GOALS.find((candidate) => candidate.tone === "watch");
    if (goal) { openWealthDrawer(`goal:${goal.id}`); return; }
  }
  openWealthDrawer(id);
}
'''
source = regex_once(source, r'function handleWealthInsight\(id\) \{.*?\n\}\n\n(?=function )', handle_insight + "\n", "decision-aware insight handler")

# Event delegation: decision navigation, studio controls and back from investments.
source = replace_once(source,
'''  const scenarioBack = event.target.closest("#scenarioBack");
  if (scenarioBack && state.householdScenario?.householdId) openHousehold(state.householdScenario.householdId);''',
'''  const scenarioBack = event.target.closest("#scenarioBack");
  if (scenarioBack && state.householdScenario?.householdId) returnFromInvestmentContext();''', "decision scenario back")
source = replace_once(source,
'''  const wealthGoal = event.target.closest("[data-wealth-goal]");
  if (wealthGoal) openWealthDrawer(`goal:${wealthGoal.dataset.wealthGoal}`);
  const wealthAction = event.target.closest("[data-wealth-action]");''',
'''  const wealthGoal = event.target.closest("[data-wealth-goal]");
  if (wealthGoal) openWealthDrawer(`goal:${wealthGoal.dataset.wealthGoal}`);
  const decisionOpen = event.target.closest("[data-decision-open]");
  if (decisionOpen) { closeWealthDrawer({ restoreFocus: false }); openDecisionStudio(decisionOpen.dataset.decisionOpen); }
  const wealthAction = event.target.closest("[data-wealth-action]");''', "decision open delegation")
source = replace_once(source,
'''  if (wealthAction?.dataset.wealthAction === "accounts") openWealthDrawer("accounts");
  if (wealthAction?.dataset.wealthAction === "concentration") openWealthDrawer("concentration");
  if (wealthAction?.dataset.wealthAction === "relationship") openWealthDrawer("relationship");''',
'''  if (wealthAction?.dataset.wealthAction === "accounts") openWealthDrawer("accounts");
  if (wealthAction?.dataset.wealthAction === "concentration") openPrimaryConcentrationDecision();
  if (wealthAction?.dataset.wealthAction === "relationship") openWealthDrawer("relationship");
  if (wealthAction?.dataset.wealthAction === "decisions") openWealthDrawer("decisions");
  if (wealthAction?.dataset.wealthAction === "meeting") openWealthDrawer("meeting");
  if (wealthAction?.dataset.wealthAction === "timeline") openWealthDrawer("timeline");''', "decision wealth actions")
source = replace_once(source,
'''  if (event.target.closest("[data-close-wealth-drawer]") || event.target === el("wealthDrawerBackdrop")) closeWealthDrawer();''',
'''  if (event.target.closest("[data-close-wealth-drawer]") || event.target === el("wealthDrawerBackdrop")) closeWealthDrawer();
  if (event.target.closest("[data-close-decision-studio]") || event.target === el("decisionStudioBackdrop")) closeDecisionStudio();
  if (event.target.closest("[data-decision-build-plan]")) buildActiveDecisionPlan();
  if (event.target.closest("[data-decision-implement]")) launchDecisionImplementation();
  const planStep = event.target.closest("[data-decision-plan-step]");
  if (planStep && state.activeDecisionDetail) { state.activeDecisionPlan = toggleDecisionPlanStep(state.activeDecisionDetail.decision.id, planStep.dataset.decisionPlanStep); renderDecisionStudio(); renderBookRows(); }''', "decision studio click actions")

listener_insert = r'''document.addEventListener("input", (event) => {
  if (event.target.matches("[data-decision-input]")) scheduleDecisionModel();
});

document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-decision-plan-status]") || !state.activeDecisionDetail) return;
  state.activeDecisionPlan = setDecisionPlanStatus(state.activeDecisionDetail.decision.id, event.target.value);
  renderDecisionStudio();
  renderBookRows();
});

'''
source = replace_once(source, "state.columnPreferences = loadColumnPreferences();", listener_insert + "state.columnPreferences = loadColumnPreferences();", "decision input listeners")
write(path, source)

# ---------------------------------------------------------------------------
# CSS: restrained Decision Studio, workflow states, meeting/timeline surfaces.
# ---------------------------------------------------------------------------
path = "styles.css"
source = read(path)
css = r'''

/* Phase Three — decision and action layer */
body.decision-studio-open { overflow: hidden; }
.book-attention-stack { display: grid; gap: 5px; align-items: start; }
.book-plan-pill { width: max-content; display: inline-flex; align-items: center; gap: 5px; padding: 3px 6px; border: 1px solid #d7d7d2; border-radius: 2px; background: #f7f7f4; color: #555; font-size: 7px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.book-plan-pill i { width: 5px; height: 5px; border-radius: 50%; background: #355f75; }
.book-priority-none strong, .book-priority-none small { display: block; }
.book-priority-none small { margin-top: 2px; color: #999; font-size: 7px; }
.wealth-heading-meta { min-width: 330px; }
.wealth-heading-status { display: grid; justify-items: end; gap: 5px; }
.household-heading-actions { display: flex; justify-content: flex-end; gap: 6px; }
.household-heading-actions .panel-action { min-width: 82px; }
.decision-count-button b { display: inline-grid; place-items: center; min-width: 16px; height: 16px; margin-left: 5px; border-radius: 10px; background: #171717; color: #fff; font-size: 8px; }

.decision-studio-backdrop { position: fixed; inset: 58px 0 0; z-index: 71; background: rgba(0,0,0,.22); }
.decision-studio { position: fixed; inset: 58px 0 0; z-index: 72; overflow: hidden; background: #f1f1ee; }
.decision-studio > div { height: 100%; }
.decision-studio-header { min-height: 88px; display: grid; grid-template-columns: 120px minmax(0,1fr) auto 34px; align-items: center; gap: 18px; padding: 14px 28px; border-bottom: 1px solid var(--line); background: #fff; }
.decision-studio-header .decision-back { align-self: start; margin-top: 7px; border: 0; background: transparent; padding: 0; color: #555; font-size: 9px; font-weight: 700; text-align: left; }
.decision-studio-header .eyebrow { margin-bottom: 5px; font-size: 8px; }
.decision-studio-header h2 { margin: 0; font-family: Georgia, serif; font-size: 25px; font-weight: 400; }
.decision-studio-header p { margin: 5px 0 0; max-width: 900px; color: #777; font-size: 9px; }
.decision-status { padding: 5px 8px; border: 1px solid #d5d5d0; border-radius: 2px; background: #fafaf8; color: #555; font-size: 8px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.decision-close { width: 30px; height: 30px; border: 0; background: transparent; color: #666; font-size: 22px; }
.decision-studio-body { height: calc(100% - 88px); display: grid; grid-template-columns: 292px minmax(520px, 1fr) 330px; overflow: hidden; }
.decision-facts, .decision-model, .decision-plan-column { min-width: 0; overflow-y: auto; }
.decision-facts { padding: 18px; border-right: 1px solid var(--line); background: #fafaf8; }
.decision-model { padding: 22px 24px 34px; background: #fff; }
.decision-plan-column { padding: 18px; border-left: 1px solid var(--line); background: #f7f7f4; }
.decision-signal { margin-bottom: 22px; padding: 14px; border: 1px solid var(--line); border-left: 3px solid #777; background: #fff; }
.decision-signal.tone-red { border-left-color: #b51f35; }
.decision-signal.tone-green { border-left-color: var(--green); }
.decision-signal.tone-amber { border-left-color: #a37324; }
.decision-signal span, .decision-signal strong, .decision-signal small { display: block; }
.decision-signal span { color: #777; font-size: 7px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.decision-signal strong { margin-top: 7px; font-family: Georgia, serif; font-size: 17px; font-weight: 400; line-height: 1.2; }
.decision-signal p { margin: 7px 0; color: #666; font-size: 9px; line-height: 1.45; }
.decision-signal small { color: #999; font-size: 7px; }
.decision-fact-list { border-top: 1px solid var(--line); }
.decision-fact-list > div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line-soft); }
.decision-fact-list span { color: #777; font-size: 8px; }
.decision-fact-list strong { max-width: 58%; font-size: 9px; text-align: right; }
.decision-assumptions { margin-top: 22px; }
.decision-assumptions p { position: relative; margin: 0; padding: 6px 0 6px 12px; color: #777; font-size: 8px; line-height: 1.4; }
.decision-assumptions p::before { content: '·'; position: absolute; left: 2px; color: #444; }
.decision-model-heading h3, .decision-consequence-heading h3 { margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: 400; }
.decision-model-heading p { margin: 5px 0 0; color: #777; font-size: 9px; }
.decision-control-stack { display: grid; gap: 14px; margin: 20px 0 24px; padding: 18px; border: 1px solid var(--line); background: #fafaf8; }
.decision-control { display: grid; gap: 8px; }
.decision-control > span { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
.decision-control strong { font-size: 9px; }
.decision-control em { color: #333; font-family: Georgia, serif; font-size: 16px; font-style: normal; }
.decision-control small { color: #888; font-size: 7px; }
.decision-control input[type="range"] { width: 100%; accent-color: #262626; }
.decision-assumption-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 4px; }
.decision-assumption-inputs label { display: grid; gap: 5px; color: #777; font-size: 8px; }
.decision-assumption-inputs label > div { display: grid; grid-template-columns: 1fr 24px; align-items: center; border: 1px solid #d8d8d4; background: #fff; }
.decision-assumption-inputs input { min-width: 0; height: 31px; border: 0; padding: 0 8px; background: transparent; }
.decision-assumption-inputs em { font-style: normal; color: #777; font-size: 8px; }
.decision-consequence-heading { margin: 4px 0 12px; }
.decision-outcome-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.decision-outcome { display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; align-items: center; gap: 6px 10px; padding: 12px; border: 1px solid var(--line); background: #fff; }
.decision-outcome > span { grid-column: 1 / -1; color: #777; font-size: 7px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.decision-outcome div { display: grid; gap: 3px; }
.decision-outcome div:last-child { text-align: right; }
.decision-outcome small { color: #999; font-size: 7px; }
.decision-outcome strong { font-family: Georgia, serif; font-size: 15px; font-weight: 400; }
.decision-outcome b { color: #aaa; font-weight: 400; }
.decision-economics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); margin-top: 10px; border: 1px solid var(--line); background: #171717; color: #fff; }
.decision-economics > div { min-width: 0; display: grid; gap: 5px; padding: 12px; border-left: 1px solid #3b3b3b; }
.decision-economics > div:first-child { border-left: 0; }
.decision-economics span { color: #999; font-size: 7px; text-transform: uppercase; letter-spacing: .05em; }
.decision-economics strong { overflow: hidden; font-family: Georgia, serif; font-size: 14px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.decision-implementation { padding: 15px; border: 1px solid #d6d6d1; background: #fff; }
.decision-implementation h3 { margin: 0 0 7px; font-family: Georgia, serif; font-size: 18px; font-weight: 400; }
.decision-implementation > strong { display: block; margin-bottom: 10px; font-family: Georgia, serif; font-size: 23px; font-weight: 400; }
.decision-implementation > div { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.decision-implementation > div span { padding: 4px 6px; border: 1px solid #deded9; background: #fafaf8; color: #666; font-size: 7px; }
.decision-implementation .primary-button { width: 100%; }
.decision-implementation p { margin: 9px 0 0; color: #888; font-size: 7px; line-height: 1.45; }
.decision-implementation.muted { background: #f3f3f0; }
.decision-plan-empty, .decision-plan-active { margin-top: 12px; padding: 15px; border: 1px solid #d6d6d1; background: #fff; }
.decision-plan-empty h3, .decision-plan-active h3 { margin: 0 0 7px; font-family: Georgia, serif; font-size: 18px; font-weight: 400; }
.decision-plan-empty p { margin: 0 0 13px; color: #777; font-size: 8px; line-height: 1.45; }
.decision-plan-heading { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
.decision-plan-heading label { display: grid; gap: 4px; color: #888; font-size: 7px; text-transform: uppercase; }
.decision-plan-heading select { height: 27px; border: 1px solid #d8d8d4; background: #fff; font-size: 8px; }
.decision-plan-steps { display: grid; margin-top: 12px; border-top: 1px solid var(--line-soft); }
.decision-plan-steps button { display: grid; grid-template-columns: 18px 1fr; align-items: center; gap: 8px; min-height: 38px; border: 0; border-bottom: 1px solid var(--line-soft); background: transparent; padding: 5px 0; color: #444; text-align: left; font-size: 8px; }
.decision-plan-steps button i { width: 16px; height: 16px; display: grid; place-items: center; border: 1px solid #c8c8c3; border-radius: 2px; font-size: 9px; font-style: normal; }
.decision-plan-steps button.complete { color: #888; text-decoration: line-through; }
.decision-plan-steps button.complete i { border-color: #5b8a70; background: #eaf5ef; color: #276142; text-decoration: none; }
.decision-candidates { display: grid; gap: 7px; margin-top: 14px; }
.decision-candidates > span { color: #777; font-size: 7px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.decision-candidates > div { padding: 8px; border: 1px solid var(--line-soft); background: #fafaf8; }
.decision-candidates strong, .decision-candidates small { display: block; }
.decision-candidates strong { font-size: 8px; }
.decision-candidates small { margin-top: 3px; color: #888; font-size: 7px; }
.decision-studio-loading, .decision-studio-error { height: 100%; display: grid; place-content: center; justify-items: center; gap: 10px; background: #fff; color: #777; }
.decision-studio-loading span { width: 22px; height: 22px; border: 2px solid #ddd; border-top-color: #222; border-radius: 50%; animation: spin .7s linear infinite; }
.decision-studio-error h2 { margin: 0; font-family: Georgia, serif; font-weight: 400; }
.decision-studio-error button { border: 0; background: transparent; color: #555; font-size: 9px; font-weight: 700; }

.decision-list-drawer .drawer-section-heading, .meeting-brief .drawer-section-heading, .relationship-timeline .drawer-section-heading { margin-bottom: 18px; }
.drawer-section-heading h2 { margin: 0; font-family: Georgia, serif; font-size: 23px; font-weight: 400; }
.drawer-section-heading p { margin: 6px 0 0; color: #777; font-size: 9px; line-height: 1.45; }
.decision-list { display: grid; border: 1px solid var(--line); }
.decision-list-item { display: grid; grid-template-columns: 8px minmax(0,1fr) auto; gap: 11px; align-items: center; min-height: 70px; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--line-soft); background: #fff; text-align: left; }
.decision-list-item:last-child { border-bottom: 0; }
.decision-list-item > i { width: 7px; height: 7px; border-radius: 50%; background: #777; }
.decision-list-item.tone-red > i { background: #b51f35; }
.decision-list-item.tone-green > i { background: var(--green); }
.decision-list-item.tone-amber > i { background: #a37324; }
.decision-list-item small, .decision-list-item strong, .decision-list-item em { display: block; }
.decision-list-item small { color: #888; font-size: 7px; text-transform: uppercase; letter-spacing: .05em; }
.decision-list-item strong { margin-top: 4px; font-family: Georgia, serif; font-size: 14px; font-weight: 400; }
.decision-list-item em { margin-top: 3px; color: #777; font-size: 8px; font-style: normal; }
.decision-list-item > b { color: #888; }
.drawer-empty { color: #888; font-size: 9px; }
.meeting-brief section { margin-top: 20px; }
.meeting-brief section h3 { margin: 0 0 8px; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
.meeting-metric-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); }
.meeting-metric-grid > div { display: grid; gap: 5px; padding: 11px; border-right: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); }
.meeting-metric-grid span { color: #888; font-size: 7px; }
.meeting-metric-grid strong { font-family: Georgia, serif; font-size: 14px; font-weight: 400; }
.meeting-decision-list, .meeting-copy-list { display: grid; border-top: 1px solid var(--line); }
.meeting-decision { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border: 0; border-bottom: 1px solid var(--line-soft); background: transparent; text-align: left; }
.meeting-decision strong, .meeting-decision small { display: block; }
.meeting-decision strong { font-size: 9px; }
.meeting-decision small { margin-top: 3px; color: #777; font-size: 8px; }
.meeting-decision em { color: #777; font-size: 7px; font-style: normal; text-transform: uppercase; }
.meeting-copy-list > div { padding: 9px 0; border-bottom: 1px solid var(--line-soft); }
.meeting-copy-list strong, .meeting-copy-list span { display: block; }
.meeting-copy-list strong { font-size: 9px; }
.meeting-copy-list span { margin-top: 3px; color: #777; font-size: 8px; }
.relationship-timeline ol { margin: 0; padding: 0; list-style: none; }
.relationship-timeline li { display: grid; grid-template-columns: 12px 1fr; gap: 12px; position: relative; padding: 0 0 20px; }
.relationship-timeline li::before { content: ''; position: absolute; left: 5px; top: 12px; bottom: 0; width: 1px; background: #ddd; }
.relationship-timeline li:last-child::before { display: none; }
.relationship-timeline li > i { width: 11px; height: 11px; z-index: 1; margin-top: 2px; border: 2px solid #fff; border-radius: 50%; background: #777; box-shadow: 0 0 0 1px #ccc; }
.relationship-timeline li > div > span { display: block; color: #888; font-size: 7px; text-transform: uppercase; letter-spacing: .04em; }
.relationship-timeline li strong { display: block; margin-top: 4px; font-size: 9px; }
.relationship-timeline li button { border: 0; background: transparent; padding: 0; text-align: left; }
.relationship-timeline li p { margin: 3px 0 0; color: #777; font-size: 8px; }
'''
if "/* Phase Three — decision and action layer */" in source:
    raise SystemExit("phase3 css already present")
source += css
write(path, source)

# ---------------------------------------------------------------------------
# Architecture docs: make the storage seam and non-recommendation principle explicit.
# ---------------------------------------------------------------------------
path = "ARCHITECTURE.md"
source = read(path)
architecture_note = r'''

## Decision and action layer

Phase Three adds a normalized decision domain above household facts and below implementation. `lib/decision-source.js` enriches the server-only advisor-book dataset with stable `decisions` and `householdEvents`; `lib/decision-service.js` exposes bounded summary, detail, scenario, meeting-brief and timeline projections. `/api/decision` enforces the same advisor-to-household boundary as `/api/wealth` and never sends the full book or server source modules to the browser.

Scenario calculations are explicit transformations of the selected household's current values plus visible user-editable assumptions. They model consequences; they do not create a hidden suitability score or investment recommendation. Investment criteria passed from a decision into the existing screener remain visible and editable.

The prototype persists advisor-created action-plan workflow state in a small versioned browser adapter (`lib/decision-data.js`) because this demo has no durable write database. The UI does not own the decision math or canonical household data. A production implementation should replace that adapter with authenticated, audited server writes while preserving the stable decision/plan IDs and read projections.
'''
if "## Decision and action layer" not in source:
    source += architecture_note
write(path, source)

print("Phase Three patch applied")
