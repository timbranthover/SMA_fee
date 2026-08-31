from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 exact match, found {count}")
    return text.replace(old, new, 1)

def replace_regex(text, pattern, new, label):
    result, count = re.subn(pattern, new, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 regex match, found {count}")
    return result

# ---------- index.html ----------
path = "index.html"
html = read(path)
html = replace_once(html, "<title>Investment Screener</title>", "<title>Advisor Workspace</title>", "page title")
html = replace_once(html, '    <link rel="modulepreload" href="/vendor/nouislider.mjs" />\n', "", "remove eager slider preload")
html = replace_once(html, '<button class="nav-item active" data-workspace-view="wealth">Total Wealth</button>', '<button class="nav-item active" data-workspace-view="book">Total Wealth</button>', "total wealth nav")

book_markup = r'''      <section class="book-view" id="bookView">
        <header class="book-heading">
          <div><span class="eyebrow">TOTAL WEALTH · MY BOOK</span><h1>My Book</h1><p id="bookSubtitle">Loading advisor relationships…</p></div>
          <div class="book-heading-meta"><span>Advisor workspace</span><strong id="bookUpdated">Current client data</strong></div>
        </header>

        <section class="book-summary-strip" aria-label="Advisor book summary">
          <div class="book-summary-primary"><span>Households</span><strong id="bookHouseholdCount">—</strong><small>Active relationships</small></div>
          <div><span>Financial assets</span><strong id="bookFinancialAssets">—</strong><small>Across the full book</small></div>
          <div><span>Client net worth</span><strong id="bookNetWorth">—</strong><small>Connected total wealth</small></div>
          <div><span>Deployable cash</span><strong id="bookCash">—</strong><small>Across relationships</small></div>
          <div><span>Needs attention</span><strong class="book-watch" id="bookAttentionCount">—</strong><small>Priority or review items</small></div>
        </section>

        <div class="book-layout">
          <section class="book-panel book-households-panel" aria-labelledby="bookHouseholdsTitle">
            <div class="book-toolbar">
              <div class="book-search-wrap"><span class="search-symbol" aria-hidden="true"></span><label class="sr-only" for="bookSearch">Search households</label><input id="bookSearch" type="search" autocomplete="off" placeholder="Search household, location, risk profile or opportunity" /></div>
              <label class="book-sort">Sort<select id="bookSort" aria-label="Sort households"><option value="attention">Needs attention</option><option value="net-worth-desc">Net worth</option><option value="cash-desc">Deployable cash</option><option value="return-desc">YTD return</option><option value="name-asc">Household name</option></select></label>
            </div>
            <div class="book-filter-row" role="group" aria-label="Filter advisor book">
              <button type="button" class="active" data-book-focus="all">All households</button>
              <button type="button" data-book-focus="priority">Priority risk <span id="bookFilterPriority">—</span></button>
              <button type="button" data-book-focus="cash">Cash opportunities <span id="bookFilterCash">—</span></button>
              <button type="button" data-book-focus="goals">Goal reviews <span id="bookFilterGoals">—</span></button>
              <button type="button" data-book-focus="upcoming">Upcoming <span id="bookFilterUpcoming">—</span></button>
            </div>
            <div class="book-table-heading"><div><h2 id="bookHouseholdsTitle">Households</h2><p><strong id="bookResultCount">—</strong> relationships in this view</p></div><span id="bookViewStatus">Prioritized across your book</span></div>
            <div class="book-table-wrap">
              <table class="book-table"><thead><tr><th>Household</th><th>Net worth</th><th>Financial assets</th><th>Cash</th><th>YTD</th><th>Goals</th><th>Needs attention</th></tr></thead><tbody id="bookBody"></tbody></table>
              <div class="book-loading" id="bookLoading" hidden><span></span><p>Updating your book…</p></div>
            </div>
            <div class="book-load-more" id="bookLoadMoreWrap" hidden><button type="button" id="bookLoadMore">Load more households</button><span id="bookLoadedCount"></span></div>
          </section>

          <aside class="book-intelligence-panel" aria-labelledby="bookIntelligenceTitle">
            <div class="book-intelligence-heading"><span class="panel-kicker">TODAY ACROSS YOUR BOOK</span><h2 id="bookIntelligenceTitle">Where to focus</h2><p>Material portfolio, liquidity and planning signals across client relationships.</p></div>
            <div class="book-intelligence-list">
              <button type="button" data-book-focus="priority"><i class="book-signal red"></i><span><small>Priority risk</small><strong id="bookIntelPriority">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="cash"><i class="book-signal green"></i><span><small>Deployable cash</small><strong id="bookIntelCash">— households</strong></span><b>›</b></button>
              <button type="button" data-book-focus="goals"><i class="book-signal amber"></i><span><small>Planning</small><strong id="bookIntelGoals">— goal reviews</strong></span><b>›</b></button>
              <button type="button" data-book-focus="upcoming"><i class="book-signal blue"></i><span><small>Upcoming</small><strong id="bookIntelUpcoming">— obligations</strong></span><b>›</b></button>
              <button type="button" data-book-focus="held-away"><i class="book-signal slate"></i><span><small>Full balance sheet</small><strong id="bookIntelHeldAway">— with held-away assets</strong></span><b>›</b></button>
            </div>
            <div class="book-intelligence-note"><span>BOOK VIEW</span><p>Select any relationship to enter the same Total Wealth experience, with only that household's data loaded.</p></div>
          </aside>
        </div>
      </section>

'''
html = replace_once(html, '      <section class="wealth-view" id="wealthView">', book_markup + '      <section class="wealth-view" id="wealthView" hidden>', "insert book view")

html = replace_regex(html, r'''        <header class="wealth-heading">.*?        </section>\n\n        <div class="wealth-layout">''', r'''        <header class="wealth-heading" id="wealthHeading">
          <div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar" aria-hidden="true">—</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>Household</h1><p>Loading relationship…</p></div><button class="household-switcher" type="button" data-wealth-action="relationship" aria-label="Open household profile">›</button></div></div>
          <div class="wealth-heading-meta"><span>Illustrative household</span><strong>Loading current data…</strong></div>
        </header>

        <section class="wealth-summary-strip" id="wealthSummaryStrip" aria-label="Household summary"></section>

        <div class="wealth-layout">''', "replace static household header")
html = replace_once(html, '<div><span class="panel-kicker">INVESTABLE WEALTH</span><h2 id="wealthPerformanceTitle">$11.98M</h2><p><strong>+8.7%</strong> time-weighted return · <span>+$260K net flows</span></p></div>', '<div><span class="panel-kicker">INVESTABLE WEALTH</span><h2 id="wealthPerformanceTitle">—</h2><p id="wealthPerformanceMeta">Loading portfolio data…</p></div>', "performance header")
html = replace_once(html, '<div class="allocation-heading"><strong>Current allocation</strong><span>$11.98M financial assets</span></div>', '<div class="allocation-heading"><strong>Current allocation</strong><span id="wealthAllocationTotal">— financial assets</span></div>', "allocation total")
html = replace_once(html, '<button class="panel-action" type="button" data-wealth-action="concentration">Review risk</button>', '<button class="panel-action" id="reviewRiskButton" type="button" data-wealth-action="concentration">Review risk</button>', "risk button id")
html = replace_once(html, '<div class="attention-heading"><div><span class="panel-kicker">TODAY</span><h2 id="attentionTitle">Needs attention</h2></div><span class="attention-count">5</span></div>', '<div class="attention-heading"><div><span class="panel-kicker">TODAY</span><h2 id="attentionTitle">Needs attention</h2></div><span class="attention-count" id="wealthAttentionCount">—</span></div>', "attention count")
html = replace_once(html, '<p class="attention-intro">Material changes and opportunities across this household.</p>', '<p class="attention-intro" id="wealthAttentionIntro">Material changes and opportunities across this household.</p>', "attention intro")
html = replace_once(html, '<div class="wealth-panel-header compact"><div><span class="panel-kicker">PLANNING</span><h2 id="goalsTitle">Goals</h2></div><span class="goal-summary">4 / 5</span></div>', '<div class="wealth-panel-header compact"><div><span class="panel-kicker">PLANNING</span><h2 id="goalsTitle">Goals</h2></div><span class="goal-summary" id="wealthGoalSummary">—</span></div>', "goal summary")
html = replace_once(html, '<button type="button" class="scenario-back" data-workspace-view="wealth">← Morrison Household</button>', '<button type="button" class="scenario-back" id="scenarioBack">← Household</button>', "scenario back")
if "Morrison" in html:
    raise RuntimeError("index.html still contains Morrison-specific UI copy")
write(path, html)

# ---------- app.js ----------
path = "app.js"
app = read(path)
app = replace_once(app, 'import { HOUSEHOLD, HOUSEHOLD_ACCOUNTS, HOUSEHOLD_GOALS, HOUSEHOLD_HOLDINGS, HOUSEHOLD_INSIGHTS, WEALTH_ALLOCATION, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadWealthHistory } from "/lib/wealth-data.js";', 'import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";', "wealth import")
app = replace_once(app, '  workspaceView: "wealth",\n  householdScenario: null,', '  workspaceView: "book",\n  householdScenario: null,\n  currentHouseholdId: null,\n  bookController: null,\n  bookQuery: "",\n  bookFocus: "all",\n  bookSort: "attention",\n  bookCursor: 0,\n  bookNextCursor: null,\n  bookItems: [],\n  bookTotal: 0,\n  bookLoaded: false,', "state wealth fields")
app = replace_once(app, 'let rangeSliderLibraryPromise = null;\n', '''let rangeSliderLibraryPromise = null;
let HOUSEHOLD = null;
let WEALTH_ALLOCATION = [];
let HOUSEHOLD_ACCOUNTS = [];
let HOUSEHOLD_HOLDINGS = [];
let HOUSEHOLD_GOALS = [];
let HOUSEHOLD_INSIGHTS = [];
let householdRequest = 0;
let bookSearchTimer = null;
let bookPrefetchTimer = null;
''', "dynamic household variables")

app = replace_regex(app, r'''function formatWealthCurrency\(value, digits = 2\) \{.*?\n\}''', r'''function formatWealthCurrency(value, digits = 2) {
  const absolute = Math.abs(Number(value) || 0);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1000000000) return `${sign}$${(absolute / 1000000000).toFixed(digits).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}B`;
  if (absolute >= 1000000) return `${sign}$${(absolute / 1000000).toFixed(digits).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}M`;
  if (absolute >= 1000) return `${sign}$${Math.round(absolute / 1000)}K`;
  return `${sign}${currency.format(absolute)}`;
}

function formatSignedWealthCurrency(value) {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? "+" : ""}${formatWealthCurrency(numeric)}`;
}''', "wealth currency formatter")

app = replace_regex(app, r'''function profileFromPath\(\) \{.*?\n\}''', r'''function profileFromPath() {
  const match = location.pathname.match(/^\/investment\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

function householdFromPath() {
  const match = location.pathname.match(/^\/household\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}''', "household route parser")

book_and_household = r'''function bookPriorityMarkup(item) {
  if (!item.priority) return `<span class="book-priority-none">No material exception</span>`;
  return `<span class="book-priority book-priority-${escapeHtml(item.priority.tone)}"><i></i><span><strong>${escapeHtml(item.priority.title)}</strong><small>${escapeHtml(item.priority.detail)}</small></span></span>`;
}

function renderBookSummary(data) {
  el("bookSubtitle").textContent = `${data.metrics.householdCount} households · one connected view of your client book`;
  el("bookUpdated").textContent = "Updated through Aug 21, 2026 · 9:42 AM ET";
  el("bookHouseholdCount").textContent = formatCount(data.metrics.householdCount);
  el("bookFinancialAssets").textContent = formatWealthCurrency(data.metrics.financialAssets);
  el("bookNetWorth").textContent = formatWealthCurrency(data.metrics.netWorth);
  el("bookCash").textContent = formatWealthCurrency(data.metrics.investableCash);
  el("bookAttentionCount").textContent = formatCount(data.metrics.attentionHouseholds);
  const counts = data.focusCounts || {};
  const countMap = {
    bookFilterPriority: counts.priority,
    bookFilterCash: counts.cash,
    bookFilterGoals: counts.goals,
    bookFilterUpcoming: counts.upcoming,
  };
  Object.entries(countMap).forEach(([id, value]) => { el(id).textContent = formatCount(value || 0); });
  el("bookIntelPriority").textContent = `${formatCount(counts.priority || 0)} households`;
  el("bookIntelCash").textContent = `${formatCount(counts.cash || 0)} households`;
  el("bookIntelGoals").textContent = `${formatCount(counts.goals || 0)} goal reviews`;
  el("bookIntelUpcoming").textContent = `${formatCount(counts.upcoming || 0)} obligations`;
  el("bookIntelHeldAway").textContent = `${formatCount(counts["held-away"] || 0)} with held-away assets`;
}

function renderBookRows() {
  const rows = state.bookItems.map((item) => `<tr data-book-household-row="${escapeHtml(item.id)}"><th><button type="button" class="book-household-link" data-household-id="${escapeHtml(item.id)}"><span class="book-avatar">${escapeHtml(item.initials)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.location)} · ${item.accountCount} accounts · ${escapeHtml(item.riskProfile)}</small></span><b>›</b></button></th><td>${formatWealthCurrency(item.netWorth)}</td><td>${formatWealthCurrency(item.financialAssets)}</td><td><strong>${formatWealthCurrency(item.cash)}</strong><small>${item.cashPct.toFixed(1)}%</small></td><td class="${item.ytdReturn >= 0 ? "positive" : "negative"}">${item.ytdReturn >= 0 ? "+" : ""}${item.ytdReturn.toFixed(1)}%</td><td>${item.goalsOnTrack} / ${item.goalsTotal}</td><td>${bookPriorityMarkup(item)}</td></tr>`).join("");
  updateHtml(el("bookBody"), rows || `<tr><td colspan="7" class="book-empty"><strong>No households match this view</strong><span>Try another search or focus filter.</span></td></tr>`);
  el("bookResultCount").textContent = formatCount(state.bookTotal);
  el("bookLoadedCount").textContent = state.bookItems.length < state.bookTotal ? `${formatCount(state.bookItems.length)} shown` : `${formatCount(state.bookTotal)} shown`;
  el("bookLoadMoreWrap").hidden = state.bookNextCursor === null;
  const focusLabels = { all: "Prioritized across your book", priority: "Households with priority risk", cash: "Households with deployable cash", goals: "Households with goal reviews", upcoming: "Households with upcoming obligations", "held-away": "Relationships with held-away assets" };
  el("bookViewStatus").textContent = focusLabels[state.bookFocus] || focusLabels.all;
  document.querySelectorAll("[data-book-focus]").forEach((button) => button.classList.toggle("active", button.dataset.bookFocus === state.bookFocus));
}

async function loadBook({ reset = true } = {}) {
  state.bookController?.abort();
  const controller = new AbortController();
  state.bookController = controller;
  if (reset) state.bookCursor = 0;
  el("bookLoading").hidden = false;
  try {
    const data = await loadAdvisorBook({ advisorId: DEFAULT_ADVISOR_ID, q: state.bookQuery, focus: state.bookFocus, sort: state.bookSort, cursor: state.bookCursor, pageSize: 64, signal: controller.signal });
    if (controller !== state.bookController) return;
    state.bookItems = reset ? data.items : [...state.bookItems, ...data.items];
    state.bookTotal = data.total;
    state.bookNextCursor = data.nextCursor;
    state.bookLoaded = true;
    renderBookSummary(data);
    renderBookRows();
  } catch (error) {
    if (error.name !== "AbortError") {
      updateHtml(el("bookBody"), `<tr><td colspan="7" class="book-empty"><strong>Client book is temporarily unavailable</strong><span>${escapeHtml(error.message)}</span></td></tr>`);
      el("bookResultCount").textContent = "—";
    }
  } finally {
    if (controller === state.bookController) el("bookLoading").hidden = true;
  }
}

function assignHouseholdOverview(overview) {
  HOUSEHOLD = overview.household;
  WEALTH_ALLOCATION = overview.allocation || [];
  HOUSEHOLD_ACCOUNTS = overview.accounts || [];
  HOUSEHOLD_HOLDINGS = overview.holdings || [];
  HOUSEHOLD_GOALS = overview.goals || [];
  HOUSEHOLD_INSIGHTS = overview.insights || [];
}

function resetWealthChart() {
  wealthChartResizeObserver?.disconnect();
  wealthChartResizeObserver = null;
  wealthChart?.remove?.();
  wealthChart = null;
  wealthSeries = null;
  wealthHistory = null;
  const loading = el("wealthChartLoading");
  loading.hidden = false;
  loading.classList.remove("error");
  loading.querySelector("p").textContent = "Preparing household history…";
}

function renderHouseholdLoading(id) {
  updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar" aria-hidden="true">··</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>Loading relationship…</h1><p>${escapeHtml(id)}</p></div></div></div><div class="wealth-heading-meta"><span>Illustrative household</span><strong>Retrieving current household data…</strong></div>`);
  updateHtml(el("wealthSummaryStrip"), `<div class="wealth-summary-primary"><span>Net worth</span><strong>—</strong><small>Loading</small></div><div><span>Portfolio</span><strong>—</strong><small>Loading</small></div><div><span>Liquidity</span><strong>—</strong><small>Loading</small></div><div><span>Largest position</span><strong>—</strong><small>Loading</small></div><div><span>Goals</span><strong>—</strong><small>Loading</small></div>`);
}

async function openHousehold(householdId, { updateHistory = true, replaceHistory = false } = {}) {
  const request = ++householdRequest;
  closeWealthDrawer({ restoreFocus: false });
  state.currentHouseholdId = householdId;
  resetWealthChart();
  renderHouseholdLoading(householdId);
  setWorkspaceView("wealth", { updateHistory, replaceHistory });
  try {
    const overview = await loadHouseholdOverview(householdId);
    if (request !== householdRequest || state.currentHouseholdId !== householdId) return;
    assignHouseholdOverview(overview);
    renderWealthWorkspace();
    document.title = `${HOUSEHOLD.name} | Advisor Workspace`;
    requestAnimationFrame(initializeWealthChart);
  } catch (error) {
    if (request !== householdRequest) return;
    updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar">!</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>Relationship unavailable</h1><p>${escapeHtml(error.message)}</p></div></div></div>`);
  }
}

function renderWealthWorkspace() {
  if (!HOUSEHOLD) return;
  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));
  const topHolding = HOUSEHOLD_HOLDINGS[0];
  updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar" aria-hidden="true">${escapeHtml(HOUSEHOLD.initials)}</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>${escapeHtml(HOUSEHOLD.name)}</h1><p>${escapeHtml(HOUSEHOLD.relationshipType)} · ${escapeHtml(HOUSEHOLD.location)} · ${HOUSEHOLD.accountCount} financial accounts</p></div><button class="household-switcher" type="button" data-wealth-action="relationship" aria-label="Open household profile">›</button></div></div><div class="wealth-heading-meta"><span>Illustrative household</span><strong>Updated ${escapeHtml(HOUSEHOLD.asOf)}</strong></div>`);
  const largestPosition = topHolding ? `${escapeHtml(topHolding.symbol)} · ${topHolding.weight.toFixed(1)}%` : "—";
  updateHtml(el("wealthSummaryStrip"), `<div class="wealth-summary-primary"><span>Net worth</span><strong>${formatWealthCurrency(HOUSEHOLD.netWorth)}</strong><small><b>${formatSignedWealthCurrency(HOUSEHOLD.ytdChange)}</b> year to date</small></div><div><span>Portfolio</span><strong>${escapeHtml(HOUSEHOLD.riskProfile)}</strong><small>Household risk profile</small></div><div><span>Liquidity</span><strong>${formatWealthCurrency(HOUSEHOLD.investableCash)}</strong><small>${HOUSEHOLD.liquidityPct.toFixed(1)}% readily available</small></div><div><span>Largest position</span><strong class="${concentration ? "wealth-watch" : ""}">${largestPosition}</strong><small>${concentration ? escapeHtml(concentration.detail) : "Within monitored household exposure"}</small></div><div><span>Goals</span><strong>${HOUSEHOLD.goalsOnTrack} of ${HOUSEHOLD.goalsTotal}</strong><small>On track or funded</small></div>`);
  el("wealthPerformanceTitle").textContent = formatWealthCurrency(HOUSEHOLD.financialAssets);
  el("wealthPerformanceMeta").innerHTML = `<strong>${HOUSEHOLD.ytdReturn >= 0 ? "+" : ""}${HOUSEHOLD.ytdReturn.toFixed(1)}%</strong> time-weighted return · <span>${formatSignedWealthCurrency(HOUSEHOLD.netFlows)} net flows</span>`;
  el("wealthAllocationTotal").textContent = `${formatWealthCurrency(HOUSEHOLD.financialAssets)} financial assets`;
  el("wealthAttentionCount").textContent = String(HOUSEHOLD_INSIGHTS.length);
  el("wealthAttentionIntro").textContent = `Material changes and opportunities across ${HOUSEHOLD.name}.`;
  el("wealthGoalSummary").textContent = `${HOUSEHOLD.goalsOnTrack} / ${HOUSEHOLD.goalsTotal}`;
  el("reviewRiskButton").hidden = !HOUSEHOLD.hasConcentrationPolicy;
  updateHtml(el("wealthAllocationBar"), wealthAllocationSvg(WEALTH_ALLOCATION));
  updateHtml(el("wealthAllocationLegend"), WEALTH_ALLOCATION.map((item) => `<div><i class="tone-${escapeHtml(item.tone)}"></i><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong></div>`).join(""));
  updateHtml(el("wealthAccountsBody"), HOUSEHOLD_ACCOUNTS.map((account) => `<tr class="wealth-clickable-row"><th><button type="button" class="wealth-row-link" data-wealth-account="${escapeHtml(account.id)}"><strong>${escapeHtml(account.name)}</strong><small>${escapeHtml(account.registration)} · ${escapeHtml(account.allocation)}</small></button></th><td>${formatWealthCurrency(account.value)}</td><td class="${account.change >= 0 ? "positive" : "negative"}">${account.change >= 0 ? "+" : ""}${account.change.toFixed(1)}%</td></tr>`).join(""));
  updateHtml(el("wealthHoldingsBody"), HOUSEHOLD_HOLDINGS.map((holding) => `<tr><th><div class="wealth-holding">${productMark({ ...holding, category: "Equities" })}<span><strong>${escapeHtml(holding.symbol)}</strong><small>${escapeHtml(holding.name)}</small></span></div></th><td>${formatWealthCurrency(holding.value)}</td><td class="${holding.weight > 15 ? "attention-value" : ""}">${holding.weight.toFixed(1)}%</td></tr>`).join(""));
  updateHtml(el("wealthGoals"), HOUSEHOLD_GOALS.map((goal) => `<button type="button" class="goal-row" data-wealth-goal="${escapeHtml(goal.id)}"><span class="goal-copy"><strong>${escapeHtml(goal.name)}</strong><small>${escapeHtml(goal.timing)}</small></span>${goalProgressMeter(goal)}<em class="goal-${escapeHtml(goal.tone)}">${escapeHtml(goal.status)}</em></button>`).join(""));
  updateHtml(el("wealthInsights"), HOUSEHOLD_INSIGHTS.map((insight) => `<button type="button" class="attention-item tone-${escapeHtml(insight.tone)}" data-wealth-insight="${escapeHtml(insight.id)}"><i aria-hidden="true"></i><span class="attention-copy"><small>${escapeHtml(insight.severity)}</small><strong>${escapeHtml(insight.title)}</strong><em data-insight-detail="${escapeHtml(insight.id)}">${escapeHtml(insight.detail)}</em></span><span class="attention-action">${escapeHtml(insight.action)} <b>›</b></span></button>`).join(""));
  renderHouseholdProgress();
}

function renderHouseholdProgress() {
  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));
  if (!concentration) return;
  const progress = document.querySelector(`[data-insight-detail="${CSS.escape(concentration.id)}"]`);
  if (!progress) return;
  const selected = state.compare.size;
  progress.textContent = selected ? `${selected} diversification ${selected === 1 ? "alternative" : "alternatives"} selected` : concentration.detail;
}
'''
app = replace_regex(app, r'''function renderWealthWorkspace\(\) \{.*?\n\}\n\nfunction renderHouseholdProgress\(\) \{.*?\n\}\n''', book_and_household, "book and household rendering")

app = replace_regex(app, r'''function wealthPointsForRange\(range\) \{.*?\n\}\n\nfunction drawWealthRange\(\) \{.*?\n\}''', r'''function wealthPointsForRange(range) {
  const years = { "1Y": 1, "3Y": 3, "5Y": 5 }[range] || 1;
  const lastPoint = wealthHistory?.at(-1);
  if (!lastPoint) return [];
  const cutoff = new Date(`${lastPoint.time}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return wealthHistory.filter((point) => new Date(`${point.time}T00:00:00Z`) >= cutoff);
}

function drawWealthRange() {
  if (!wealthSeries || !wealthChart) return;
  const points = wealthPointsForRange(wealthRange);
  wealthSeries.setData(points);
  document.querySelectorAll("[data-wealth-range]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.wealthRange === wealthRange)));
  const first = points[0]?.time;
  const last = points.at(-1)?.time;
  el("wealthChartPeriod").textContent = first && last ? `${chartDate.format(new Date(`${first}T00:00:00Z`))}–${chartDate.format(new Date(`${last}T00:00:00Z`))}` : wealthRange;
  wealthChart.timeScale().fitContent();
}''', "dynamic wealth range")
app = replace_once(app, 'if (wealthChart || state.workspaceView !== "wealth") return;', 'if (wealthChart || state.workspaceView !== "wealth" || !state.currentHouseholdId) return;', "chart initial guard")
app = replace_once(app, 'const [library, history] = await Promise.all([loadCompareChartLibrary(), loadWealthHistory()]);', 'const householdId = state.currentHouseholdId;\n    const [library, history] = await Promise.all([loadCompareChartLibrary(), loadWealthHistory(householdId)]);', "chart household history")
app = replace_once(app, 'if (state.workspaceView !== "wealth" || wealthChart) return;', 'if (state.workspaceView !== "wealth" || wealthChart || state.currentHouseholdId !== householdId) return;', "chart stale guard")

app = replace_regex(app, r'''function setWorkspaceView\(view, \{ updateHistory = true, replaceHistory = false \} = \{\}\) \{.*?\n\}\n\nfunction closeWealthDrawer''', r'''function setWorkspaceView(view, { updateHistory = true, replaceHistory = false } = {}) {
  const next = ["book", "wealth", "investments"].includes(view) ? view : "book";
  state.workspaceView = next;
  el("bookView").hidden = next !== "book";
  el("wealthView").hidden = next !== "wealth";
  el("investmentView").hidden = next !== "investments";
  document.body.dataset.workspace = next;
  document.querySelectorAll("[data-workspace-view]").forEach((button) => {
    const target = button.dataset.workspaceView;
    button.classList.toggle("active", target === "book" ? next === "book" || next === "wealth" : target === next);
  });
  document.title = next === "book" ? "Advisor Workspace" : next === "wealth" ? `${HOUSEHOLD?.name || "Household"} | Advisor Workspace` : "Investment Screener | Advisor Workspace";
  if (updateHistory && !profileFromPath()) {
    const href = next === "book" ? "/" : next === "wealth" && state.currentHouseholdId ? `/household/${encodeURIComponent(state.currentHouseholdId)}` : investmentUrl();
    history[replaceHistory ? "replaceState" : "pushState"]({ workspaceView: next, householdId: state.currentHouseholdId }, "", href);
  }
  if (next === "book") {
    closeWealthDrawer({ restoreFocus: false });
    if (!state.bookLoaded) loadBook();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (next === "wealth") {
    renderHouseholdProgress();
    if (HOUSEHOLD) requestAnimationFrame(initializeWealthChart);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    ensureInvestmentWorkspaceLoaded();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function closeWealthDrawer''', "workspace routing")

new_drawers = r'''function policyTrackSvg(review) {
  const maximum = Math.max(30, Math.ceil(review.holding.weight / 5) * 5);
  const current = Math.min(maximum, review.holding.weight);
  const target = Math.min(maximum, review.targetWeight);
  return `<svg class="policy-track-svg" viewBox="0 0 ${maximum} 8" preserveAspectRatio="none" role="img" aria-label="Current ${review.holding.weight.toFixed(1)} percent versus ${review.targetWeight.toFixed(1)} percent target"><rect x="0" y="2" width="${maximum}" height="4" fill="#ececea"></rect><rect x="0" y="2" width="${current}" height="4" fill="#b51f35"></rect><line x1="${target}" y1="0" x2="${target}" y2="8" stroke="#111" stroke-width="0.5"></line></svg>`;
}

function concentrationDrawer(review) {
  const accountLabel = `${review.accounts.length} ${review.accounts.length === 1 ? "account" : "accounts"}`;
  const basisPct = review.costBasis > 0 ? Math.round(review.unrealizedGain / review.costBasis * 100) : null;
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">PORTFOLIO RISK · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close concentration review">×</button></header>
    <div class="wealth-drawer-body">
      <section class="concentration-hero"><div class="concentration-name">${productMark({ ...review.holding, category: "Equities" })}<div><span>Single-position concentration</span><h2 id="wealthDrawerTitle">${escapeHtml(review.holding.name)}</h2><p>${escapeHtml(review.holding.symbol)} · Across ${escapeHtml(accountLabel)}</p></div></div><div class="concentration-status"><span>Above policy</span><strong>${review.holding.weight.toFixed(1)}%</strong><small>${review.targetWeight.toFixed(0)}% household target</small></div></section>
      <section class="concentration-metrics" aria-label="Concentration summary"><div><span>Market value</span><strong>${formatWealthCurrency(review.holding.value)}</strong><small>Largest household position</small></div><div><span>Unrealized gain</span><strong>${formatWealthCurrency(review.unrealizedGain)}</strong><small>${basisPct === null ? "Cost basis unavailable" : `${basisPct}% above cost basis`}</small></div><div><span>Risk contribution</span><strong>${review.riskContribution === null ? "—" : `${review.riskContribution}%`}</strong><small>Of modeled equity risk</small></div><div><span>Target release</span><strong>${formatWealthCurrency(review.targetRelease)}</strong><small>To reach ${review.targetWeight.toFixed(0)}% target</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>Exposure</span><h3>Position relative to policy</h3></div><div class="policy-track">${policyTrackSvg(review)}</div><div class="policy-scale"><span>0%</span><span>${review.targetWeight.toFixed(0)}% household target</span><span>${Math.max(30, Math.ceil(review.holding.weight / 5) * 5)}%</span></div></section>
      <section class="concentration-section"><div class="section-heading"><span>Ownership</span><h3>Where the exposure sits</h3><p>Account location and unrealized gains shape implementation choices.</p></div><table class="concentration-table"><thead><tr><th>Account</th><th>Market value</th><th>Account weight</th><th>Unrealized gain</th></tr></thead><tbody>${review.accounts.map((account) => `<tr><th>${escapeHtml(account.name)}</th><td>${formatWealthCurrency(account.value)}</td><td>${account.weight.toFixed(1)}%</td><td>${formatWealthCurrency(account.gain)}</td></tr>`).join("")}</tbody></table></section>
      <section class="concentration-section scenario-impact"><div class="section-heading"><span>Decision support</span><h3>Illustrative household impact</h3></div><table class="concentration-table"><thead><tr><th>Scenario</th><th>Position impact</th><th>Portfolio impact</th></tr></thead><tbody>${review.scenarios.map((scenario) => `<tr><th>${escapeHtml(scenario.name)}</th><td>${escapeHtml(scenario.holdingMove)}</td><td>${escapeHtml(scenario.portfolioMove)}</td></tr>`).join("")}</tbody></table></section>
      <section class="concentration-research"><div><span>UPS RESEARCH · ${escapeHtml(review.research.reviewed)}</span><strong>${escapeHtml(review.research.status)}</strong><p>${escapeHtml(review.research.summary)}</p></div><button type="button" class="secondary-button" data-open-modal="researchModal">View research context</button></section>
      <section class="concentration-next"><div><span class="panel-kicker">NEXT STEP</span><h3>Explore implementation paths</h3><p>Carry the objective—not hidden client data—into the investment shelf.</p></div><button type="button" class="primary-button" data-household-scenario="concentration">Explore diversification options →</button></section>
      <p class="wealth-disclosure">Illustrative household and scenario data · Not for investment decisions.</p>
    </div>`;
}

function operationalDrawer(id) {
  let item;
  if (id === "relationship") {
    item = {
      eyebrow: "RELATIONSHIP PROFILE",
      title: HOUSEHOLD.name,
      summary: "A consolidated view of the people, entities and connected accounts that make up this illustrative relationship.",
      rows: [["Household members", HOUSEHOLD.members.length ? HOUSEHOLD.members.join(" · ") : "Household relationship"], ["Primary relationship", `${HOUSEHOLD.relationshipType} · ${HOUSEHOLD.location}`], ["Entity relationships", HOUSEHOLD.entitySummary], ["Service model", HOUSEHOLD.serviceModel], ["External coverage", `${HOUSEHOLD.heldAwayCount} connected held-away ${HOUSEHOLD.heldAwayCount === 1 ? "account" : "accounts"}`], ["Last planning review", HOUSEHOLD.lastPlanningReview]],
    };
  } else {
    const insight = HOUSEHOLD_INSIGHTS.find((candidate) => candidate.id === id);
    const detail = insight?.details;
    item = {
      eyebrow: detail?.eyebrow || insight?.severity?.toUpperCase() || "HOUSEHOLD REVIEW",
      title: insight?.title || "Household review",
      summary: detail?.summary || insight?.detail || "Current relationship information.",
      rows: detail?.rows || [["Household", HOUSEHOLD.name], ["Status", insight?.severity || "Current"], ["Detail", insight?.detail || "No additional detail"]],
    };
  }
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">${escapeHtml(item.eyebrow)}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p><div class="operational-rows">${item.rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p></div>`;
}

function accountMix(account) {
  return `<div class="account-allocation-bar" aria-label="${escapeHtml(account.name)} allocation">${wealthAllocationSvg(account.mix)}</div><div class="account-allocation-legend">${account.mix.map((item) => `<div><i class="tone-${escapeHtml(item.tone)}"></i><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong></div>`).join("")}</div>`;
}

function accountsDrawer() {
  const heldAway = HOUSEHOLD_ACCOUNTS.filter((account) => account.custodyType === "held-away").reduce((sum, account) => sum + account.value, 0);
  const cash = HOUSEHOLD_ACCOUNTS.reduce((sum, account) => sum + account.cash, 0);
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">OWNERSHIP · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close account overview">×</button></header>
    <div class="wealth-drawer-body account-review">
      <section class="account-review-hero"><div><span>HOUSEHOLD ACCOUNTS</span><h2 id="wealthDrawerTitle">${formatWealthCurrency(HOUSEHOLD.financialAssets)} across ${HOUSEHOLD.accountCount} accounts</h2><p>Custodied and connected assets reconciled into one household view.</p></div><strong>100%<small>account coverage</small></strong></section>
      <section class="account-review-metrics"><div><span>Advisory assets</span><strong>${formatWealthCurrency(HOUSEHOLD.financialAssets - heldAway)}</strong><small>${HOUSEHOLD.custodiedCount} custodied relationships</small></div><div><span>Held away</span><strong>${formatWealthCurrency(heldAway)}</strong><small>${HOUSEHOLD.heldAwayCount} connected accounts</small></div><div><span>Available cash</span><strong>${formatWealthCurrency(cash)}</strong><small>Across all registrations</small></div><div><span>Last refresh</span><strong>Current</strong><small>${escapeHtml(HOUSEHOLD.asOf)}</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>ACCOUNT MAP</span><h3>Ownership and purpose</h3><p>Select an account to review allocation, holdings and operational status.</p></div><table class="concentration-table account-map-table"><thead><tr><th>Account</th><th>Registration</th><th>Value</th><th>YTD</th></tr></thead><tbody>${HOUSEHOLD_ACCOUNTS.map((account) => `<tr><th><button type="button" class="drawer-table-link" data-wealth-account="${escapeHtml(account.id)}">${escapeHtml(account.name)} <span>›</span></button></th><td>${escapeHtml(account.registration)}</td><td>${formatWealthCurrency(account.value)}</td><td class="${account.change >= 0 ? "positive" : "negative"}">${account.change >= 0 ? "+" : ""}${account.change.toFixed(1)}%</td></tr>`).join("")}</tbody></table></section>
      <section class="account-data-strip"><div><span>Custodied accounts</span><strong>${HOUSEHOLD.custodiedCount} current · reconciled</strong></div><div><span>External connections</span><strong>${HOUSEHOLD.heldAwayCount} connected · daily</strong></div><div><span>Coverage exception</span><strong>None</strong></div></section>
      <p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p>
    </div>`;
}

function accountDrawer(account) {
  if (!account) return accountsDrawer();
  const holdings = account.holdings.length
    ? `<table class="concentration-table account-holdings-table"><thead><tr><th>Holding</th><th>Market value</th><th>Account weight</th></tr></thead><tbody>${account.holdings.map((holding) => `<tr><th><div class="wealth-holding">${productMark({ ...holding, category: "Equities" })}<span><strong>${escapeHtml(holding.symbol)}</strong><small>${escapeHtml(holding.name)}</small></span></div></th><td>${formatWealthCurrency(holding.value)}</td><td>${holding.weight.toFixed(1)}%</td></tr>`).join("")}</tbody></table>`
    : `<div class="account-empty-holdings"><strong>Position-level feed summarized</strong><span>This connected account contributes to household allocation and planning without exposing underlying positions in the prototype.</span></div>`;
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">ACCOUNT · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-wealth-action="accounts">← All accounts</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close account detail">×</button></header>
    <div class="wealth-drawer-body account-review">
      <section class="account-detail-hero"><div><span>${escapeHtml(account.registration)}</span><h2 id="wealthDrawerTitle">${escapeHtml(account.name)}</h2><p>${escapeHtml(account.purpose)} · ${escapeHtml(account.program)}</p></div><div><span>Current value</span><strong>${formatWealthCurrency(account.value)}</strong><small class="${account.change >= 0 ? "positive" : "negative"}">${account.change >= 0 ? "+" : ""}${account.change.toFixed(1)}% YTD</small></div></section>
      <section class="account-review-metrics"><div><span>Available cash</span><strong>${formatWealthCurrency(account.cash)}</strong><small>${(account.cash / account.value * 100).toFixed(1)}% of account</small></div><div><span>Tax treatment</span><strong>${escapeHtml(account.taxTreatment)}</strong><small>Registration-level view</small></div><div><span>Unrealized gain</span><strong>${account.unrealizedGain ? formatWealthCurrency(account.unrealizedGain) : "—"}</strong><small>${account.unrealizedGain ? "Illustrative tax lot basis" : "Not available"}</small></div><div><span>Data status</span><strong>Current</strong><small>${escapeHtml(account.lastReconciled)}</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>ALLOCATION</span><h3>${escapeHtml(account.allocation)} portfolio</h3></div>${accountMix(account)}</section>
      <section class="concentration-section"><div class="section-heading"><span>EXPOSURE</span><h3>Largest positions</h3><p>Position detail is shown when available from the connected source.</p></div>${holdings}</section>
      <section class="account-data-strip"><div><span>Service model</span><strong>${escapeHtml(account.program)}</strong></div><div><span>Primary purpose</span><strong>${escapeHtml(account.purpose)}</strong></div><div><span>Data quality</span><strong>Validated</strong></div></section>
      <p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p>
    </div>`;
}

function goalDrawer(goal) {
  if (!goal) return operationalDrawer("relationship");
  const gap = Math.max(0, goal.target - goal.funded);
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">PLANNING · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close goal review">×</button></header>
    <div class="wealth-drawer-body goal-review">
      <section class="goal-review-hero"><div><span>${escapeHtml(goal.timing)}</span><h2 id="wealthDrawerTitle">${escapeHtml(goal.name)}</h2><p>${escapeHtml(goal.action)}</p></div><em class="goal-${escapeHtml(goal.tone)}">${escapeHtml(goal.status)}</em></section>
      <section class="goal-funding"><div class="goal-funding-heading"><div><span>Funded</span><strong>${formatWealthCurrency(goal.funded)}</strong></div><div><span>Target</span><strong>${formatWealthCurrency(goal.target)}</strong></div></div><progress class="goal-funding-track goal-progress-${escapeHtml(goal.tone)}" max="100" value="${Math.max(0, Math.min(100, Number(goal.progress) || 0))}" aria-label="${escapeHtml(`${goal.name} funding progress`)}"></progress><div class="goal-funding-scale"><span>${goal.progress}% funded</span><span>${gap ? `${formatWealthCurrency(gap)} remaining` : "Target funded"}</span></div></section>
      <section class="account-review-metrics goal-review-metrics"><div><span>Plan confidence</span><strong>${goal.confidence}%</strong><small>Illustrative planning model</small></div><div><span>Annual funding</span><strong>${goal.annualFunding ? formatWealthCurrency(goal.annualFunding) : "Fully funded"}</strong><small>Current scheduled amount</small></div><div><span>Responsibility</span><strong>${escapeHtml(goal.owner)}</strong><small>Goal ownership</small></div><div><span>Next review</span><strong>${escapeHtml(goal.nextReview)}</strong><small>Planning calendar</small></div></section>
      <section class="goal-next-step"><span>NEXT ADVISOR ACTION</span><strong>${escapeHtml(goal.action)}</strong><small>Planning assumptions and values are illustrative.</small></section>
      <p class="wealth-disclosure">Illustrative household and planning data · Not for investment decisions.</p>
    </div>`;
}
'''
app = replace_regex(app, r'''function concentrationDrawer\(review\) \{.*?\n\}\n\nfunction operationalDrawer\(id\) \{.*?\n\}\n\nfunction accountMix\(account\) \{.*?\n\}\n\nfunction accountsDrawer\(\) \{.*?\n\}\n\nfunction accountDrawer\(account\) \{.*?\n\}\n\nfunction goalDrawer\(goal\) \{.*?\n\}\n''', new_drawers, "dynamic drawers")

app = replace_once(app, 'if (id === "concentration") detailRequest = loadConcentrationReview().then(concentrationDrawer);', 'if (id === "concentration") detailRequest = loadConcentrationReview(state.currentHouseholdId).then((review) => review ? concentrationDrawer(review) : operationalDrawer("relationship"));', "concentration request household")
app = replace_once(app, 'else if (id.startsWith("account:")) detailRequest = loadHouseholdAccount(id.slice(8)).then(accountDrawer);', 'else if (id.startsWith("account:")) detailRequest = loadHouseholdAccount(id.slice(8), state.currentHouseholdId).then(accountDrawer);', "account request household")
app = replace_once(app, 'else if (id.startsWith("goal:")) detailRequest = loadHouseholdGoal(id.slice(5)).then(goalDrawer);', 'else if (id.startsWith("goal:")) detailRequest = loadHouseholdGoal(id.slice(5), state.currentHouseholdId).then(goalDrawer);', "goal request household")

app = replace_regex(app, r'''function showScenarioRibbon\(\{ source, title, tags \}\) \{.*?\n\}\n\nfunction applyHouseholdScenario\(id\) \{.*?\n\}\n\nfunction handleWealthInsight\(id\) \{.*?\n\}''', r'''function showScenarioRibbon({ source, title, tags }) {
  state.householdScenario = { source, title, tags, householdId: state.currentHouseholdId, householdName: HOUSEHOLD.name };
  el("scenarioBack").textContent = `← ${HOUSEHOLD.name}`;
  el("scenarioSource").textContent = source;
  el("scenarioTitle").textContent = title;
  el("scenarioTags").innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  el("scenarioRibbon").hidden = false;
}

function applyHouseholdScenario(id) {
  if (!HOUSEHOLD) return;
  const supportedRisk = /conservative/i.test(HOUSEHOLD.riskProfile) ? "Conservative" : /growth/i.test(HOUSEHOLD.riskProfile) ? "Moderate" : "Moderate";
  const scenarios = {
    concentration: { source: "FROM CONCENTRATION REVIEW", title: "Explore diversification options", tags: [HOUSEHOLD.name, "Tax-aware implementation", "Reduce concentrated exposure"], category: "SMAs", q: "", flags: ["Tax-Aware", "Direct Indexing"], risks: [supportedRisk] },
    cash: { source: "FROM LIQUIDITY REVIEW", title: "Explore cash alternatives", tags: [`${formatWealthCurrency(HOUSEHOLD.investableCash)} available`, HOUSEHOLD.riskProfile, "Daily liquidity"], category: "Fixed Income", q: "short duration cash management", flags: [], risks: ["Conservative"] },
    muni: { source: "FROM ALLOCATION REVIEW", title: "Restore municipal allocation", tags: [HOUSEHOLD.location, "Tax aware", "Fee under 0.50%"], category: "Fixed Income", q: `${HOUSEHOLD.location} municipal income under 50 bps`, flags: ["Tax-Aware"], risks: ["Conservative"] },
  };
  const scenario = scenarios[id];
  if (!scenario) return;
  closeWealthDrawer({ restoreFocus: false });
  state.q = scenario.q;
  state.category = scenario.category;
  state.appliedCategory = scenario.category;
  state.flags = new Set(scenario.flags);
  state.risks = new Set(scenario.risks.filter((risk) => RISKS.includes(risk)));
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

function handleWealthInsight(id) {
  if (id === "concentration" || id.endsWith("-concentration")) { openWealthDrawer("concentration"); return; }
  if (id === "cash" || id.endsWith("-cash")) { applyHouseholdScenario("cash"); return; }
  if (id === "muni" || id.endsWith("-muni")) { applyHouseholdScenario("muni"); return; }
  if (id.endsWith("-goal-review")) {
    const goal = HOUSEHOLD_GOALS.find((candidate) => candidate.tone === "watch");
    if (goal) { openWealthDrawer(`goal:${goal.id}`); return; }
  }
  openWealthDrawer(id);
}''', "dynamic scenarios")

app = replace_regex(app, r'''function hydrateFromUrl\(\) \{.*?\n\}\n\ndocument.addEventListener\("click"''', r'''function hydrateFromUrl() {
  const params = new URLSearchParams(location.search);
  const profile = profileFromPath();
  const household = householdFromPath();
  state.workspaceView = profile || /^\/investments\/?$/i.test(location.pathname) ? "investments" : household ? "wealth" : "book";
  state.currentHouseholdId = household;
  state.q = params.get("q") || "";
  const category = params.get("category") || "All";
  state.category = CATEGORY_ORDER.includes(category) ? category : "All";
  state.appliedCategory = state.category;
  state.flags = new Set((params.get("flags") || "").split(",").filter((value) => PRIMARY_FLAGS.includes(value)));
  state.risks = new Set((params.get("risks") || "").split(",").filter((value) => RISKS.includes(value)));
  state.statuses = new Set((params.get("statuses") || "").split(",").filter((value) => STATUSES.includes(value)));
  const legacyMinimum = Number(params.get("maxMinimum"));
  const legacyFee = Number(params.get("maxFee"));
  const legacyRanges = {
    ...(params.has("maxMinimum") && Number.isFinite(legacyMinimum) && legacyMinimum >= 0 ? { minimum: { max: legacyMinimum } } : {}),
    ...(params.has("maxFee") && Number.isFinite(legacyFee) && legacyFee >= 0 && legacyFee <= 10 ? { fee: { max: legacyFee } } : {}),
  };
  const urlRanges = params.has("ranges") ? parseRanges(params.get("ranges")) : legacyRanges;
  state.ranges = state.category === "All" && state.q ? urlRanges : normalizeRanges(urlRanges, state.category);
  const sort = params.get("sort");
  state.sort = sort && SORTS.includes(sort) && isSortAllowed(sort, state.category, Boolean(state.q)) ? sort : defaultSort(Boolean(state.q));
  state.sortExplicit = Boolean(sort && state.sort === sort);
  if (params.has("columns")) {
    const columnCategory = params.get("columnCategory") || state.category;
    const safeColumnCategory = CATEGORY_ORDER.includes(columnCategory) ? columnCategory : state.category;
    state.pendingColumns = { category: safeColumnCategory, columns: params.get("columns").split(",") };
  }
  el("searchInput").value = state.q;
  renderSortControl(state.category);
}

document.addEventListener("click"''', "hydrate routes")

app = replace_once(app, '''  if (workspaceView) {
    if (el("savedModal").open) el("savedModal").close();
    setWorkspaceView(workspaceView.dataset.workspaceView);
  }
''', '''  if (workspaceView) {
    if (el("savedModal").open) el("savedModal").close();
    setWorkspaceView(workspaceView.dataset.workspaceView);
  }
  const householdLink = event.target.closest("[data-household-id]");
  if (householdLink) openHousehold(householdLink.dataset.householdId);
  const bookFocus = event.target.closest("[data-book-focus]");
  if (bookFocus) {
    state.bookFocus = bookFocus.dataset.bookFocus;
    state.bookCursor = 0;
    loadBook();
  }
  const scenarioBack = event.target.closest("#scenarioBack");
  if (scenarioBack && state.householdScenario?.householdId) openHousehold(state.householdScenario.householdId);
''', "click book interactions")
app = replace_once(app, 'if (state.workspaceView === "wealth") setWorkspaceView("investments", { updateHistory: false });', 'if (state.workspaceView !== "investments") setWorkspaceView("investments", { updateHistory: false });', "profile workspace switch")

app = replace_regex(app, r'''function prefetchWealthDetail\(target\) \{.*?\n\}\n\ndocument.addEventListener\("pointerover", \(event\) => \{ scheduleDetailPrefetch\(event.target\); prefetchWealthDetail\(event.target\); \}\);\ndocument.addEventListener\("focusin", \(event\) => \{ scheduleDetailPrefetch\(event.target\); prefetchWealthDetail\(event.target\); \}\);''', r'''function prefetchWealthDetail(target) {
  if (!state.currentHouseholdId) return;
  const account = target.closest?.("[data-wealth-account]");
  if (account) { loadHouseholdAccount(account.dataset.wealthAccount, state.currentHouseholdId).catch(() => {}); return; }
  const goal = target.closest?.("[data-wealth-goal]");
  if (goal) { loadHouseholdGoal(goal.dataset.wealthGoal, state.currentHouseholdId).catch(() => {}); return; }
  const concentration = target.closest?.('[data-wealth-insight$="concentration"], [data-wealth-action="concentration"]');
  if (concentration) loadConcentrationReview(state.currentHouseholdId).catch(() => {});
}

function prefetchBookHousehold(target) {
  const household = target.closest?.("[data-household-id]");
  if (!household) return;
  window.clearTimeout(bookPrefetchTimer);
  bookPrefetchTimer = window.setTimeout(() => loadHouseholdOverview(household.dataset.householdId).catch(() => {}), 120);
}

document.addEventListener("pointerover", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchBookHousehold(event.target); });
document.addEventListener("focusin", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchBookHousehold(event.target); });''', "wealth and book prefetch")

app = replace_once(app, 'el("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; state.sortExplicit = true; runSearch(); });', '''el("bookSearch").addEventListener("input", (event) => {
  state.bookQuery = event.target.value.trim();
  window.clearTimeout(bookSearchTimer);
  bookSearchTimer = window.setTimeout(() => loadBook(), 180);
});
el("bookSort").addEventListener("change", (event) => { state.bookSort = event.target.value; loadBook(); });
el("bookLoadMore").addEventListener("click", () => { if (state.bookNextCursor !== null) { state.bookCursor = state.bookNextCursor; loadBook({ reset: false }); } });
el("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; state.sortExplicit = true; runSearch(); });''', "book listeners")
app = replace_once(app, 'el("dismissScenario").addEventListener("click", () => { state.householdScenario = null; el("scenarioRibbon").hidden = true; });', 'el("dismissScenario").addEventListener("click", () => { state.householdScenario = null; el("scenarioRibbon").hidden = true; });', "scenario dismiss anchor")
app = replace_once(app, 'if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (state.workspaceView === "wealth") setWorkspaceView("investments"); el("searchInput").focus(); }', 'if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (state.workspaceView !== "investments") setWorkspaceView("investments"); el("searchInput").focus(); }', "command k")

app = replace_regex(app, r'''window.addEventListener\("popstate", \(\) => \{.*?\n\}\);''', r'''window.addEventListener("popstate", () => {
  const slug = profileFromPath();
  if (slug) {
    setWorkspaceView("investments", { updateHistory: false });
    openDetail(slug, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
    return;
  }
  if (el("detailDrawer").classList.contains("open")) closeDrawer({ fromHistory: true });
  const householdId = householdFromPath();
  if (householdId) { openHousehold(householdId, { updateHistory: false }); return; }
  if (/^\/investments\/?$/i.test(location.pathname)) { setWorkspaceView("investments", { updateHistory: false }); return; }
  setWorkspaceView("book", { updateHistory: false });
});''', "popstate routing")

app = replace_regex(app, r'''state.columnPreferences = loadColumnPreferences\(\);.*?initialInvestmentLoad.finally\(\(\) => \{\n  if \(initialProfile\) openDetail\(initialProfile, \{ mode: history.state\?\.profileCanvas \? "panel" : "page", pushHistory: false \}\);\n\}\);''', r'''state.columnPreferences = loadColumnPreferences();
hydrateFromUrl();
el("flagGovernance").innerHTML = PRIMARY_FLAGS.map((flag) => `<div class="governance-row"><span class="badge ${FLAG_COLORS[flag]}">${escapeHtml(flag)}</span><div><strong>${escapeHtml(FLAG_DEFINITIONS[flag].owner)}</strong><small>${escapeHtml(FLAG_DEFINITIONS[flag].definition)}</small></div></div>`).join("");
renderCategories();
renderFilterOptions();
renderActiveFilters();
renderSavedScreens();
const initialProfile = profileFromPath();
const initialHousehold = householdFromPath();
if (initialHousehold) {
  openHousehold(initialHousehold, { updateHistory: false });
} else {
  setWorkspaceView(state.workspaceView, { updateHistory: false });
  if (state.workspaceView === "book") loadBook();
}
const initialInvestmentLoad = state.workspaceView === "investments" ? ensureInvestmentWorkspaceLoaded() : Promise.resolve();
initialInvestmentLoad.finally(() => {
  if (initialProfile) openDetail(initialProfile, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
});''', "initialization")

if "MORRISON HOUSEHOLD" in app or '"Morrison Household"' in app or "$2.80M across two taxable accounts" in app:
    raise RuntimeError("app.js still contains Morrison-specific UI assumptions")
write(path, app)

# ---------- service small dynamic additions ----------
path = "lib/wealth-service.js"
service = read(path)
service = replace_once(service, '      accountCount: accountRecords.length,\n      ytdChange:', '      accountCount: accountRecords.length,\n      hasConcentrationPolicy: repository.listHouseholdConcentrationPolicies(householdId).length > 0,\n      ytdChange:', "concentration availability")
write(path, service)

# ---------- styles.css ----------
path = "styles.css"
css = read(path)
css = replace_once(css, 'body[data-workspace="wealth"] .compare-tray { display: none !important; }', 'body[data-workspace="wealth"] .compare-tray, body[data-workspace="book"] .compare-tray { display: none !important; }', "compare tray workspace")
book_css = r'''

/* Advisor book */
.book-view { min-height: calc(100vh - 58px); padding-bottom: 24px; background: #f1f1ee; }
.book-heading { min-height: 116px; display: flex; align-items: center; justify-content: space-between; gap: 30px; padding: 23px 34px 20px; border-bottom: 1px solid var(--line); background: #fff; }
.book-heading h1 { margin-bottom: 5px; font-size: 30px; }
.book-heading p { margin: 0; color: #777; font-size: 10px; }
.book-heading-meta { display: grid; justify-items: end; gap: 6px; }
.book-heading-meta span { padding: 4px 7px; border: 1px solid #d9d9d5; border-radius: 2px; color: #6f6f6c; background: #fafaf8; font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.book-heading-meta strong { color: #777; font-size: 9px; font-weight: 400; }
.book-summary-strip { min-height: 98px; display: grid; grid-template-columns: 1.05fr repeat(4, 1fr); padding: 0 34px; background: #171717; color: #fff; }
.book-summary-strip > div { min-width: 0; display: grid; align-content: center; gap: 5px; padding: 16px 20px; border-left: 1px solid #383838; }
.book-summary-strip > div:first-child { border-left: 0; padding-left: 0; }
.book-summary-strip span { color: #959595; font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.book-summary-strip strong { overflow: hidden; font-family: Georgia, serif; font-size: 20px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.book-summary-strip .book-summary-primary strong { font-size: 28px; }
.book-summary-strip small { color: #979797; font-size: 8px; }
.book-summary-strip .book-watch { color: #f1c5c5; }
.book-layout { display: grid; grid-template-columns: minmax(0, 1fr) 315px; align-items: start; gap: 14px; padding: 14px 34px 0; }
.book-panel, .book-intelligence-panel { border: 1px solid var(--line); background: #fff; }
.book-toolbar { min-height: 66px; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-bottom: 1px solid var(--line-soft); }
.book-search-wrap { position: relative; flex: 1; }
.book-search-wrap .search-symbol { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); }
.book-search-wrap input { width: 100%; height: 38px; padding: 0 12px 0 35px; border: 1px solid #cfcfcb; border-radius: 2px; background: #fff; color: #111; font-size: 11px; }
.book-search-wrap input:focus { border-color: #777; outline: 2px solid rgba(0,0,0,.06); }
.book-sort { display: grid; gap: 4px; color: #777; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
.book-sort select { min-width: 158px; height: 38px; padding: 0 28px 0 10px; border: 1px solid #cfcfcb; border-radius: 2px; background: #fff; color: #222; font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0; }
.book-filter-row { display: flex; gap: 6px; padding: 10px 15px; border-bottom: 1px solid var(--line-soft); background: #fafaf8; }
.book-filter-row button { min-height: 28px; padding: 0 9px; border: 1px solid #d7d7d3; border-radius: 2px; background: #fff; color: #666; font-size: 8px; font-weight: 700; }
.book-filter-row button span { margin-left: 5px; color: #999; font-variant-numeric: tabular-nums; }
.book-filter-row button.active { border-color: #222; background: #222; color: #fff; }
.book-filter-row button.active span { color: #cfcfcf; }
.book-table-heading { min-height: 67px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 15px; border-bottom: 1px solid var(--line-soft); }
.book-table-heading h2 { margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: 400; }
.book-table-heading p { margin: 4px 0 0; color: #888; font-size: 8px; }
.book-table-heading > span { color: #777; font-size: 8px; }
.book-table-wrap { position: relative; overflow: auto; }
.book-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.book-table th, .book-table td { height: 57px; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); text-align: right; font-size: 9px; font-variant-numeric: tabular-nums; vertical-align: middle; }
.book-table thead th { height: 33px; color: #8a8a87; background: #fafaf8; font-size: 7px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.book-table th:first-child { width: 27%; text-align: left; padding-left: 14px; }
.book-table th:last-child { width: 23%; text-align: left; padding-right: 14px; }
.book-table tbody tr:hover { background: #fafaf8; }
.book-table td small { display: block; margin-top: 3px; color: #999; font-size: 7px; }
.book-table .positive { color: var(--green); }
.book-table .negative { color: #b51f35; }
.book-household-link { width: 100%; display: grid; grid-template-columns: 31px minmax(0, 1fr) 12px; align-items: center; gap: 9px; border: 0; background: transparent; padding: 0; text-align: left; }
.book-avatar { width: 31px; height: 31px; display: grid; place-items: center; border-radius: 50%; background: #272727; color: #fff; font-family: Georgia, serif; font-size: 8px; }
.book-household-link strong, .book-household-link small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-household-link strong { color: #222; font-size: 9px; }
.book-household-link small { margin-top: 3px; color: #888; font-size: 7px; font-weight: 400; }
.book-household-link b { color: #aaa; font-size: 16px; font-weight: 400; }
.book-priority { display: grid; grid-template-columns: 7px minmax(0, 1fr); align-items: start; gap: 7px; }
.book-priority i { width: 7px; height: 7px; margin-top: 2px; border-radius: 50%; background: #777; }
.book-priority-red i { background: #b51f35; }
.book-priority-amber i { background: #b28a4d; }
.book-priority-green i { background: #246a58; }
.book-priority-blue i { background: #315f8f; }
.book-priority-slate i { background: #747b7d; }
.book-priority strong, .book-priority small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-priority strong { font-size: 8px; font-weight: 700; }
.book-priority small { margin-top: 3px; color: #888; font-size: 7px; font-weight: 400; }
.book-priority-none { color: #aaa; font-size: 8px; }
.book-empty { height: 150px !important; text-align: center !important; color: #777; }
.book-empty strong, .book-empty span { display: block; }
.book-empty strong { margin-bottom: 5px; color: #333; font-family: Georgia, serif; font-size: 16px; font-weight: 400; }
.book-loading { position: absolute; inset: 33px 0 0; display: grid; place-content: center; justify-items: center; gap: 8px; background: rgba(255,255,255,.88); color: #777; font-size: 9px; }
.book-loading span { width: 18px; height: 18px; border: 2px solid #ddd; border-top-color: #222; border-radius: 50%; animation: spin .7s linear infinite; }
.book-load-more { min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 10px; border-top: 1px solid var(--line-soft); }
.book-load-more button { height: 29px; padding: 0 11px; border: 1px solid #d5d5d1; border-radius: 2px; background: #fff; font-size: 8px; font-weight: 700; }
.book-load-more span { color: #999; font-size: 8px; }
.book-intelligence-panel { position: sticky; top: 72px; }
.book-intelligence-heading { padding: 17px 16px 14px; border-bottom: 1px solid var(--line-soft); }
.book-intelligence-heading h2 { margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: 400; }
.book-intelligence-heading p { margin: 7px 0 0; color: #777; font-size: 8px; line-height: 1.5; }
.book-intelligence-list { display: grid; }
.book-intelligence-list button { min-height: 59px; display: grid; grid-template-columns: 8px minmax(0, 1fr) 12px; align-items: center; gap: 10px; padding: 10px 14px; border: 0; border-bottom: 1px solid var(--line-soft); background: #fff; text-align: left; }
.book-intelligence-list button:hover, .book-intelligence-list button.active { background: #fafaf8; }
.book-intelligence-list button.active { box-shadow: inset 2px 0 #111; }
.book-intelligence-list small, .book-intelligence-list strong { display: block; }
.book-intelligence-list small { margin-bottom: 4px; color: #888; font-size: 7px; text-transform: uppercase; letter-spacing: .07em; }
.book-intelligence-list strong { color: #222; font-size: 9px; }
.book-intelligence-list b { color: #aaa; font-size: 16px; font-weight: 400; }
.book-signal { width: 7px; height: 7px; border-radius: 50%; background: #777; }
.book-signal.red { background: #b51f35; }.book-signal.green { background: #246a58; }.book-signal.amber { background: #b28a4d; }.book-signal.blue { background: #315f8f; }.book-signal.slate { background: #747b7d; }
.book-intelligence-note { padding: 15px 16px; background: #f7f7f5; }
.book-intelligence-note span { color: #777; font-size: 7px; font-weight: 700; letter-spacing: .1em; }
.book-intelligence-note p { margin: 6px 0 0; color: #666; font-size: 8px; line-height: 1.5; }
.household-heading-left { display: grid; gap: 10px; }
.household-book-back { width: max-content; border: 0; background: transparent; padding: 0; color: #70706d; font-size: 9px; font-weight: 600; }
.household-book-back:hover { color: #111; }
.policy-track-svg { width: 100%; height: 24px; display: block; }
.account-allocation-bar svg { width: 100%; height: 10px; display: block; }
'''
if "/* Advisor book */" not in css:
    css += book_css
write(path, css)

print("Phase Two UI patch applied")
