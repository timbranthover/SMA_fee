import { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_COLORS, FLAG_DEFINITIONS, PRIMARY_FLAGS, RISKS, STATUSES } from "/lib/shared-config.js";
import { brandLogo } from "/lib/brand-logos.js";
import { CATEGORY_COLUMN_PRESETS, CATEGORY_COLUMN_RULES, CATEGORY_DEFAULT_COLUMNS, COLUMN_DEFINITIONS, MAX_RESULT_COLUMNS, columnLabel, normalizeColumns } from "/lib/column-config.js";
import { defaultSort, headerSort, isSortAllowed, sortLoadedItems, sortOptions, SORTS } from "/lib/sort-config.js";
import { normalizeRanges, parseRanges, rangeDefinitions, serializeRanges } from "/lib/range-config.js";
import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";
import { getDecisionPlan, getHouseholdPlanSummary, loadDecisionDetail, loadDecisionSummary, loadHouseholdTimeline, loadMeetingBrief, modelDecisionScenario, saveDecisionPlan, setDecisionCandidates, setDecisionPlanStatus, toggleDecisionPlanStep } from "/lib/decision-data.js";
import { allocateProposalCandidates, createProposalDraft, getProposal, markProposalReady, reallocateProposalCandidate, saveProposal } from "/lib/proposal-data.js";

const number = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const chartDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const COMPARE_COLORS = ["#b51f35", "#246a58", "#315f8f", "#9b7629"];
const COMPARE_RANGE_OPTIONS = new Set(["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"]);
const WEALTH_ALLOCATION_COLORS = Object.freeze({ navy: "#203f52", blue: "#4f7892", teal: "#5b9082", amber: "#b28a4d", gray: "#aaa9a3", slate: "#747b7d" });

const state = {
  workspaceView: "book",
  householdScenario: null,
  concentrationSearchIntent: null,
  currentHouseholdId: null,
  decisionSummary: null,
  activeDecisionDetail: null,
  activeDecisionScenario: null,
  activeDecisionPlan: null,
  proposal: null,
  proposalCandidates: new Map(),
  decisionController: null,
  decisionScenarioController: null,
  bookController: null,
  bookQuery: "",
  bookFocus: "all",
  bookSort: "attention",
  bookCursor: 0,
  bookNextCursor: null,
  bookItems: [],
  bookTotal: 0,
  bookLoaded: false,
  q: "",
  category: "All",
  appliedCategory: "All",
  flags: new Set(),
  risks: new Set(),
  statuses: new Set(),
  ranges: {},
  sort: "name-asc",
  sortExplicit: false,
  cursor: 0,
  previousCursor: null,
  nextCursor: null,
  total: 130428,
  items: [],
  facets: null,
  controller: null,
  snapshotController: null,
  snapshotCache: new Map(),
  compare: new Map(),
  currentDetail: null,
  lastFocus: null,
  detailCache: new Map(),
  detailRequest: 0,
  detailMode: null,
  detailHistoryPushed: false,
  prefetchTimer: null,
  columnPreferences: {},
  pendingColumns: null,
  investmentSearchStarted: false,
};

let compareChart = null;
let compareChartLibraryPromise = null;
let compareChartResizeObserver = null;
let compareCrosshairHandler = null;
let compareChartRequest = 0;
let compareChartData = null;
let compareRange = "1Y";
let compareBenchmarkVisible = false;
let compareHiddenSeries = new Set();
const compareSeries = new Map();
const compareRangeData = new Map();
const compareHistoryCache = new Map();
let columnDraft = [];
let rangeCategoryRendered = null;
let wealthChart = null;
let wealthSeries = null;
let wealthChartResizeObserver = null;
let wealthRange = "1Y";
let wealthHistory = null;
let wealthDrawerRequest = 0;
let initialInvestmentSearchPromise = null;
let rangeSliderLibraryPromise = null;
let HOUSEHOLD = null;
let WEALTH_ALLOCATION = [];
let HOUSEHOLD_ACCOUNTS = [];
let HOUSEHOLD_HOLDINGS = [];
let HOUSEHOLD_GOALS = [];
let HOUSEHOLD_INSIGHTS = [];
let householdRequest = 0;
let bookSearchTimer = null;
let bookPrefetchTimer = null;
let decisionRequest = 0;
let decisionModelTimer = null;

const elementCache = new Map();
const el = (id) => {
  if (!elementCache.has(id)) elementCache.set(id, document.getElementById(id));
  return elementCache.get(id);
};
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const backLabel = (label) => `<span class="back-arrow" aria-hidden="true">←</span><span>${escapeHtml(label)}</span>`;

function loadColumnPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem("investment-screener-columns-v1"));
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(CATEGORY_ORDER.map((category) => [category, normalizeColumns(category, stored[category])]).filter(([category]) => Array.isArray(stored[category])));
  } catch { return {}; }
}

function saveColumnPreferences() {
  localStorage.setItem("investment-screener-columns-v1", JSON.stringify(state.columnPreferences));
}

function selectedColumns(category = state.appliedCategory) {
  if (state.pendingColumns?.category === category) return normalizeColumns(category, state.pendingColumns.columns);
  return normalizeColumns(category, state.columnPreferences[category] || CATEGORY_DEFAULT_COLUMNS[category]);
}

function activeSortOptions(category = state.appliedCategory) {
  return sortOptions(category, selectedColumns(category), Boolean(state.q));
}

function normalizeActiveSort(category = state.appliedCategory) {
  if (!state.sortExplicit) state.sort = defaultSort(Boolean(state.q));
  const options = activeSortOptions(category);
  if (!options.some(({ value }) => value === state.sort)) {
    state.sort = defaultSort(Boolean(state.q));
    state.sortExplicit = false;
  }
  return options;
}

function renderSortControl(category = state.appliedCategory) {
  const options = normalizeActiveSort(category);
  updateHtml(el("sortSelect"), options.map(({ value, label }) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join(""));
  el("sortSelect").value = state.sort;
}

function setColumnsForCategory(category, columns, { persist = true } = {}) {
  state.columnPreferences[category] = normalizeColumns(category, columns);
  if (persist) saveColumnPreferences();
}

function updateHtml(element, html) {
  if (element.__renderedHtml === html) return;
  element.innerHTML = html;
  element.__renderedHtml = html;
}

function formatCount(value) { return number.format(value || 0); }
function formatMinimum(value) {
  if (!value) return "$0";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 ? 1 : 0)}K`;
  return currency.format(value);
}
function formatFee(value) { return value === null || value === undefined ? "—" : `${Number(value).toFixed(value < 0.1 ? 2 : 2)}%`; }
function formatReturn(value) { return value === null || value === undefined ? "—" : `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`; }
function formatRangeValue(value, definition) {
  if (!Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  if (definition.format === "currency") return currency.format(numeric);
  if (definition.format === "percent") return `${numeric.toFixed(definition.digits)}%`;
  if (definition.format === "multiple") return `${numeric.toFixed(definition.digits)}×`;
  if (definition.format === "months") return `${numeric.toFixed(0)} mo`;
  if (definition.format === "years") return `${numeric.toFixed(0)} yr`;
  return numeric.toFixed(definition.digits);
}
function formatChartReturn(value) { return value === null || value === undefined || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`; }
function monogram(item) { return item.symbol?.slice(0, 3) || item.name.split(" ").slice(0, 2).map((part) => part[0]).join(""); }
function productClass(category) { return category === "SMAs" ? "sma" : category === "Fixed Income" ? "fixed" : category === "Equities" ? "equity" : ""; }
function productMark(item) {
  const fallback = `<span class="product-monogram-text">${escapeHtml(monogram(item))}</span>`;
  const logo = brandLogo(item.brandKey);
  if (!logo) return `<span class="product-monogram ${productClass(item.category)}" aria-hidden="true">${fallback}</span>`;
  return `<span class="product-monogram has-logo brand-${escapeHtml(item.brandKey)}" aria-hidden="true" title="${escapeHtml(logo.label)}">${fallback}<img class="product-logo" src="${escapeHtml(logo.src)}" alt="" width="22" height="22" loading="lazy" decoding="async"/></span>`;
}

function profileSlug(item) {
  return item?.canonicalSlug || (item?.id?.startsWith("syn-") ? item.id : item?.symbol || item?.id);
}

function profileHref(item) {
  return `/investment/${encodeURIComponent(profileSlug(item))}`;
}

function profileFromPath() {
  const match = location.pathname.match(/^\/investment\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

function householdFromPath() {
  const match = location.pathname.match(/^\/household\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

function proposalFromPath() {
  const match = location.pathname.match(/^\/proposal\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

function getSavedScreens() {
  const defaults = [
    { id: "default-1", name: "Tax-aware SMA shortlist", subtitle: "SMAs · Tax-Aware · Moderate risk", state: { category: "SMAs", flags: ["Tax-Aware"], risks: ["Moderate"], q: "" } },
    { id: "default-2", name: "Core portfolio building blocks", subtitle: "Equities & ETFs · CIO House View", state: { category: "ETFs", flags: ["CIO House View"], risks: [], q: "core" } },
  ];
  try {
    const stored = JSON.parse(localStorage.getItem("investment-screener-saves-v2"));
    if (!Array.isArray(stored)) return defaults;
    return stored.filter((screen) => screen && typeof screen.id === "string" && typeof screen.name === "string" && screen.state && typeof screen.state === "object").slice(0, 50);
  } catch { return defaults; }
}

function setSavedScreens(screens) {
  localStorage.setItem("investment-screener-saves-v2", JSON.stringify(screens.slice(0, 50)));
  el("savedCount").textContent = String(screens.length);
}

function getSavedInvestments() {
  try {
    const stored = JSON.parse(localStorage.getItem("investment-screener-investments-v1"));
    return Array.isArray(stored) ? stored.filter((item) => item && typeof item.id === "string" && typeof item.name === "string").slice(0, 50) : [];
  } catch { return []; }
}

function setSavedInvestments(items) {
  localStorage.setItem("investment-screener-investments-v1", JSON.stringify(items.slice(0, 50)));
}

function isInvestmentSaved(id) { return getSavedInvestments().some((item) => item.id === id); }

function toggleSavedInvestment(item) {
  const items = getSavedInvestments();
  const exists = items.some((candidate) => candidate.id === item.id);
  setSavedInvestments(exists ? items.filter((candidate) => candidate.id !== item.id) : [{ id: item.id, name: item.name, symbol: item.symbol, category: item.category }, ...items]);
  showToast(exists ? "Investment removed from saved" : "Investment saved in this browser");
  return !exists;
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => { toast.hidden = true; }, 2600);
}

function formatWealthCurrency(value, digits = 2) {
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
}

function wealthAllocationSvg(items) {
  const segments = items.map((item) => ({ ...item, value: Math.max(0, Number(item.value) || 0) })).filter((item) => item.value > 0);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "";
  let offset = 0;
  const summary = segments.map((item) => `${item.label} ${item.value}%`).join(", ");
  const rects = segments.map((item) => {
    const x = offset;
    offset += item.value;
    return `<rect x="${x}" y="0" width="${item.value}" height="8" fill="${WEALTH_ALLOCATION_COLORS[item.tone] || WEALTH_ALLOCATION_COLORS.slate}"><title>${escapeHtml(item.label)} · ${item.value}%</title></rect>`;
  }).join("");
  return `<svg width="100%" height="8" viewBox="0 0 ${total} 8" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(`Current allocation: ${summary}`)}">${rects}</svg>`;
}

function goalProgressMeter(goal) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
  return `<span class="goal-progress"><progress class="goal-progress-meter goal-progress-${escapeHtml(goal.tone)}" max="100" value="${progress}" aria-label="${escapeHtml(`${goal.name} funding progress`)}"></progress><small>${progress}%</small></span>`;
}

function bookPriorityMarkup(item) {
  const localPlan = getHouseholdPlanSummary(item.id);
  const planStatus = localPlan?.status || (item.planCount ? item.decisionStatus : null);
  const workflowStatus = planStatus ? `<span class="book-workflow-status">${escapeHtml(planStatus)}</span>` : "";
  if (item.priority) {
    const detail = String(item.priority.detail || "").replace(/\s+across\s+/i, " · ");
    return `<span class="book-attention-stack"><span class="book-priority book-priority-${escapeHtml(item.priority.tone)}"><i></i><span><strong title="${escapeHtml(item.priority.title)}">${escapeHtml(item.priority.title)}</strong><small><span class="book-priority-detail">${escapeHtml(detail)}</span>${workflowStatus}</small></span></span></span>`;
  }
  if (item.openDecisionCount) {
    return `<span class="book-attention-stack"><span class="book-priority-none"><strong>${item.openDecisionCount} open ${item.openDecisionCount === 1 ? "decision" : "decisions"}</strong><small><span>Relationship workflow active</span>${workflowStatus}</small></span></span>`;
  }
  return `<span class="book-attention-stack"><span class="book-priority-none">No material exception</span></span>`;
}

function renderAdvisorIdentity({ displayName, initials, workspaceLabel } = {}) {
  el("advisorAvatar").textContent = initials || "—";
  el("advisorName").textContent = displayName || "Advisor";
  el("advisorWorkspace").textContent = workspaceLabel || "Advisor workspace";
  el("advisorProfile").setAttribute("aria-label", workspaceLabel || "Advisor workspace");
}

function renderBookSummary(data) {
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

function renderBookRows() {
  const rows = state.bookItems.map((item) => `<tr data-book-household-row="${escapeHtml(item.id)}"><th><button type="button" class="book-household-link" data-household-id="${escapeHtml(item.id)}"><span class="book-avatar">${escapeHtml(item.initials)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.location)} · ${item.accountCount} accounts · ${escapeHtml(item.riskProfile)}${item.openDecisionCount ? ` · ${item.openDecisionCount} open` : ""}</small></span><b>›</b></button></th><td>${formatWealthCurrency(item.netWorth)}</td><td>${formatWealthCurrency(item.financialAssets)}</td><td><strong>${formatWealthCurrency(item.cash)}</strong><small>${item.cashPct.toFixed(1)}%</small></td><td class="${item.ytdReturn >= 0 ? "positive" : "negative"}">${item.ytdReturn >= 0 ? "+" : ""}${item.ytdReturn.toFixed(1)}%</td><td>${item.goalsOnTrack} / ${item.goalsTotal}</td><td>${bookPriorityMarkup(item)}</td></tr>`).join("");
  updateHtml(el("bookBody"), rows || `<tr><td colspan="7" class="book-empty"><strong>No households match this view</strong><span>Try another search or focus filter.</span></td></tr>`);
  el("bookResultCount").textContent = formatCount(state.bookTotal);
  el("bookLoadedCount").textContent = state.bookItems.length < state.bookTotal ? `${formatCount(state.bookItems.length)} shown` : `${formatCount(state.bookTotal)} shown`;
  el("bookLoadMoreWrap").hidden = state.bookNextCursor === null;
  const focusLabels = { all: "Prioritized across your book", decisions: "Relationships with open decisions", plans: "Relationships with plans in motion", priority: "Households with priority risk", cash: "Households with deployable cash", goals: "Households with goal reviews", upcoming: "Households with upcoming obligations", "held-away": "Relationships with held-away assets" };
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
    const data = await loadAdvisorBook({ advisorId: DEFAULT_ADVISOR_ID, q: state.bookQuery, focus: state.bookFocus, sort: state.bookSort, cursor: state.bookCursor, pageSize: 48, signal: controller.signal });
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
  if (state.householdScenario?.householdId && state.householdScenario.householdId !== householdId) {
    state.householdScenario = null;
    state.proposalCandidates.clear();
    document.body.classList.remove("proposal-mode-active");
    el("scenarioRibbon").hidden = true;
    renderProposalTray();
  }
  closeWealthDrawer({ restoreFocus: false });
  state.currentHouseholdId = householdId;
  state.decisionSummary = null;
  state.activeDecisionDetail = null;
  state.activeDecisionScenario = null;
  state.activeDecisionPlan = null;
  closeDecisionStudio({ restoreFocus: false });
  state.concentrationSearchIntent = null;
  resetWealthChart();
  renderHouseholdLoading(householdId);
  setWorkspaceView("wealth", { updateHistory, replaceHistory });
  try {
    const overview = await loadHouseholdOverview(householdId);
    if (request !== householdRequest || state.currentHouseholdId !== householdId) return;
    assignHouseholdOverview(overview);
    renderWealthWorkspace();
    hydrateDecisionSummary(householdId, request);
    document.title = `${HOUSEHOLD.name} | Advisor Workspace`;
    requestAnimationFrame(initializeWealthChart);
  } catch (error) {
    if (request !== householdRequest) return;
    updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar">!</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>Relationship unavailable</h1><p>${escapeHtml(error.message)}</p></div></div></div>`);
  }
}

async function hydrateDecisionSummary(householdId, request) {
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

function renderWealthWorkspace() {
  if (!HOUSEHOLD) return;
  renderAdvisorIdentity({ displayName: HOUSEHOLD.advisor, initials: HOUSEHOLD.advisorInitials, workspaceLabel: HOUSEHOLD.advisorWorkspace });
  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.kind === "concentration");
  const topHolding = HOUSEHOLD_HOLDINGS[0];
  const decisionByInsight = new Map((state.decisionSummary?.decisions || []).map((decision) => [decision.sourceInsightId, decision]));
  const openDecisionCount = state.decisionSummary?.openCount;
  updateHtml(el("wealthHeading"), `<div class="household-heading-left"><button type="button" class="household-book-back" data-workspace-view="book">← My Book</button><div class="household-identity"><span class="household-avatar" aria-hidden="true">${escapeHtml(HOUSEHOLD.initials)}</span><div><span class="eyebrow">TOTAL WEALTH · HOUSEHOLD</span><h1>${escapeHtml(HOUSEHOLD.name)}</h1><p>${escapeHtml(HOUSEHOLD.relationshipType)} · ${escapeHtml(HOUSEHOLD.location)} · ${HOUSEHOLD.accountCount} financial accounts</p></div><button class="household-profile-button" type="button" data-wealth-action="relationship">Relationship profile</button></div></div><div class="wealth-heading-meta"><div class="wealth-heading-status"><span>Illustrative household</span><strong>Updated ${escapeHtml(HOUSEHOLD.asOf)}</strong></div><div class="household-heading-actions"><button class="panel-action" type="button" data-wealth-action="meeting">Prepare meeting</button><button class="panel-action decision-count-button" type="button" data-wealth-action="decisions">Open decisions <b>${openDecisionCount ?? "—"}</b></button><button class="panel-action" type="button" data-wealth-action="timeline">Timeline</button></div></div>`);
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
  updateHtml(el("wealthInsights"), HOUSEHOLD_INSIGHTS.map((insight) => {
    const decision = decisionByInsight.get(insight.id);
    return `<button type="button" class="attention-item tone-${escapeHtml(insight.tone)}" data-wealth-insight="${escapeHtml(insight.id)}"><i aria-hidden="true"></i><span class="attention-copy"><small>${escapeHtml(insight.severity)}${decision ? ` · ${escapeHtml(getDecisionPlan(decision.id)?.status || decision.status)}` : ""}</small><strong>${escapeHtml(insight.title)}</strong><em>${escapeHtml(insight.detail)}</em></span><span class="attention-action">${decision ? "Decide" : escapeHtml(insight.actionLabel)} <b>›</b></span></button>`;
  }).join(""));
}

function wealthPointsForRange(range) {
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
}

async function initializeWealthChart() {
  if (wealthChart || state.workspaceView !== "wealth" || !state.currentHouseholdId) return;
  const container = el("wealthChart");
  try {
    const householdId = state.currentHouseholdId;
    const [library, history] = await Promise.all([loadCompareChartLibrary(), loadWealthHistory(householdId)]);
    if (state.workspaceView !== "wealth" || wealthChart || state.currentHouseholdId !== householdId) return;
    wealthHistory = history;
    wealthChart = library.createChart(container, {
      width: Math.max(640, container.clientWidth),
      height: 224,
      layout: { background: { type: library.ColorType.Solid, color: "#ffffff" }, textColor: "#787875", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10, attributionLogo: false },
      grid: { vertLines: { color: "#f3f3f0" }, horzLines: { color: "#ececea" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderColor: "#ddddda", fixLeftEdge: true, fixRightEdge: true, timeVisible: false, secondsVisible: false },
      crosshair: { mode: library.CrosshairMode.Normal, vertLine: { color: "#8c8c88", width: 1, labelBackgroundColor: "#171717" }, horzLine: { color: "#b8b8b4", width: 1, labelBackgroundColor: "#171717" } },
      localization: { priceFormatter: (value) => `$${Number(value).toFixed(2)}M` },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
    });
    wealthSeries = wealthChart.addSeries(library.AreaSeries, { lineColor: "#203f52", lineWidth: 2, topColor: "rgba(32, 63, 82, .18)", bottomColor: "rgba(32, 63, 82, .015)", priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 3 });
    wealthChartResizeObserver = new ResizeObserver(([entry]) => wealthChart?.resize(Math.max(640, Math.round(entry.contentRect.width)), 224));
    wealthChartResizeObserver.observe(container);
    drawWealthRange();
    el("wealthChartLoading").hidden = true;
  } catch (error) {
    el("wealthChartLoading").classList.add("error");
    el("wealthChartLoading").querySelector("p").textContent = "Household history is temporarily unavailable.";
  }
}

function investmentUrl() {
  const params = new URLSearchParams();
  if (state.householdScenario?.householdId === state.currentHouseholdId) params.set("householdId", state.currentHouseholdId);
  if (state.q) params.set("q", state.q);
  if (state.category !== "All") params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  if (state.sortExplicit || state.sort !== defaultSort(Boolean(state.q))) params.set("sort", state.sort);
  return params.size ? `/investments?${params}` : "/investments";
}

function proposalUrl(decisionId = state.proposal?.decisionId || state.householdScenario?.decisionId) {
  return decisionId ? `/proposal/${encodeURIComponent(decisionId)}` : "/";
}

function workspaceTitle(view = state.workspaceView) {
  if (view === "book") return "Advisor Workspace";
  if (view === "wealth") return `${HOUSEHOLD?.name || "Household"} | Advisor Workspace`;
  if (view === "proposal") return `${state.proposal?.householdName || HOUSEHOLD?.name || "Household"} Proposal | Advisor Workspace`;
  return "Investment Screener | Advisor Workspace";
}

function setWorkspaceView(view, { updateHistory = true, replaceHistory = false } = {}) {
  const next = ["book", "wealth", "investments", "proposal"].includes(view) ? view : "book";
  state.workspaceView = next;
  if (!['wealth', 'proposal'].includes(next) && el("decisionStudio") && !el("decisionStudio").hidden) closeDecisionStudio({ restoreFocus: false });
  el("bookView").hidden = next !== "book";
  el("wealthView").hidden = next !== "wealth";
  el("investmentView").hidden = next !== "investments";
  el("proposalView").hidden = next !== "proposal";
  document.body.dataset.workspace = next;
  document.querySelectorAll("[data-workspace-view]").forEach((button) => {
    const target = button.dataset.workspaceView;
    button.classList.toggle("active", target === "book" ? ["book", "wealth", "proposal"].includes(next) : target === next);
  });
  document.title = workspaceTitle(next);
  if (updateHistory && !profileFromPath()) {
    const href = next === "book" ? "/" : next === "wealth" && state.currentHouseholdId ? `/household/${encodeURIComponent(state.currentHouseholdId)}` : next === "proposal" ? proposalUrl() : investmentUrl();
    history[replaceHistory ? "replaceState" : "pushState"]({ workspaceView: next, householdId: state.currentHouseholdId }, "", href);
  }
  if (next === "book") {
    closeWealthDrawer({ restoreFocus: false });
    if (!state.bookLoaded) loadBook();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (next === "wealth") {
    if (HOUSEHOLD) requestAnimationFrame(initializeWealthChart);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (next === "investments") {
    ensureInvestmentWorkspaceLoaded();
    renderCompareTray();
    renderProposalTray();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    closeDrawer({ fromHistory: true });
    renderProposalBuilder();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function closeWealthDrawer({ restoreFocus = true } = {}) {
  wealthDrawerRequest += 1;
  el("wealthDrawer").classList.remove("open");
  el("wealthDrawer").setAttribute("aria-hidden", "true");
  el("wealthDrawerBackdrop").hidden = true;
  document.body.classList.remove("wealth-drawer-open");
  document.querySelector("main").inert = false;
  document.querySelector(".global-header").inert = false;
  if (restoreFocus) state.lastFocus?.focus?.();
}

function policyTrackSvg(review) {
  const maximum = Math.max(30, Math.ceil(review.holding.weight / 5) * 5);
  const current = Math.min(maximum, review.holding.weight);
  const target = Math.min(maximum, review.targetWeight);
  return `<svg class="policy-track-svg" viewBox="0 0 ${maximum} 8" preserveAspectRatio="none" role="img" aria-label="Current ${review.holding.weight.toFixed(1)} percent versus ${review.targetWeight.toFixed(1)} percent target"><rect x="0" y="2" width="${maximum}" height="4" fill="#ececea"></rect><rect x="0" y="2" width="${current}" height="4" fill="#b51f35"></rect><line x1="${target}" y1="0" x2="${target}" y2="8" stroke="#111" stroke-width="0.5"></line></svg>`;
}

function concentrationDrawer(review) {
  state.concentrationSearchIntent = review.searchIntent;
  const accountLabel = `${review.accounts.length} ${review.accounts.length === 1 ? "account" : "accounts"}`;
  const basisPct = review.costBasis > 0 ? Math.round(review.unrealizedGain / review.costBasis * 100) : null;
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">PORTFOLIO RISK · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>${backLabel("Back to Total Wealth")}</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close concentration review">×</button></header>
    <div class="wealth-drawer-body">
      <section class="concentration-hero"><div class="concentration-name">${productMark({ ...review.holding, category: "Equities" })}<div><span>Single-position concentration</span><h2 id="wealthDrawerTitle">${escapeHtml(review.holding.name)}</h2><p>${escapeHtml(review.holding.symbol)} · Across ${escapeHtml(accountLabel)}</p></div></div><div class="concentration-status"><span>Above policy</span><strong>${review.holding.weight.toFixed(1)}%</strong><small>${review.targetWeight.toFixed(0)}% household target</small></div></section>
      <section class="concentration-metrics" aria-label="Concentration summary"><div><span>Market value</span><strong>${formatWealthCurrency(review.holding.value)}</strong><small>Largest household position</small></div><div><span>Unrealized gain</span><strong>${formatWealthCurrency(review.unrealizedGain)}</strong><small>${basisPct === null ? "Cost basis unavailable" : `${basisPct}% above cost basis`}</small></div><div><span>Risk contribution</span><strong>${review.riskContribution === null ? "—" : `${review.riskContribution}%`}</strong><small>Of modeled equity risk</small></div><div><span>Target release</span><strong>${formatWealthCurrency(review.targetRelease)}</strong><small>To reach ${review.targetWeight.toFixed(0)}% target</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>Exposure</span><h3>Position relative to policy</h3></div><div class="policy-track">${policyTrackSvg(review)}</div><div class="policy-scale"><span>0%</span><span>${review.targetWeight.toFixed(0)}% household target</span><span>${Math.max(30, Math.ceil(review.holding.weight / 5) * 5)}%</span></div></section>
      <section class="concentration-section"><div class="section-heading"><span>Ownership</span><h3>Where the exposure sits</h3><p>Account location and unrealized gains shape implementation choices.</p></div><table class="concentration-table"><thead><tr><th>Account</th><th>Market value</th><th>Account weight</th><th>Unrealized gain</th></tr></thead><tbody>${review.accounts.map((account) => `<tr><th>${escapeHtml(account.name)}<small>${escapeHtml(account.registration)}</small></th><td>${formatWealthCurrency(account.value)}</td><td>${account.weight.toFixed(1)}%</td><td>${formatWealthCurrency(account.gain)}</td></tr>`).join("")}</tbody></table></section>
      <section class="concentration-section scenario-impact"><div class="section-heading"><span>Decision support</span><h3>Illustrative household impact</h3></div><table class="concentration-table"><thead><tr><th>Scenario</th><th>Position impact</th><th>Portfolio impact</th></tr></thead><tbody>${review.scenarios.map((scenario) => `<tr><th>${escapeHtml(scenario.name)}</th><td>${escapeHtml(scenario.holdingMove)}</td><td>${escapeHtml(scenario.portfolioMove)}</td></tr>`).join("")}</tbody></table></section>
      <section class="concentration-research"><div><span>UPS RESEARCH · ${escapeHtml(review.research.reviewed)}</span><strong>${escapeHtml(review.research.status)}</strong><p>${escapeHtml(review.research.summary)}</p></div><button type="button" class="secondary-button" data-open-modal="researchModal">View research context</button></section>
      ${review.searchIntent ? `<section class="concentration-next"><div><span class="panel-kicker">NEXT STEP</span><h3>Explore implementation paths</h3><p>Carry the objective—not hidden client data—into the investment shelf.</p></div><button type="button" class="primary-button" data-household-scenario="concentration">${escapeHtml(review.searchIntent.title)} →</button></section>` : ""}
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
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">${escapeHtml(item.eyebrow)}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>${backLabel("Back to Total Wealth")}</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p><div class="operational-rows">${item.rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p></div>`;
}

function accountMix(account) {
  return `<div class="account-allocation-bar" aria-label="${escapeHtml(account.name)} allocation">${wealthAllocationSvg(account.mix)}</div><div class="account-allocation-legend">${account.mix.map((item) => `<div><i class="tone-${escapeHtml(item.tone)}"></i><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong></div>`).join("")}</div>`;
}

function accountsDrawer() {
  const heldAway = HOUSEHOLD_ACCOUNTS.filter((account) => account.custodyType === "held-away").reduce((sum, account) => sum + account.value, 0);
  const cash = HOUSEHOLD_ACCOUNTS.reduce((sum, account) => sum + account.cash, 0);
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">OWNERSHIP · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>${backLabel("Back to Total Wealth")}</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close account overview">×</button></header>
    <div class="wealth-drawer-body account-review">
      <section class="account-review-hero"><div><span>HOUSEHOLD ACCOUNTS</span><h2 id="wealthDrawerTitle">${formatWealthCurrency(HOUSEHOLD.financialAssets)} across ${HOUSEHOLD.accountCount} accounts</h2><p>Custodied and connected assets consolidated into one household view.</p></div></section>
      <section class="account-review-metrics"><div><span>Custodied assets</span><strong>${formatWealthCurrency(HOUSEHOLD.financialAssets - heldAway)}</strong><small>${HOUSEHOLD.custodiedCount} custodied relationships</small></div><div><span>Held away</span><strong>${formatWealthCurrency(heldAway)}</strong><small>${HOUSEHOLD.heldAwayCount} connected accounts</small></div><div><span>Available cash</span><strong>${formatWealthCurrency(cash)}</strong><small>Across all registrations</small></div><div><span>As of</span><strong>${escapeHtml(HOUSEHOLD.asOf)}</strong><small>Household reporting timestamp</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>ACCOUNT MAP</span><h3>Ownership and purpose</h3><p>Select an account to review allocation, holdings and operational status.</p></div><table class="concentration-table account-map-table"><thead><tr><th>Account</th><th>Registration</th><th>Value</th><th>YTD</th></tr></thead><tbody>${HOUSEHOLD_ACCOUNTS.map((account) => `<tr><th><button type="button" class="drawer-table-link" data-wealth-account="${escapeHtml(account.id)}">${escapeHtml(account.name)} <span>›</span></button></th><td>${escapeHtml(account.registration)}</td><td>${formatWealthCurrency(account.value)}</td><td class="${account.change >= 0 ? "positive" : "negative"}">${account.change >= 0 ? "+" : ""}${account.change.toFixed(1)}%</td></tr>`).join("")}</tbody></table></section>
      <p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p>
    </div>`;
}

function accountDrawer(account) {
  if (!account) return accountsDrawer();
  const holdings = account.holdings.length
    ? `<table class="concentration-table account-holdings-table"><thead><tr><th>Holding</th><th>Market value</th><th>Account weight</th></tr></thead><tbody>${account.holdings.map((holding) => `<tr><th><div class="wealth-holding">${productMark({ ...holding, category: "Equities" })}<span><strong>${escapeHtml(holding.symbol)}</strong><small>${escapeHtml(holding.name)}</small></span></div></th><td>${formatWealthCurrency(holding.value)}</td><td>${holding.weight.toFixed(1)}%</td></tr>`).join("")}</tbody></table>`
    : `<div class="account-empty-holdings"><strong>Position-level feed summarized</strong><span>This connected account contributes to household allocation and planning without exposing underlying positions in the prototype.</span></div>`;
  const holdingsLabel = account.holdingsTotal > account.holdings.length ? `Showing ${account.holdings.length} of ${account.holdingsTotal} positions` : `${account.holdingsTotal} ${account.holdingsTotal === 1 ? "position" : "positions"}`;
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">ACCOUNT · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-wealth-action="accounts">${backLabel("All accounts")}</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close account detail">×</button></header>
    <div class="wealth-drawer-body account-review">
      <section class="account-detail-hero"><div><span>${escapeHtml(account.registration)}</span><h2 id="wealthDrawerTitle">${escapeHtml(account.name)}</h2><p>${escapeHtml(account.purpose)} · ${escapeHtml(account.program)}</p></div><div><span>Current value</span><strong>${formatWealthCurrency(account.value)}</strong><small class="${account.change >= 0 ? "positive" : "negative"}">${account.change >= 0 ? "+" : ""}${account.change.toFixed(1)}% YTD</small></div></section>
      <section class="account-review-metrics"><div><span>Available cash</span><strong>${formatWealthCurrency(account.cash)}</strong><small>${(account.cash / account.value * 100).toFixed(1)}% of account</small></div><div><span>Tax treatment</span><strong>${escapeHtml(account.taxTreatment)}</strong><small>Registration-level view</small></div><div><span>Unrealized gain</span><strong>${account.unrealizedGain ? formatWealthCurrency(account.unrealizedGain) : "—"}</strong><small>${account.unrealizedGain ? "Illustrative tax lot basis" : "Not available"}</small></div><div><span>Last reconciled</span><strong>${escapeHtml(account.lastReconciled || "Not provided")}</strong><small>${escapeHtml(account.sourceSystem || "Source not provided")}</small></div></section>
      <section class="concentration-section"><div class="section-heading"><span>ALLOCATION</span><h3>${escapeHtml(account.allocation)} portfolio</h3></div>${accountMix(account)}</section>
      <section class="concentration-section"><div class="section-heading"><span>EXPOSURE</span><h3>Largest positions</h3><p>${escapeHtml(holdingsLabel)} · Position detail is shown when available from the connected source.</p></div>${holdings}</section>
      <section class="account-data-strip"><div><span>Service model</span><strong>${escapeHtml(account.program)}</strong></div><div><span>Primary purpose</span><strong>${escapeHtml(account.purpose)}</strong></div><div><span>Custody</span><strong>${escapeHtml(account.custodyType === "held-away" ? "Held away" : "Custodied")}</strong></div></section>
      <p class="wealth-disclosure">Illustrative household data · Not for investment decisions.</p>
    </div>`;
}

function goalDrawer(goal) {
  if (!goal) return operationalDrawer("relationship");
  const gap = Math.max(0, goal.target - goal.funded);
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">PLANNING · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>${backLabel("Back to Total Wealth")}</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close goal review">×</button></header>
    <div class="wealth-drawer-body goal-review">
      <section class="goal-review-hero"><div><span>${escapeHtml(goal.timing)}</span><h2 id="wealthDrawerTitle">${escapeHtml(goal.name)}</h2><p>${escapeHtml(goal.action)}</p></div><em class="goal-${escapeHtml(goal.tone)}">${escapeHtml(goal.status)}</em></section>
      <section class="goal-funding"><div class="goal-funding-heading"><div><span>Funded</span><strong>${formatWealthCurrency(goal.funded)}</strong></div><div><span>Target</span><strong>${formatWealthCurrency(goal.target)}</strong></div></div><progress class="goal-funding-track goal-progress-${escapeHtml(goal.tone)}" max="100" value="${Math.max(0, Math.min(100, Number(goal.progress) || 0))}" aria-label="${escapeHtml(`${goal.name} funding progress`)}"></progress><div class="goal-funding-scale"><span>${goal.progress}% funded</span><span>${gap ? `${formatWealthCurrency(gap)} remaining` : "Target funded"}</span></div></section>
      <section class="account-review-metrics goal-review-metrics"><div><span>Plan confidence</span><strong>${goal.confidence}%</strong><small>Illustrative planning model</small></div><div><span>Annual funding</span><strong>${goal.annualFunding ? formatWealthCurrency(goal.annualFunding) : "Fully funded"}</strong><small>Current scheduled amount</small></div><div><span>Responsibility</span><strong>${escapeHtml(goal.owner)}</strong><small>Goal ownership</small></div><div><span>Next review</span><strong>${escapeHtml(goal.nextReview)}</strong><small>Planning calendar</small></div></section>
      <section class="goal-next-step"><span>NEXT ADVISOR ACTION</span><strong>${escapeHtml(goal.action)}</strong><small>Planning assumptions and values are illustrative.</small></section>
      <p class="wealth-disclosure">Illustrative household and planning data · Not for investment decisions.</p>
    </div>`;
}

function wealthDrawerLoading() {
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD DETAIL</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">Loading household detail…</h2><p>Retrieving only the data needed for this view.</p></div>`;
}

function formatDecisionDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : chartDate.format(date);
}

function decisionListDrawer(summary) {
  const decisions = (summary?.decisions || []).filter((decision) => decision.status !== "Complete");
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD WORKFLOW · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close decisions">×</button></header><div class="wealth-drawer-body decision-list-drawer"><div class="drawer-section-heading"><span class="panel-kicker">OPEN DECISIONS</span><h2 id="wealthDrawerTitle">${summary?.openCount || 0} active across this relationship</h2><p>Each item is grounded in a household signal and can be modeled before anything moves toward implementation.</p></div><div class="decision-list">${decisions.map((decision) => { const plan = getDecisionPlan(decision.id); return `<button type="button" class="decision-list-item tone-${escapeHtml(decision.tone)}" data-decision-open="${escapeHtml(decision.id)}"><i></i><span><small>${escapeHtml(decision.priority)} · ${escapeHtml(plan?.status || decision.status)}</small><strong>${escapeHtml(decision.title)}</strong><em>${escapeHtml(decision.evidenceSummary)}</em></span><b>›</b></button>`; }).join("") || `<div class="drawer-empty">No open decisions for this household.</div>`}</div></div>`;
}

function meetingBriefDrawer(data) {
  const decisionRows = (data.openDecisions || []).map((decision) => `<button type="button" class="meeting-decision" data-decision-open="${escapeHtml(decision.id)}"><span><strong>${escapeHtml(decision.title)}</strong><small>${escapeHtml(decision.evidenceSummary)}</small></span><em>${escapeHtml(getDecisionPlan(decision.id)?.status || decision.status)}</em></button>`).join("");
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">MEETING PREP · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close meeting brief">×</button></header><div class="wealth-drawer-body meeting-brief"><div class="drawer-section-heading"><span class="panel-kicker">RELATIONSHIP BRIEF</span><h2 id="wealthDrawerTitle">Prepare the conversation</h2><p>${escapeHtml(data.household.members.join(" · "))} · Last planning review ${escapeHtml(data.household.lastPlanningReview)}</p></div><section><h3>Current household</h3><div class="meeting-metric-grid">${data.changes.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${typeof item.value === "number" ? formatSignedWealthCurrency(item.value) : escapeHtml(item.value)}</strong></div>`).join("")}</div></section><section><h3>Open decisions</h3><div class="meeting-decision-list">${decisionRows || `<p class="drawer-empty">No active decisions.</p>`}</div></section><section><h3>Upcoming</h3><div class="meeting-copy-list">${(data.upcoming || []).map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`).join("") || `<p class="drawer-empty">No material upcoming obligations.</p>`}</div></section><section><h3>Recent relationship activity</h3><div class="meeting-copy-list">${(data.recentActivity || []).slice(0, 5).map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${formatDecisionDate(item.occurredAt)} · ${escapeHtml(item.detail)}</span></div>`).join("")}</div></section></div>`;
}

function timelineDrawer(events) {
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">RELATIONSHIP HISTORY · ${escapeHtml(HOUSEHOLD.name.toUpperCase())}</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close timeline">×</button></header><div class="wealth-drawer-body relationship-timeline"><div class="drawer-section-heading"><span class="panel-kicker">HOUSEHOLD TIMELINE</span><h2 id="wealthDrawerTitle">What changed and when</h2><p>Planning, portfolio and decision events from the same household model.</p></div><ol>${(events || []).map((event) => `<li><i class="timeline-${escapeHtml(event.type)}"></i><div><span>${formatDecisionDate(event.occurredAt)} · ${escapeHtml(event.source)}</span>${event.decisionId ? `<button type="button" data-decision-open="${escapeHtml(event.decisionId)}"><strong>${escapeHtml(event.title)}</strong></button>` : `<strong>${escapeHtml(event.title)}</strong>`}<p>${escapeHtml(event.detail)}</p></div></li>`).join("")}</ol></div>`;
}

function wealthDrawerError(error) {
  return `<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD DETAIL</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">Household detail unavailable</h2><p>${escapeHtml(error.message || "Unable to load household detail")}</p></div>`;
}

async function openWealthDrawer(id) {
  const request = ++wealthDrawerRequest;
  state.lastFocus = document.activeElement;
  let html = null;
  let detailRequest = null;
  if (id === "concentration") detailRequest = loadConcentrationReview(state.currentHouseholdId).then((review) => review ? concentrationDrawer(review) : operationalDrawer("relationship"));
  else if (id === "decisions") detailRequest = loadDecisionSummary(state.currentHouseholdId).then(decisionListDrawer);
  else if (id === "meeting") detailRequest = loadMeetingBrief(state.currentHouseholdId).then(meetingBriefDrawer);
  else if (id === "timeline") detailRequest = loadHouseholdTimeline(state.currentHouseholdId).then(timelineDrawer);
  else if (id === "accounts") html = accountsDrawer();
  else if (id.startsWith("account:")) detailRequest = loadHouseholdAccount(id.slice(8), state.currentHouseholdId).then(accountDrawer);
  else if (id.startsWith("goal:")) detailRequest = loadHouseholdGoal(id.slice(5), state.currentHouseholdId).then(goalDrawer);
  else html = operationalDrawer(id);

  el("wealthDrawerContent").innerHTML = html || wealthDrawerLoading();
  el("wealthDrawerBackdrop").hidden = false;
  el("wealthDrawer").classList.add("open");
  el("wealthDrawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("wealth-drawer-open");
  document.querySelector("main").inert = true;
  document.querySelector(".global-header").inert = true;
  requestAnimationFrame(() => el("wealthDrawer").querySelector("[data-close-wealth-drawer]")?.focus());
  if (!detailRequest) return;

  try {
    const resolved = await detailRequest;
    if (request !== wealthDrawerRequest || !el("wealthDrawer").classList.contains("open")) return;
    el("wealthDrawerContent").innerHTML = resolved;
    requestAnimationFrame(() => el("wealthDrawer").querySelector("[data-close-wealth-drawer]")?.focus());
  } catch (error) {
    if (request !== wealthDrawerRequest || !el("wealthDrawer").classList.contains("open")) return;
    el("wealthDrawerContent").innerHTML = wealthDrawerError(error);
  }
}

function decisionValue(value, label = "") {
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
    return `<div class="decision-control-stack"><label class="decision-control decision-control-primary"><span><strong>Target concentration</strong><em data-decision-value="targetWeight">${decisionPercent(inputs.targetWeight)}</em></span><input type="range" data-decision-input="targetWeight" min="${bounds.targetWeight.min}" max="${bounds.targetWeight.max}" step="${bounds.targetWeight.step}" value="${inputs.targetWeight}" /><small>Move the position to a different household weight. Nothing is executed.</small></label>${detail.relatedGoal ? decisionMoneyControl("goalFunding", `Earmark for ${detail.relatedGoal.name}`, inputs.goalFunding, bounds.goalFunding, "Optional. This changes the modeled goal funding path.") : ""}${decisionMoneyControl("redeployAmount", "Redeploy into diversified US equity", inputs.redeployAmount, { ...bounds.redeployAmount, max: scenario.economics.release }, "This amount becomes the explicit implementation objective passed into Investments.")}<div class="decision-assumption-inputs"><label><span>Single-stock stress</span><div><input type="number" data-decision-input="stressDrop" min="10" max="60" step="5" value="${inputs.stressDrop}" /><em>%</em></div></label></div></div>`;
  }
  if (detail.decision.kind === "liquidity") return `<div class="decision-control-stack">${decisionMoneyControl("deployAmount", "Amount to deploy", inputs.deployAmount, bounds.deployAmount, "Leaves the modeled reserve in cash.")}<label class="decision-control compact"><span><strong>Working cash reserve</strong><em data-decision-value="reservePct">${decisionPercent(inputs.reservePct)}</em></span><input type="range" data-decision-input="reservePct" min="${bounds.reservePct.min}" max="${bounds.reservePct.max}" step="${bounds.reservePct.step}" value="${inputs.reservePct}" /></label></div>`;
  if (detail.decision.kind === "goal-funding") return `<div class="decision-control-stack">${decisionMoneyControl("fundingAmount", `Fund ${detail.relatedGoal?.name || "goal"}`, inputs.fundingAmount, bounds.fundingAmount, "Uses current household cash and updates only this goal's explicit funded amount.")}</div>`;
  if (detail.decision.kind === "allocation") return `<div class="decision-control-stack">${decisionMoneyControl("allocationAmount", "Amount to municipal allocation", inputs.allocationAmount, bounds.allocationAmount, "Uses household cash to move toward the documented target.")}</div>`;
  return `<div class="decision-control-stack">${decisionMoneyControl("fundingAmount", "Funding amount", inputs.fundingAmount, bounds.fundingAmount, "Uses currently available household cash.")}</div>`;
}

function decisionScenarioOutcomes(detail, scenario) {
  if (detail.decision.kind === "concentration") {
    const goalOutcome = scenario.before.goalProgress === null ? "" : decisionOutcome(detail.relatedGoal?.name || "Goal funding", scenario.before.goalProgress, scenario.after.goalProgress, (value) => decisionPercent(value));
    return `<div class="decision-outcome-grid">${decisionOutcome("Concentration", scenario.before.concentrationPct, scenario.after.concentrationPct, (value) => decisionPercent(value))}${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("US equity", scenario.before.usEquityPct, scenario.after.usEquityPct, (value) => decisionPercent(value))}${decisionOutcome("Single-stock stress loss", scenario.before.stressLoss, scenario.after.stressLoss)}${goalOutcome}</div><div class="decision-economics"><div><span>Position value released</span><strong>${formatWealthCurrency(scenario.economics.release)}</strong></div><div><span>Estimated realized gain</span><strong>${formatWealthCurrency(scenario.economics.realizedGain)}</strong></div><div><span>Tax liability</span><strong>Not modeled</strong></div><div><span>Implementation amount</span><strong>${formatWealthCurrency(scenario.economics.redeployAmount)}</strong></div></div>`;
  }
  if (detail.decision.kind === "liquidity") return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("Cash weight", scenario.before.cashPct, scenario.after.cashPct, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Amount to deploy</span><strong>${formatWealthCurrency(scenario.economics.deployAmount)}</strong></div><div><span>Modeled reserve</span><strong>${formatWealthCurrency(scenario.economics.reserveAmount)}</strong></div></div>`;
  if (detail.decision.kind === "goal-funding") return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome(detail.relatedGoal?.name || "Goal progress", scenario.before.goalProgress, scenario.after.goalProgress, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Funding amount</span><strong>${formatWealthCurrency(scenario.economics.fundingAmount)}</strong></div><div><span>Remaining gap</span><strong>${formatWealthCurrency(scenario.economics.remainingGap)}</strong></div></div>`;
  if (detail.decision.kind === "allocation") return `<div class="decision-outcome-grid">${decisionOutcome("Municipal allocation", scenario.before.allocationPct, scenario.after.allocationPct, (value) => decisionPercent(value))}${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}</div><div class="decision-economics"><div><span>Implementation amount</span><strong>${formatWealthCurrency(scenario.economics.allocationAmount)}</strong></div><div><span>Target allocation</span><strong>${decisionPercent(scenario.economics.targetPct)}</strong></div></div>`;
  return `<div class="decision-outcome-grid">${decisionOutcome("Household cash", scenario.before.cash, scenario.after.cash)}${decisionOutcome("Obligation covered", scenario.before.obligationCoveredPct, scenario.after.obligationCoveredPct, (value) => decisionPercent(value))}</div><div class="decision-economics"><div><span>Funding amount</span><strong>${formatWealthCurrency(scenario.economics.fundingAmount)}</strong></div><div><span>Remaining obligation</span><strong>${formatWealthCurrency(scenario.economics.remainingObligation)}</strong></div></div>`;
}

function decisionPlanMarkup(detail, plan) {
  if (!plan) return `<div class="decision-plan-empty"><span class="panel-kicker">ACTION PLAN</span><h3>Turn the scenario into work</h3><p>Capture the intended path, then track it across client discussion and implementation.</p><button type="button" class="primary-button" data-decision-build-plan>Build plan</button></div>`;
  const statuses = ["Plan drafted", "Proposal in progress", "Ready for client", "Client discussion", "Client approved", "In progress", "Complete"];
  const proposal = getProposal(detail.decision.id);
  const candidateMarkup = plan.candidates.length ? `<div class="decision-candidates"><span>Implementation candidates</span>${plan.candidates.map((candidate) => `<div><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.category)}${candidate.symbol ? ` · ${escapeHtml(candidate.symbol)}` : ""}</small></div>`).join("")}</div>` : "";
  const proposalMarkup = proposal ? `<button type="button" class="decision-proposal-card" data-open-proposal="${escapeHtml(proposal.decisionId)}"><span><small>CLIENT PROPOSAL · ${escapeHtml(proposal.status.toUpperCase())}</small><strong>${formatWealthCurrency(proposal.totalAmount)} proposed change</strong><em>${proposal.candidates.length} selected ${proposal.candidates.length === 1 ? "solution" : "solutions"}</em></span><b>Open proposal →</b></button>` : "";
  return `<div class="decision-plan-active"><div class="decision-plan-heading"><div><span class="panel-kicker">ACTION PLAN</span><h3>${escapeHtml(plan.title)}</h3></div><label>Status<select data-decision-plan-status>${statuses.map((status) => `<option value="${status}"${status === plan.status ? " selected" : ""}>${status}</option>`).join("")}</select></label></div>${proposalMarkup}<div class="decision-plan-steps">${plan.steps.map((step) => `<button type="button" class="${step.complete ? "complete" : ""}" data-decision-plan-step="${escapeHtml(step.id)}"><i>${step.complete ? "✓" : ""}</i><span>${escapeHtml(step.title)}</span></button>`).join("")}</div>${candidateMarkup}</div>`;
}

function renderDecisionStudio() {
  const detail = state.activeDecisionDetail;
  const scenario = state.activeDecisionScenario;
  if (!detail || !scenario) return;
  const plan = state.activeDecisionPlan || getDecisionPlan(detail.decision.id);
  state.activeDecisionPlan = plan;
  const status = plan?.status || detail.decision.status;
  const implementation = scenario.implementation;
  const implementationCard = implementation?.enabled ? `<section class="decision-implementation"><span class="proposal-step-kicker">STEP 1 OF 3 · DEFINE THE CHANGE</span><h3>${escapeHtml(implementation.objective)}</h3><div class="decision-funding-envelope"><span>AVAILABLE TO REDEPLOY</span><strong>${formatWealthCurrency(implementation.amount)}</strong><small>Explicit implementation mandate from this scenario</small></div><div>${implementation.tags.slice(1, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div><button type="button" class="primary-button" data-decision-implement>Find investments for proposal <span aria-hidden="true">→</span></button><p>Research and select solutions for a client proposal. Every criterion remains visible and editable.</p></section>` : `<section class="decision-implementation muted"><span class="panel-kicker">IMPLEMENTATION</span><h3>No investment search required yet</h3><p>This scenario is currently about household funding or workflow rather than selecting a product.</p></section>`;
  updateHtml(el("decisionStudioContent"), `<header class="decision-studio-header"><button type="button" class="decision-back" data-close-decision-studio>← ${escapeHtml(HOUSEHOLD.name)}</button><div><span class="eyebrow">DECISION STUDIO · ${escapeHtml(detail.decision.priority.toUpperCase())}</span><h2 id="decisionStudioTitle">${escapeHtml(detail.decision.title)}</h2><p>${escapeHtml(detail.decision.objective)}</p></div><span class="decision-status">${escapeHtml(status)}</span><button type="button" class="decision-close" data-close-decision-studio aria-label="Close decision studio">×</button></header><div class="decision-studio-body"><aside class="decision-facts"><div class="decision-signal tone-${escapeHtml(detail.decision.tone)}"><span>${escapeHtml(detail.evidence.severity)}</span><strong>${escapeHtml(detail.evidence.title)}</strong><p>${escapeHtml(detail.evidence.detail)}</p><small>${escapeHtml(detail.evidence.source)}</small></div><section><span class="panel-kicker">WHAT WE KNOW</span><div class="decision-fact-list">${detail.facts.map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${decisionValue(fact.value, fact.label)}</strong></div>`).join("")}</div></section><section class="decision-assumptions"><span class="panel-kicker">MODEL ASSUMPTIONS</span>${scenario.assumptions.map((assumption) => `<p>${escapeHtml(assumption)}</p>`).join("")}</section></aside><main class="decision-model"><div class="decision-model-heading"><span class="panel-kicker">WHAT COULD CHANGE</span><h3>Model the household consequence</h3><p>Adjust only explicit assumptions. The resulting changes are calculated from this household's current data.</p></div>${decisionScenarioControls(detail, scenario)}<div class="decision-consequence-heading"><span class="panel-kicker">HOUSEHOLD CONSEQUENCE</span><h3>Before and after</h3></div>${decisionScenarioOutcomes(detail, scenario)}</main><aside class="decision-plan-column">${implementationCard}${decisionPlanMarkup(detail, plan)}</aside></div>`);
}

function closeDecisionStudio({ restoreFocus = true } = {}) {
  decisionRequest += 1;
  state.decisionController?.abort();
  state.decisionController = null;
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
  state.decisionController?.abort();
  const controller = new AbortController();
  state.decisionController = controller;
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
    const detail = await loadDecisionDetail(decisionId, state.currentHouseholdId, { signal: controller.signal });
    if (request !== decisionRequest || controller !== state.decisionController) return;
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
  state.q = scenario.q || scenario.query || "";
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

function proposalImpactFromScenario(detail, scenario) {
  const impact = {};
  const add = (key, label, before, after, format = "currency") => {
    if (before === null || before === undefined || after === null || after === undefined) return;
    impact[key] = { label, before, after, format };
  };
  if (detail.decision.kind === "concentration") {
    add("concentration", "Largest position", scenario.before.concentrationPct, scenario.after.concentrationPct, "percent");
    add("cash", "Household cash", scenario.before.cash, scenario.after.cash);
    add("cashWeight", "Cash allocation", scenario.before.cashPct, scenario.after.cashPct, "percent");
    add("usEquity", "US equity allocation", scenario.before.usEquityPct, scenario.after.usEquityPct, "percent");
  } else if (detail.decision.kind === "liquidity") {
    add("cash", "Household cash", scenario.before.cash, scenario.after.cash);
    add("cashWeight", "Cash weight", scenario.before.cashPct, scenario.after.cashPct, "percent");
  } else if (detail.decision.kind === "allocation") {
    add("allocation", "Municipal allocation", scenario.before.allocationPct, scenario.after.allocationPct, "percent");
    add("cash", "Household cash", scenario.before.cash, scenario.after.cash);
  }
  return impact;
}

function launchDecisionImplementation() {
  const detail = state.activeDecisionDetail;
  const scenario = state.activeDecisionScenario;
  if (!detail || !scenario?.implementation?.enabled) return;
  if (!getDecisionPlan(detail.decision.id)) {
    state.activeDecisionPlan = saveDecisionPlan({ decision: detail.decision, householdId: state.currentHouseholdId, steps: detail.planTemplate, implementationAmount: scenario.implementation.amount });
  }
  const implementation = scenario.implementation;
  state.compare.clear();
  state.proposalCandidates.clear();
  const existingProposal = getProposal(detail.decision.id);
  for (const candidate of existingProposal?.candidates || []) state.proposalCandidates.set(candidate.id, candidate);
  renderCompareTray();
  closeDecisionStudio({ restoreFocus: false });
  launchInvestmentContext({
    source: "CLIENT PROPOSAL · STEP 2 OF 3",
    title: `Select investments for ${HOUSEHOLD.name}`,
    tags: [formatWealthCurrency(implementation.amount), ...implementation.tags.slice(1)],
    category: implementation.category,
    q: implementation.query,
    flags: implementation.flags,
    risks: implementation.risks,
    decisionId: detail.decision.id,
    implementationAmount: implementation.amount,
    proposalMode: true,
    decisionTitle: detail.decision.title,
    objective: detail.decision.objective,
    sourceLabel: detail.decision.kind === "concentration" ? `${String(detail.facts.find((fact) => fact.label === "Position")?.value || "Position").split(" · ")[0]} reduction` : implementation.objective,
    sourceValue: detail.evidence.title,
    impact: proposalImpactFromScenario(detail, scenario),
  });
}

async function returnFromInvestmentContext() {
  const context = state.householdScenario;
  if (!context?.householdId) return;
  await openHousehold(context.householdId);
}

function openPrimaryConcentrationDecision() {
  const decision = state.decisionSummary?.decisions?.find((item) => item.kind === "concentration");
  if (decision) openDecisionInScreener(decision.id);
  else openWealthDrawer("concentration");
}

async function openDecisionInScreener(decisionId) {
  if (!state.currentHouseholdId) return;
  const request = ++decisionRequest;
  state.decisionController?.abort();
  const controller = new AbortController();
  state.decisionController = controller;
  closeWealthDrawer({ restoreFocus: false });
  showToast("Preparing investment mandate…");
  try {
    const detail = await loadDecisionDetail(decisionId, state.currentHouseholdId, { signal: controller.signal });
    if (request !== decisionRequest || controller !== state.decisionController) return;
    const scenario = await modelDecisionScenario(decisionId, state.currentHouseholdId, detail.model.defaults, { signal: controller.signal });
    if (request !== decisionRequest) return;
    state.activeDecisionDetail = detail;
    state.activeDecisionScenario = scenario;
    state.activeDecisionPlan = getDecisionPlan(decisionId);
    launchDecisionImplementation();
  } catch (error) {
    if (error.name !== "AbortError") showToast("Unable to prepare this investment mandate");
  }
}

function scenarioAmountOptions(scenario, detail) {
  const bounds = detail?.model?.bounds || {};
  const maximum = Number(bounds.redeployAmount?.max || bounds.deployAmount?.max || bounds.allocationAmount?.max || scenario?.economics?.release || scenario?.implementation?.amount || 0);
  const current = Number(scenario?.implementation?.amount || 0);
  return [...new Set([750_000, 1_000_000, current, maximum].map((value) => Math.min(maximum, Math.max(0, Math.round(value / 5000) * 5000))).filter(Boolean))].sort((a, b) => a - b);
}

function scenarioAmountKey(detail) {
  if (detail?.decision?.kind === "liquidity") return "deployAmount";
  if (detail?.decision?.kind === "allocation") return "allocationAmount";
  return "redeployAmount";
}

function renderScenarioMandate() {
  const container = el("scenarioMandate");
  const scenario = state.activeDecisionScenario;
  const detail = state.activeDecisionDetail;
  if (!container || !state.householdScenario?.proposalMode || !scenario || !detail) { if (container) container.innerHTML = ""; return; }
  const target = Number(scenario.inputs?.targetWeight);
  const targetControl = detail.decision.kind === "concentration" ? `<label><span>Target position</span><select data-scenario-target aria-label="Target position weight">${[8, 10, 12, 15, target].filter((value, index, values) => Number.isFinite(value) && value >= detail.model.bounds.targetWeight.min && value <= detail.model.bounds.targetWeight.max && values.indexOf(value) === index).sort((a, b) => a - b).map((value) => `<option value="${value}"${value === target ? " selected" : ""}>${decisionPercent(value)}</option>`).join("")}</select></label>` : "";
  const amount = Number(scenario.implementation.amount || 0);
  const amountKey = scenarioAmountKey(detail);
  const amountMaximum = Number(detail.model.bounds[amountKey]?.max);
  container.innerHTML = `${targetControl}<div class="scenario-amount-choice"><span>Invest now</span><div>${scenarioAmountOptions(scenario, detail).map((value) => `<button type="button" data-scenario-amount="${value}" data-scenario-amount-key="${amountKey}" aria-pressed="${value === amount}">${value === amountMaximum ? `All ${formatWealthCurrency(value)}` : formatWealthCurrency(value)}</button>`).join("")}</div></div>`;
}

async function refreshEmbeddedMandate(updates) {
  const detail = state.activeDecisionDetail;
  if (!detail || !state.currentHouseholdId) return;
  state.decisionScenarioController?.abort();
  const controller = new AbortController();
  state.decisionScenarioController = controller;
  try {
    const scenario = await modelDecisionScenario(detail.decision.id, state.currentHouseholdId, { ...(state.activeDecisionScenario?.inputs || {}), ...updates }, { signal: controller.signal });
    if (controller !== state.decisionScenarioController) return;
    state.activeDecisionScenario = scenario;
    state.householdScenario.implementationAmount = scenario.implementation.amount;
    state.householdScenario.impact = proposalImpactFromScenario(detail, scenario);
    state.householdScenario.tags = [formatWealthCurrency(scenario.implementation.amount), ...scenario.implementation.tags.slice(1)];
    rebalanceProposalCandidates();
    showScenarioRibbon(state.householdScenario);
    renderResults();
  } catch (error) {
    if (error.name !== "AbortError") showToast("Unable to update the investment mandate");
  }
}

function showScenarioRibbon({ source, title, tags, decisionId = null, implementationAmount = 0, proposalMode = false, decisionTitle = "", objective = "", sourceLabel = "", sourceValue = "", impact = {} }) {
  state.householdScenario = { source, title, tags, householdId: state.currentHouseholdId, householdName: HOUSEHOLD.name, decisionId, implementationAmount, proposalMode, decisionTitle, objective, sourceLabel, sourceValue, impact };
  updateHtml(el("scenarioBack"), backLabel(HOUSEHOLD.name));
  el("scenarioSource").textContent = source;
  el("scenarioTitle").textContent = title;
  el("scenarioTags").innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  el("scenarioProgress").innerHTML = proposalMode ? `<span class="complete"><i>1</i>Define change</span><b></b><span class="active"><i>2</i>Select investments</span><b></b><span><i>3</i>Build proposal</span>` : "";
  el("scenarioCapital").hidden = !proposalMode;
  if (proposalMode) {
    el("scenarioCapitalAmount").textContent = formatWealthCurrency(implementationAmount);
    el("scenarioCapitalSource").textContent = sourceLabel ? `From ${sourceLabel}` : "From proposed change";
  }
  el("scenarioRibbon").classList.toggle("proposal-mode", proposalMode);
  el("scenarioRibbon").hidden = false;
  document.body.classList.toggle("proposal-mode-active", proposalMode);
  renderScenarioMandate();
  renderProposalTray();
}

function applyHouseholdScenario(scenario) {
  if (!scenario) return;
  launchInvestmentContext(scenario);
}

function handleWealthInsight(id) {
  const decision = state.decisionSummary?.decisions?.find((item) => item.sourceInsightId === id);
  if (decision) { openDecisionInScreener(decision.id); return; }
  const insight = HOUSEHOLD_INSIGHTS.find((candidate) => candidate.id === id);
  if (!insight) return;
  if (insight.action.type === "concentration") { openWealthDrawer("concentration"); return; }
  if (insight.action.type === "investment-search") { applyHouseholdScenario(insight.action.searchIntent); return; }
  if (insight.action.type === "goal" && insight.action.goalId) { openWealthDrawer(`goal:${insight.action.goalId}`); return; }
  openWealthDrawer(id);
}

function renderCategories() {
  const html = CATEGORY_ORDER.map((name) => {
    const count = CATEGORY_COUNTS[name];
    const liveCount = state.facets?.categories?.[name];
    const display = name === "All" ? state.facets ? state.total : count : liveCount ?? count;
    return `<button class="category-tab ${state.appliedCategory === name ? "active" : ""}" data-category="${escapeHtml(name)}"><strong>${escapeHtml(name === "Fixed Income" ? "Fixed income" : name)}</strong><span>${formatCount(display)}</span></button>`;
  }).join("");
  updateHtml(el("categoryStrip"), html);
}

function renderFilterOptions() {
  const flagCounts = state.facets?.flags || {};
  updateHtml(el("flagFilters"), PRIMARY_FLAGS.map((flag) => `<label title="${escapeHtml(FLAG_DEFINITIONS[flag].definition)}"><input type="checkbox" data-filter="flag" value="${escapeHtml(flag)}" ${state.flags.has(flag) ? "checked" : ""}/> <span>${escapeHtml(flag)}</span><em>${formatCount(flagCounts[flag] ?? 0)}</em></label>`).join(""));
  const riskCounts = state.facets?.risks || {};
  updateHtml(el("riskFilters"), RISKS.map((risk) => `<label><input type="checkbox" data-filter="risk" value="${risk}" ${state.risks.has(risk) ? "checked" : ""}/> <span>${risk}</span><em>${formatCount(riskCounts[risk] ?? 0)}</em></label>`).join(""));
  const statuses = state.facets?.statuses || {};
  el("statusAvailableCount").textContent = formatCount(statuses.Available ?? 0);
  el("statusNewCount").textContent = formatCount(statuses.New ?? 0);
  el("statusLimitedCount").textContent = formatCount(statuses.Limited ?? 0);
  document.querySelectorAll('[data-filter="status"]').forEach((input) => { input.checked = state.statuses.has(input.value); });
}

function effectiveRange(field, facet) {
  const selected = state.ranges[field] || {};
  return {
    min: Number.isFinite(selected.min) ? selected.min : facet.min,
    max: Number.isFinite(selected.max) ? selected.max : facet.max,
  };
}

function rangeSummary(definition, facet) {
  const selected = state.ranges[definition.field];
  if (!selected) return "All values";
  if (Number.isFinite(selected.min) && Number.isFinite(selected.max)) return `${formatRangeValue(selected.min, definition)}–${formatRangeValue(selected.max, definition)}`;
  if (Number.isFinite(selected.min)) return `≥ ${formatRangeValue(selected.min, definition)}`;
  return `≤ ${formatRangeValue(selected.max, definition)}`;
}

function rangeAffixes(definition) {
  if (definition.format === "currency") return { prefix: "$", suffix: "" };
  if (definition.format === "percent") return { prefix: "", suffix: "%" };
  if (definition.format === "multiple") return { prefix: "", suffix: "×" };
  if (definition.format === "months") return { prefix: "", suffix: "mo" };
  if (definition.format === "years") return { prefix: "", suffix: "yr" };
  return { prefix: "", suffix: "" };
}

function rangeInputValue(value, definition) {
  return Number(Number(value).toFixed(definition.digits));
}

function rangeInputDisplayValue(value, definition) {
  const numeric = rangeInputValue(value, definition);
  return definition.format === "currency" ? number.format(numeric) : String(numeric);
}

function parseRangeInputValue(value, definition) {
  const normalized = definition.format === "currency" ? String(value).replace(/,/g, "") : String(value);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function rangeModule(definition, facet, open) {
  const selection = effectiveRange(definition.field, facet);
  const active = Boolean(state.ranges[definition.field]);
  const affixes = rangeAffixes(definition);
  const numberField = (bound, label, value) => {
  const displayValue = rangeInputDisplayValue(value, definition);
  const inputType = definition.format === "currency" ? "text" : "number";
  return `<label class="range-number-control range-bound-${bound}">
    <span class="sr-only">${escapeHtml(label)} ${escapeHtml(definition.label)}</span>
    ${affixes.prefix ? `<span class="range-affix">${affixes.prefix}</span>` : ""}
    <span class="range-input-sizer" data-range-input-sizer data-value="${escapeHtml(displayValue)}"><input type="${inputType}" data-range-number="${escapeHtml(definition.field)}" data-range-bound="${bound}" min="${facet.min}" max="${facet.max}" step="${definition.step}" value="${escapeHtml(displayValue)}" inputmode="decimal" autocomplete="off" /></span>
    ${affixes.suffix ? `<span class="range-affix">${affixes.suffix}</span>` : ""}
  </label>`;
};
  return `<details class="filter-group distribution-group ${active ? "has-range" : ""}" data-range-group="${escapeHtml(definition.field)}" ${open ? "open" : ""}>
    <summary><span class="range-summary-title">${escapeHtml(definition.label)}<small data-range-summary>${escapeHtml(rangeSummary(definition, facet))}</small></span><span class="filter-chevron">⌃</span></summary>
    <div class="distribution-filter">
      <div class="compact-range-values">
        <div class="range-value-pair">
          ${numberField("min", "Minimum", rangeInputValue(selection.min, definition))}
          <span class="range-separator" aria-hidden="true">—</span>
          ${numberField("max", "Maximum", rangeInputValue(selection.max, definition))}
        </div>
        <button class="range-clear" type="button" data-reset-range="${escapeHtml(definition.field)}" aria-label="Clear ${escapeHtml(definition.label)} range" title="Clear range" ${active ? "" : "hidden"}>×</button>
      </div>
      <div class="range-track-wrap"><div class="range-slider" data-range-slider="${escapeHtml(definition.field)}"></div></div>
    </div>
  </details>`;
}

function loadRangeSliderLibrary() {
  if (!rangeSliderLibraryPromise) rangeSliderLibraryPromise = import("/vendor/nouislider.mjs").then((module) => module.default);
  return rangeSliderLibraryPromise;
}

async function initializeRangeSlider(definition, facet) {
  const group = document.querySelector(`[data-range-group="${CSS.escape(definition.field)}"]`);
  const target = group?.querySelector(`[data-range-slider="${CSS.escape(definition.field)}"]`);
  if (!group || !target || target.noUiSlider) return;
  const selection = effectiveRange(definition.field, facet);
  const noUiSlider = await loadRangeSliderLibrary();
  if (!target.isConnected || target.noUiSlider) return;
  noUiSlider.create(target, {
    start: [selection.min, selection.max],
    connect: true,
    step: definition.step,
    range: { min: facet.min, max: facet.max },
    behaviour: "tap-drag-smooth-steps",
    animate: true,
    animationDuration: 160,
    keyboardSupport: true,
    handleAttributes: [
      { "aria-label": `Minimum ${definition.label}` },
      { "aria-label": `Maximum ${definition.label}` },
    ],
    ariaFormat: { to: (value) => formatRangeValue(value, definition), from: Number },
  });
  target.noUiSlider.on("start.compactRange", () => group.classList.add("is-adjusting"));
  target.noUiSlider.on("slide.compactRange", (_values, _handle, unencoded) => {
    setRangeSelection(definition.field, unencoded[0], unencoded[1], { syncSlider: false });
  });
  target.noUiSlider.on("change.compactRange", (_values, _handle, unencoded) => {
    setRangeSelection(definition.field, unencoded[0], unencoded[1], { syncSlider: false });
    group.classList.remove("is-adjusting");
    runSearch();
  });
  target.noUiSlider.on("end.compactRange", () => group.classList.remove("is-adjusting"));
}

function renderRangeFilters() {
  const category = state.appliedCategory;
  const facets = state.facets?.ranges || {};
  const container = el("rangeFilters");
  const previousOpen = new Set([...container.querySelectorAll("[data-range-group][open]")].map((group) => group.dataset.rangeGroup));
  const categoryChanged = rangeCategoryRendered !== category;
  const definitions = rangeDefinitions(category).filter(({ field }) => facets[field]);
  const activeRange = definitions.find(({ field }) => state.ranges[field])?.field;
  const defaultOpen = categoryChanged ? activeRange || definitions[0]?.field : null;
  updateHtml(container, definitions.map((definition) => rangeModule(definition, facets[definition.field], previousOpen.has(definition.field) || definition.field === defaultOpen)).join(""));
  definitions.forEach((definition) => initializeRangeSlider(definition, facets[definition.field]));
  rangeCategoryRendered = category;
}

function refreshRangeControl(field, { syncSlider = true } = {}) {
  const definition = rangeDefinitions(state.appliedCategory).find((entry) => entry.field === field);
  const facet = state.facets?.ranges?.[field];
  const group = document.querySelector(`[data-range-group="${CSS.escape(field)}"]`);
  if (!definition || !facet || !group) return;
  const selection = effectiveRange(field, facet);
  const slider = group.querySelector(`[data-range-slider="${CSS.escape(field)}"]`);
  if (syncSlider && slider?.noUiSlider) slider.noUiSlider.set([selection.min, selection.max], false);
  group.querySelectorAll(`[data-range-number="${CSS.escape(field)}"]`).forEach((input) => {
    input.value = rangeInputDisplayValue(selection[input.dataset.rangeBound], definition);
    input.closest("[data-range-input-sizer]").dataset.value = input.value;
  });
  const reset = group.querySelector("[data-reset-range]");
  reset.hidden = !state.ranges[field];
  group.classList.toggle("has-range", Boolean(state.ranges[field]));
  group.querySelector("[data-range-summary]").textContent = rangeSummary(definition, facet);
}

function setRangeSelection(field, rawMinimum, rawMaximum, options = {}) {
  const facet = state.facets?.ranges?.[field];
  const definition = rangeDefinitions(state.appliedCategory).find((entry) => entry.field === field);
  if (!facet || !definition) return;
  const minimum = rangeInputValue(Math.max(facet.min, Math.min(facet.max, Number(rawMinimum))), definition);
  const maximum = rangeInputValue(Math.max(minimum, Math.min(facet.max, Number(rawMaximum))), definition);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return;
  const next = {};
  if (minimum !== facet.min) next.min = minimum;
  if (maximum !== facet.max) next.max = maximum;
  if (Number.isFinite(next.min) || Number.isFinite(next.max)) state.ranges[field] = next;
  else delete state.ranges[field];
  refreshRangeControl(field, options);
}

function updateRangeSelection(field, bound, rawValue) {
  const facet = state.facets?.ranges?.[field];
  const definition = rangeDefinitions(state.appliedCategory).find((entry) => entry.field === field);
  if (!facet || !definition) return;
  if (rawValue === "") {
    const next = { ...(state.ranges[field] || {}) };
    delete next[bound];
    if (Number.isFinite(next.min) || Number.isFinite(next.max)) state.ranges[field] = next;
    else delete state.ranges[field];
    refreshRangeControl(field);
    return;
  }
  const current = effectiveRange(field, facet);
  const parsed = parseRangeInputValue(rawValue, definition);
  if (!Number.isFinite(parsed)) return;
  const value = Math.max(facet.min, Math.min(facet.max, parsed));
  const next = { ...(state.ranges[field] || {}) };
  if (bound === "min") next.min = Math.min(value, current.max);
  else next.max = Math.max(value, current.min);
  if (next.min === facet.min) delete next.min;
  if (next.max === facet.max) delete next.max;
  if (Number.isFinite(next.min) || Number.isFinite(next.max)) state.ranges[field] = next;
  else delete state.ranges[field];
  refreshRangeControl(field);
}

function activeFilterEntries() {
  const values = [];
  state.flags.forEach((flag) => values.push([`flag:${flag}`, flag]));
  state.risks.forEach((risk) => values.push([`risk:${risk}`, `${risk} risk`]));
  state.statuses.forEach((status) => values.push([`status:${status}`, status === "New" ? "New to shelf" : status]));
  for (const definition of rangeDefinitions(state.appliedCategory)) {
    const selected = state.ranges[definition.field];
    if (!selected) continue;
    let label = definition.label;
    if (Number.isFinite(selected.min) && Number.isFinite(selected.max)) label += ` ${formatRangeValue(selected.min, definition)}–${formatRangeValue(selected.max, definition)}`;
    else if (Number.isFinite(selected.min)) label += ` ≥ ${formatRangeValue(selected.min, definition)}`;
    else label += ` ≤ ${formatRangeValue(selected.max, definition)}`;
    values.push([`range:${definition.field}`, label]);
  }
  return values;
}

function renderActiveFilters() {
  const entries = activeFilterEntries();
  el("activeFilterCount").textContent = `${entries.length} active`;
  updateHtml(el("activeChips"), entries.map(([key, label]) => `<span class="filter-chip">${escapeHtml(label)}<button data-remove-filter="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(label)}">×</button></span>`).join(""));
}

function badge(flag) { return `<span class="badge ${FLAG_COLORS[flag] || "blue"}">${escapeHtml(flag)}</span>`; }

function researchStatus(status) {
  if (!status) return "";
  return `<span class="result-research-status ${escapeHtml(status.tone)}"><i aria-hidden="true"></i>${escapeHtml(status.label)}</span>`;
}

function visibleFlags(flags) {
  const selected = [...state.flags].filter((flag) => flags.includes(flag));
  return [...selected, ...flags.filter((flag) => !selected.includes(flag))].slice(0, Math.max(2, selected.length));
}

function renderMarketHeaders() {
  const columns = selectedColumns();
  const proposalMode = proposalModeActive();
  el("resultsTable").style.setProperty("--result-columns", String(columns.length));
  el("resultsTable").classList.toggle("proposal-results-table", proposalModeActive());
  el("columnsButton").textContent = `▦ Columns · ${columns.length}/${MAX_RESULT_COLUMNS}`;
  const sortableHeader = (column, label, className = "") => {
    const config = headerSort(state.appliedCategory, column, state.sort);
    if (!config) return `<th class="${className}">${escapeHtml(label)}</th>`;
    const ariaSort = config.active ? (config.direction === "asc" ? "ascending" : "descending") : "none";
    const indicator = config.active ? (config.direction === "asc" ? "↑" : "↓") : "↕";
    return `<th class="${className} sortable-column ${config.active ? "active-sort" : ""}" aria-sort="${ariaSort}"><button type="button" data-sort-header="${escapeHtml(config.nextSort)}" title="Sort by ${escapeHtml(label)}">${escapeHtml(label)}<span aria-hidden="true">${indicator}</span></button></th>`;
  };
  updateHtml(el("resultsHeader"), `<th class="check-cell"><span class="sr-only">${proposalMode ? "Proposal selection" : "Compare"}</span></th>${sortableHeader("investment", "Investment", "col-investment")}${columns.map((column) => sortableHeader(column, columnLabel(state.appliedCategory, column), `result-data-column col-${escapeHtml(column)}`)).join("")}${proposalMode ? "" : `<th class="action-cell"><span class="sr-only">Actions</span></th>`}`);
}

function marketMetric(metric) {
  return `<span class="metric-primary">${escapeHtml(metric.value)}</span><span class="metric-secondary">${escapeHtml(metric.label)}</span>`;
}

function marketPrimary(snapshot) {
  const intraday = snapshot.intraday ? marketSparkline(snapshot.intraday) : "";
  return `<div class="market-primary-layout"><div class="market-primary-quote"><div class="market-value-line"><span class="metric-primary">${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change ${escapeHtml(snapshot.primary.tone)}">${escapeHtml(snapshot.primary.change)}</span></div><span class="metric-secondary market-price-time">${escapeHtml(snapshot.asOf || "")}</span></div>${intraday}</div>`;
}

function marketSparkline(trend) {
  const values = trend.points;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const points = values.map((value, index) => {
    const x = index * (94 / (values.length - 1));
    const y = 3 + (maximum - value) * (21 / spread);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${line} L94 27 L0 27 Z`;
  const [endX, endY] = points.at(-1);
  return `<div class="sparkline-wrap ${escapeHtml(trend.tone)}" title="${escapeHtml(`${trend.label}: ${trend.value}`)}"><svg class="market-sparkline" viewBox="0 0 94 28" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(`${trend.label} ${trend.value}`)}"><path class="sparkline-area" d="${area}"></path><path class="sparkline-line" d="${line}"></path><circle cx="${endX}" cy="${endY}" r="2"></circle></svg><span class="metric-secondary">${escapeHtml(trend.label)} <b>${escapeHtml(trend.value)}</b></span></div>`;
}

function marketSnapshotPlaceholder() {
  return `<span class="snapshot-placeholder" aria-label="Loading market snapshot"><i></i><i></i></span>`;
}

const SNAPSHOT_COLUMNS = new Set(["primary", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);

function snapshotMetric(snapshot, column) {
  if (!snapshot) return null;
  if (column === "featuredDecision") return snapshot.metrics?.[snapshot.featured?.[0]];
  if (column === "featuredImplementation") return snapshot.metrics?.[snapshot.featured?.[1]];
  return snapshot.metrics?.[column];
}

function renderResultColumn(item, column) {
  const snapshot = item.marketSnapshot;
  if (column === "primary") return snapshot ? marketPrimary(snapshot) : marketSnapshotPlaceholder();
  if (SNAPSHOT_COLUMNS.has(column)) return snapshot ? marketMetric(snapshotMetric(snapshot, column) || { value: "—", label: columnLabel(item.category, column) }) : marketSnapshotPlaceholder();
  if (column === "marketCap") return marketMetric(snapshotMetric(snapshot, "marketCap") || { value: String(item.aum || "—").replace(/\s+market cap$/i, ""), label: "Market cap" });
  if (column === "aum") return marketMetric(snapshotMetric(snapshot, "aum") || { value: item.aum || "—", label: "Fund assets" });
  if (column === "minimum") return marketMetric({ value: formatMinimum(item.minimum), label: "Opening" });
  if (column === "fee") return marketMetric({ value: formatFee(item.fee), label: "Annual" });
  if (column === "risk") return marketMetric({ value: item.risk, label: "Risk level" });
  if (column === "perf1") return marketMetric(snapshotMetric(snapshot, "perf1") || { value: formatReturn(item.perf1), label: "Annualized" });
  if (column === "perf3") return marketMetric(snapshotMetric(snapshot, "perf3") || { value: formatReturn(item.perf3), label: "Annualized" });
  if (column === "liquidity") return marketMetric({ value: item.liquidity || "—", label: "Terms" });
  if (column === "assetClass") return marketMetric({ value: item.assetClass || "—", label: "Classification" });
  return marketMetric({ value: "—", label: columnLabel(item.category, column) });
}

function resultColspan() { return selectedColumns().length + (proposalModeActive() ? 2 : 3); }

function renderResults() {
  const body = el("resultsBody");
  renderMarketHeaders();
  if (!state.items.length) {
    body.innerHTML = `<tr><td colspan="${resultColspan()}" class="empty-state"><strong>No investments match this screen</strong>Remove one or more filters, or search the full shelf.</td></tr>`;
    return;
  }
  const columns = selectedColumns();
  const proposalMode = proposalModeActive();
  body.innerHTML = state.items.map((item) => {
    const checked = state.compare.has(item.id);
    const proposed = state.proposalCandidates.has(item.id);
    return `<tr data-row-id="${escapeHtml(item.id)}" class="${proposed ? "proposal-selected-row" : ""}">
      <td class="check-cell">${proposalMode ? `<button type="button" class="proposal-select-button ${proposed ? "selected" : ""}" data-proposal-id="${escapeHtml(item.id)}" aria-pressed="${proposed}" aria-label="${proposed ? "Remove" : "Add"} ${escapeHtml(item.name)} ${proposed ? "from" : "to"} proposal"><span>${proposed ? "✓" : "+"}</span></button>` : `<input class="row-check" type="checkbox" data-compare-id="${escapeHtml(item.id)}" aria-label="Compare ${escapeHtml(item.name)}" ${checked ? "checked" : ""}/>`}</td>
      <td><div class="investment-cell">${productMark(item)}<div class="investment-meta"><a href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</a><div class="investment-sub">${escapeHtml(item.type)} · ${escapeHtml(item.manager)}${item.matchReason ? `<span class="match-reason">${escapeHtml(item.matchReason)}</span>` : ""}<span class="badges">${researchStatus(item.researchStatus)}${visibleFlags(item.flags).map(badge).join("")}</span></div></div></div></td>
      ${columns.map((column) => `<td class="result-data-column col-${escapeHtml(column)} ${column === "primary" ? "market-primary" : ""}">${renderResultColumn(item, column)}</td>`).join("")}
      ${proposalMode ? "" : `<td class="action-cell"><a class="row-menu" href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.name)}">›</a></td>`}
    </tr>`;
  }).join("");
}

function columnsEqual(left, right) {
  return left.length === right.length && left.every((column, index) => column === right[index]);
}

function renderColumnConfigurator() {
  const category = state.appliedCategory;
  const allowed = CATEGORY_COLUMN_RULES[category] || CATEGORY_COLUMN_RULES.All;
  const presets = CATEGORY_COLUMN_PRESETS[category] || CATEGORY_COLUMN_PRESETS.All;
  columnDraft = normalizeColumns(category, columnDraft);
  el("columnCategory").textContent = category === "All" ? "all investments" : category;
  el("columnCount").textContent = `${columnDraft.length} of ${MAX_RESULT_COLUMNS}`;
  el("columnCount").classList.toggle("at-limit", columnDraft.length === MAX_RESULT_COLUMNS);
  updateHtml(el("columnPresets"), Object.entries(presets).map(([name, columns]) => `<button type="button" data-column-preset="${escapeHtml(name)}" aria-pressed="${columnsEqual(columnDraft, columns)}">${escapeHtml(name)}<small>${columns.length} columns</small></button>`).join(""));
  updateHtml(el("selectedColumns"), columnDraft.map((column, index) => `<div class="selected-column-row" data-selected-column="${escapeHtml(column)}"><span class="column-order">${index + 1}</span><div><strong>${escapeHtml(columnLabel(category, column))}</strong><small>${escapeHtml(COLUMN_DEFINITIONS[column]?.group || "Field")}</small></div><div class="column-row-actions"><button type="button" data-column-move="up" data-column="${escapeHtml(column)}" ${index === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(columnLabel(category, column))} left">←</button><button type="button" data-column-move="down" data-column="${escapeHtml(column)}" ${index === columnDraft.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(columnLabel(category, column))} right">→</button><button type="button" data-column-remove="${escapeHtml(column)}" ${columnDraft.length === 1 ? "disabled" : ""} aria-label="Remove ${escapeHtml(columnLabel(category, column))}">×</button></div></div>`).join(""));
  updateHtml(el("availableColumns"), allowed.map((column) => {
    const checked = columnDraft.includes(column);
    const disabled = !checked && columnDraft.length >= MAX_RESULT_COLUMNS;
    return `<label class="available-column ${disabled ? "disabled" : ""}"><input type="checkbox" data-column-choice="${escapeHtml(column)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}/><span><strong>${escapeHtml(columnLabel(category, column))}</strong><small>${escapeHtml(COLUMN_DEFINITIONS[column]?.group || "Field")}</small></span></label>`;
  }).join(""));
}

function openColumnConfigurator() {
  columnDraft = [...selectedColumns()];
  renderColumnConfigurator();
  el("columnsModal").showModal();
}

function applyColumnDraft() {
  setColumnsForCategory(state.appliedCategory, columnDraft);
  el("columnsModal").close();
  const previousSort = state.sort;
  normalizeActiveSort();
  renderSortControl();
  if (state.sort !== previousSort) runSearch();
  else { renderResults(); syncUrl(); }
  showToast(`${columnDraft.length} columns applied to ${state.appliedCategory === "All" ? "all investments" : state.appliedCategory}`);
}

function updateHeader() {
  el("resultsTitle").textContent = state.appliedCategory === "All" ? "All investments" : state.appliedCategory;
  el("resultCount").textContent = formatCount(state.total);
  const start = state.total ? state.cursor + 1 : 0;
  const end = Math.min(state.cursor + state.items.length, state.total);
  el("pageRange").textContent = `${formatCount(start)}–${formatCount(end)} of ${formatCount(state.total)}`;
  el("prevPage").disabled = state.previousCursor === null;
  el("nextPage").disabled = state.nextCursor === null;
}

function renderInterpretation(interpreted = []) {
  const panel = el("interpretation");
  if (!interpreted.length || !state.q) { panel.hidden = true; return; }
  el("interpretationText").textContent = interpreted.join(" · ");
  panel.hidden = false;
}

function buildSearchUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  params.set("sort", state.sort);
  params.set("cursor", String(state.cursor));
  params.set("pageSize", "25");
  return `/api/search?${params}`;
}

async function loadMarketSnapshots(items) {
  state.snapshotController?.abort();
  const missingIds = items.map((item) => item.id).filter((id) => !state.snapshotCache.has(id));
  if (!missingIds.length) return;
  const controller = new AbortController();
  state.snapshotController = controller;
  const params = new URLSearchParams({ ids: missingIds.join(",") });
  try {
    const response = await fetch(`/api/snapshots?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Snapshots failed (${response.status})`);
    const data = await response.json();
    if (controller !== state.snapshotController) return;
    Object.entries(data.snapshots || {}).forEach(([id, snapshot]) => state.snapshotCache.set(id, snapshot));
    state.items = sortLoadedItems(state.items.map((item) => ({ ...item, marketSnapshot: state.snapshotCache.get(item.id) })), state.sort, state.appliedCategory);
    for (const item of state.items) {
      if (state.compare.has(item.id)) state.compare.set(item.id, item);
    }
    renderResults();
  } catch (error) {
    if (error.name !== "AbortError") console.warn("Market snapshots unavailable", error);
  }
}

function syncUrl() {
  if (state.workspaceView !== "investments" || profileFromPath()) return;
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category !== "All") params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  const ranges = serializeRanges(state.ranges);
  if (ranges) params.set("ranges", ranges);
  if (state.sortExplicit || state.sort !== defaultSort(Boolean(state.q))) params.set("sort", state.sort);
  const columns = selectedColumns();
  const defaults = CATEGORY_DEFAULT_COLUMNS[state.appliedCategory] || CATEGORY_DEFAULT_COLUMNS.All;
  if (!columnsEqual(columns, defaults)) {
    params.set("columns", columns.join(","));
    params.set("columnCategory", state.appliedCategory);
  }
  history.replaceState({ workspaceView: "investments" }, "", params.size ? `/investments?${params}` : "/investments");
}

async function runSearch({ preserveCursor = false } = {}) {
  state.investmentSearchStarted = true;
  if (!preserveCursor) state.cursor = 0;
  normalizeActiveSort(state.category);
  renderSortControl(state.category);
  state.controller?.abort();
  state.snapshotController?.abort();
  const controller = new AbortController();
  state.controller = controller;
  const requestStarted = performance.now();
  const previousLatency = { text: el("latency").textContent, title: el("latency").title };
  let loadingShownAt = 0;
  const showLoading = () => {
    if (controller !== state.controller) return;
    loadingShownAt = performance.now();
    el("tableLoading").hidden = false;
    el("resultsPanel").setAttribute("aria-busy", "true");
    el("latency").textContent = "Searching…";
    el("latency").title = "Searching the indexed investment shelf";
  };
  const loadingTimer = window.setTimeout(showLoading, 180);
  try {
    const response = await fetch(buildSearchUrl(), { signal: controller.signal });
    if (!response.ok) throw new Error(`Search failed (${response.status})`);
    const data = await response.json();
    if (controller !== state.controller) return;
    window.clearTimeout(loadingTimer);
    state.items = data.items.map((item) => ({ ...item, marketSnapshot: state.snapshotCache.get(item.id) }));
    state.total = data.total;
    state.nextCursor = data.nextCursor;
    state.previousCursor = data.previousCursor;
    state.facets = data.facets;
    state.appliedCategory = data.appliedCategory || state.category;
    state.ranges = normalizeRanges(data.appliedRanges || state.ranges, state.appliedCategory);
    if (state.pendingColumns && state.pendingColumns.category === state.appliedCategory) {
      setColumnsForCategory(state.appliedCategory, state.pendingColumns.columns, { persist: false });
      state.pendingColumns = null;
    }
    normalizeActiveSort(state.appliedCategory);
    renderSortControl(state.appliedCategory);
    const roundTripMs = Math.max(1, Math.round(performance.now() - requestStarted));
    el("latency").textContent = `${roundTripMs} ms`;
    el("latency").title = `Browser round trip; server search ${data.tookMs} ms`;
    renderInterpretation(data.interpreted);
    renderCategories();
    renderFilterOptions();
    renderRangeFilters();
    renderActiveFilters();
    renderResults();
    updateHeader();
    syncUrl();
    window.requestAnimationFrame(() => loadMarketSnapshots(state.items));
    if (loadingShownAt) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const remaining = 140 - (performance.now() - loadingShownAt);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      el("resultsBody").innerHTML = `<tr><td colspan="${resultColspan()}" class="empty-state"><strong>Search is temporarily unavailable</strong>${escapeHtml(error.message)}. Try again.</td></tr>`;
      el("latency").textContent = "Unavailable";
    } else if (controller === state.controller) {
      el("latency").textContent = previousLatency.text;
      el("latency").title = previousLatency.title;
    }
  } finally {
    window.clearTimeout(loadingTimer);
    if (controller === state.controller) {
      el("tableLoading").hidden = true;
      el("resultsPanel").setAttribute("aria-busy", "false");
    }
  }
}

function ensureInvestmentWorkspaceLoaded() {
  if (state.investmentSearchStarted) return initialInvestmentSearchPromise || Promise.resolve();
  state.investmentSearchStarted = true;
  initialInvestmentSearchPromise = runSearch({ preserveCursor: true }).finally(() => { initialInvestmentSearchPromise = null; });
  return initialInvestmentSearchPromise;
}

let debounceTimer;
function debouncedSearch() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => runSearch(), 260);
}

function cancelActiveSearch() {
  state.controller?.abort();
  state.controller = null;
  el("tableLoading").hidden = true;
  el("resultsPanel").setAttribute("aria-busy", "false");
}

function applyQuickScreen(name) {
  state.q = "";
  state.flags.clear(); state.risks.clear(); state.statuses.clear();
  state.ranges = {};
  if (name === "muni") { state.q = "New York municipal income under 50 bps"; state.category = "Fixed Income"; state.flags.add("Tax-Aware"); state.risks.add("Conservative"); }
  if (name === "core") { state.q = "core equity building blocks aligned with the CIO house view"; state.category = "ETFs"; state.flags.add("CIO House View"); state.risks.add("Moderate"); }
  if (name === "sustainable") { state.q = "sustainable investment solutions"; state.category = "All"; state.flags.add("Sustainable"); }
  if (name === "tax") { state.q = "tax-aware SMAs with direct indexing"; state.category = "SMAs"; state.flags.add("Tax-Aware"); state.flags.add("Direct Indexing"); state.risks.add("Moderate"); }
  el("searchInput").value = state.q;
  runSearch();
}

function removeFilter(key) {
  const [type, value] = key.split(":");
  if (type === "range") delete state.ranges[value];
  if (type === "flag") state.flags.delete(value);
  if (type === "risk") state.risks.delete(value);
  if (type === "status") state.statuses.delete(value);
  runSearch();
}

function renderCompareTray() {
  const count = state.compare.size;
  el("compareCountTop").textContent = String(count);
  el("compareTrayCount").textContent = String(count);
  el("compareTray").hidden = count === 0 || Boolean(state.householdScenario?.proposalMode);
  el("compareItems").innerHTML = [...state.compare.values()].map((item) => `<div class="compare-item"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.symbol)}</small><button data-remove-compare="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join("");
}

function proposalModeActive() {
  return Boolean(state.householdScenario?.proposalMode && state.householdScenario?.decisionId);
}

function proposalTargetAmount() {
  return Math.max(0, Math.round(Number(state.householdScenario?.implementationAmount) || Number(state.proposal?.totalAmount) || 0));
}

function proposalCandidate(id) {
  return state.items.find((candidate) => candidate.id === id)
    || (state.currentDetail?.id === id ? state.currentDetail : null)
    || state.proposalCandidates.get(id)
    || state.proposal?.candidates.find((candidate) => candidate.id === id);
}

function rebalanceProposalCandidates() {
  const candidates = allocateProposalCandidates([...state.proposalCandidates.values()], proposalTargetAmount());
  state.proposalCandidates = new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

function renderProposalTray() {
  const active = proposalModeActive() && state.workspaceView === "investments";
  const tray = el("proposalTray");
  if (!active) { tray.hidden = true; return; }
  const candidates = [...state.proposalCandidates.values()];
  const target = proposalTargetAmount();
  const allocated = candidates.reduce((sum, candidate) => sum + (Number(candidate.amount) || 0), 0);
  const remaining = Math.max(0, target - allocated);
  const requiredMinimum = candidates.reduce((sum, candidate) => sum + (Number(candidate.minimum) || 0), 0);
  const minimumsMet = candidates.every((candidate) => (Number(candidate.amount) || 0) >= (Number(candidate.minimum) || 0));
  tray.hidden = false;
  el("proposalTrayTitle").textContent = candidates.length ? `${candidates.length} ${candidates.length === 1 ? "solution" : "solutions"} selected` : "Select investments";
  el("proposalTraySubtitle").textContent = `${formatWealthCurrency(target)} available to allocate`;
  el("proposalTrayItems").innerHTML = candidates.length
    ? candidates.map((candidate) => `<div class="proposal-tray-item">${productMark(candidate)}<span><strong>${escapeHtml(candidate.name)}</strong><small>${formatWealthCurrency(candidate.amount)} · ${escapeHtml(candidate.manager || candidate.category)}</small></span><button type="button" data-remove-proposal="${escapeHtml(candidate.id)}" aria-label="Remove ${escapeHtml(candidate.name)} from proposal">×</button></div>`).join("")
    : `<div class="proposal-tray-empty"><i>＋</i><span>Add one or more investments to build the client proposal.</span></div>`;
  el("proposalTrayAllocated").textContent = formatWealthCurrency(allocated);
  el("proposalTrayRemaining").textContent = requiredMinimum > target
    ? `${formatWealthCurrency(requiredMinimum - target)} above available capital in minimums`
    : !minimumsMet ? "Adjust allocation to meet investment minimums" : `${formatWealthCurrency(remaining)} remaining`;
  el("proposalTrayRemaining").classList.toggle("warning", !minimumsMet);
  el("proposalContinue").disabled = !candidates.length || remaining !== 0 || !minimumsMet;
}

function toggleProposalCandidate(id, selected) {
  if (!proposalModeActive()) return;
  const candidate = proposalCandidate(id);
  if (selected) {
    if (state.proposalCandidates.size >= 6) { showToast("A proposal can include up to six investments"); return; }
    if (candidate) state.proposalCandidates.set(id, candidate);
  } else state.proposalCandidates.delete(id);
  rebalanceProposalCandidates();
  renderProposalTray();
  renderResults();
  if (state.currentDetail) renderResearchProfile(state.currentDetail);
}

function proposalAllocated(proposal = state.proposal) {
  return (proposal?.candidates || []).reduce((sum, candidate) => sum + (Number(candidate.amount) || 0), 0);
}

function proposalImpactValue(value, format) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Not modeled";
  return format === "percent" ? `${numeric.toFixed(1)}%` : formatWealthCurrency(numeric);
}

function defaultProposalRationale(context) {
  if (!context) return "Implement the agreed household change using investments selected for the client's objectives and portfolio context.";
  return `${context.sourceValue || context.decisionTitle} creates ${formatWealthCurrency(context.implementationAmount)} to reposition. The proposed solutions are intended to support the household objective: ${String(context.objective || "implement the agreed change").replace(/\.$/, "").toLowerCase()}. Implementation criteria remain explicit.`;
}

function buildProposalFromSelection() {
  const context = state.householdScenario;
  if (!context?.decisionId || !state.proposalCandidates.size) return null;
  const existing = getProposal(context.decisionId);
  const draft = createProposalDraft({
    ...existing,
    decisionId: context.decisionId,
    householdId: context.householdId,
    householdName: context.householdName,
    members: HOUSEHOLD?.members || existing?.members || [],
    decisionTitle: context.decisionTitle,
    objective: context.objective,
    sourceLabel: context.sourceLabel,
    sourceValue: context.sourceValue,
    totalAmount: context.implementationAmount,
    impact: context.impact,
    candidates: [...state.proposalCandidates.values()],
    rationale: existing?.rationale || defaultProposalRationale(context),
    status: existing?.status || "Draft",
    createdAt: existing?.createdAt,
  });
  state.proposal = saveProposal(draft);
  state.activeDecisionPlan = setDecisionPlanStatus(context.decisionId, "Proposal in progress") || state.activeDecisionPlan;
  return state.proposal;
}

function openProposalBuilder(decisionId = state.householdScenario?.decisionId) {
  let proposal = decisionId ? getProposal(decisionId) : null;
  const openingStoredProposal = proposal && state.proposal?.decisionId !== proposal.decisionId;
  if (openingStoredProposal || (proposal && !state.proposalCandidates.size)) state.proposalCandidates = new Map(proposal.candidates.map((candidate) => [candidate.id, candidate]));
  if (proposalModeActive() && state.proposalCandidates.size) proposal = buildProposalFromSelection();
  if (!proposal) { showToast("Add an investment before continuing"); return; }
  state.proposal = proposal;
  if (!state.householdScenario?.proposalMode) {
    state.householdScenario = {
      source: "CLIENT PROPOSAL · STEP 2 OF 3",
      title: `Select investments for ${proposal.householdName}`,
      tags: [formatWealthCurrency(proposal.totalAmount), "Client proposal", proposal.sourceLabel],
      householdId: proposal.householdId,
      householdName: proposal.householdName,
      decisionId: proposal.decisionId,
      implementationAmount: proposal.totalAmount,
      proposalMode: true,
      decisionTitle: proposal.decisionTitle,
      objective: proposal.objective,
      sourceLabel: proposal.sourceLabel,
      sourceValue: proposal.sourceValue,
      impact: proposal.impact,
    };
  }
  document.body.classList.add("proposal-mode-active");
  closeDrawer({ fromHistory: true });
  renderCompareTray();
  renderProposalTray();
  const href = proposalUrl(proposal.decisionId);
  setWorkspaceView("proposal", { updateHistory: false });
  if (`${location.pathname}${location.search}` !== href) history.pushState({ workspaceView: "proposal", householdId: proposal.householdId, decisionId: proposal.decisionId }, "", href);
}

function proposalImpactMarkup(proposal) {
  const entries = Object.values(proposal.impact || {});
  if (!entries.length) return `<p class="proposal-empty-copy">No modeled household impact is available for this decision.</p>`;
  return `<div class="proposal-impact-grid">${entries.map((item) => `<div><span>${escapeHtml(item.label)}</span><p><small>Current</small><strong>${proposalImpactValue(item.before, item.format)}</strong></p><i aria-hidden="true">→</i><p><small>Proposed</small><strong>${proposalImpactValue(item.after, item.format)}</strong></p></div>`).join("")}</div>`;
}

function proposalSolutionMarkup(proposal) {
  return `<div class="proposal-solutions-table-wrap"><table class="proposal-solutions-table"><thead><tr><th>Strategy</th><th>Portfolio role</th><th>Allocation</th><th>Weight</th><th>Product fee</th><th>Liquidity</th></tr></thead><tbody>${proposal.candidates.map((candidate) => `<tr><th><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.manager)} · ${escapeHtml(candidate.symbol || candidate.category)}</small></th><td>${escapeHtml(candidate.objective || candidate.assetClass || candidate.category)}</td><td>${formatWealthCurrency(candidate.amount)}</td><td>${proposal.totalAmount ? ((candidate.amount / proposal.totalAmount) * 100).toFixed(1) : 0}%</td><td>${candidate.fee === null ? "See materials" : formatFee(candidate.fee)}</td><td>${escapeHtml(candidate.liquidity || "See product materials")}</td></tr>`).join("")}</tbody></table></div>`;
}

function proposalAllocationMarkup(proposal) {
  const keys = ["concentration", "usEquity", "cashWeight"];
  const entries = keys.map((key) => proposal.impact?.[key]).filter((item) => item?.format === "percent");
  if (!entries.length) return "";
  return `<section class="proposal-document-section proposal-allocation-table"><span class="proposal-section-label">MODELED ALLOCATION</span><h3>Current and proposed household positioning</h3><table><thead><tr><th>Exposure</th><th>Current</th><th>Proposed</th><th>Change</th></tr></thead><tbody>${entries.map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${proposalImpactValue(item.before, "percent")}</td><td>${proposalImpactValue(item.after, "percent")}</td><td class="${Number(item.after) - Number(item.before) < 0 ? "negative" : "positive"}">${Number(item.after) - Number(item.before) >= 0 ? "+" : ""}${(Number(item.after) - Number(item.before)).toFixed(1)} pts</td></tr>`).join("")}</tbody></table><small>Modeled at the household level. Unchanged asset classes are omitted for clarity.</small></section>`;
}

function renderProposalBuilder() {
  const proposal = state.proposal;
  if (!proposal) {
    updateHtml(el("proposalContent"), `<div class="proposal-route-error"><span>CLIENT PROPOSAL</span><h1 id="proposalPageTitle">Proposal unavailable</h1><p>Return to the household decision and select investments to begin.</p><button type="button" class="primary-button" data-workspace-view="book">Return to My Book</button></div>`);
    return;
  }
  const allocated = proposalAllocated(proposal);
  const remaining = proposal.totalAmount - allocated;
  const minimumsMet = proposal.candidates.every((candidate) => candidate.amount >= candidate.minimum);
  const allocationValid = proposal.candidates.length > 0 && remaining === 0 && minimumsMet;
  const weightedFee = proposal.candidates.reduce((sum, candidate) => sum + (Number(candidate.fee) || 0) * candidate.amount, 0) / Math.max(1, allocated);
  const annualProductCost = allocated * weightedFee / 100;
  const today = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
  updateHtml(el("proposalContent"), `<header class="proposal-workspace-header">
      <div><button type="button" class="proposal-back-link" data-proposal-back-results>${backLabel("Investment selection")}</button><span class="eyebrow">TOTAL WEALTH · CLIENT PROPOSAL</span><h1 id="proposalPageTitle">Proposal for client review</h1><p>Finalize the recommendation, disclosures and client-ready document.</p></div>
      <div class="proposal-header-actions"><button type="button" class="secondary-button" data-open-decision-from-proposal>Edit investments</button><button type="button" class="primary-button" data-proposal-generate ${allocationValid ? "" : "disabled"}>Finalize proposal</button></div>
    </header>
    <nav class="proposal-stepper" aria-label="Proposal progress"><span class="complete"><i>✓</i>Define change</span><b></b><span class="complete"><i>✓</i>Select investments</span><b></b><span class="active"><i>3</i>Build proposal</span></nav>
    <div class="proposal-builder-layout">
      <main class="proposal-document" id="proposalDocument">
        <header class="proposal-document-brand"><div><span class="brand-mark" aria-hidden="true">UPS</span><i></i><strong>WEALTH MANAGEMENT</strong></div><span>${escapeHtml(proposal.status.toUpperCase())}</span></header>
        <section class="proposal-document-title"><span>INVESTMENT PROPOSAL · ${escapeHtml(today.toUpperCase())}</span><h2>Household investment proposal</h2><p>Prepared for <strong>${escapeHtml(proposal.members.join(" & ") || proposal.householdName)}</strong></p></section>
        <section class="proposal-executive-summary"><div><span>HOUSEHOLD</span><strong>${escapeHtml(proposal.householdName)}</strong><small>${escapeHtml(proposal.decisionTitle)}</small></div><div><span>PROPOSED INVESTMENT</span><strong>${formatWealthCurrency(proposal.totalAmount)}</strong><small>${escapeHtml(proposal.sourceLabel)}</small></div><div><span>SOLUTIONS</span><strong>${proposal.candidates.length}</strong><small>${weightedFee ? `${weightedFee.toFixed(2)}% weighted fee` : "Selected investment mix"}</small></div></section>
        <section class="proposal-document-section"><span class="proposal-section-label">WHY THIS CHANGE</span><h3>A portfolio decision grounded in the household</h3><p>${escapeHtml(proposal.rationale)}</p><div class="proposal-source-note"><span>Source of funds</span><strong>${escapeHtml(proposal.sourceLabel)}</strong><small>${escapeHtml(proposal.sourceValue)}</small></div></section>
        ${proposal.sections.householdImpact ? `<section class="proposal-document-section"><span class="proposal-section-label">HOUSEHOLD IMPACT</span><h3>What changes in the modeled portfolio</h3>${proposalImpactMarkup(proposal)}</section>` : ""}
        ${proposal.sections.householdImpact ? proposalAllocationMarkup(proposal) : ""}
        ${proposal.sections.proposedSolutions ? `<section class="proposal-document-section"><span class="proposal-section-label">PROPOSED SOLUTIONS</span><h3>How the capital would be allocated</h3>${proposalSolutionMarkup(proposal)}</section>` : ""}
        ${proposal.sections.costsAndConsiderations ? `<section class="proposal-document-section proposal-considerations"><span class="proposal-section-label">COSTS & CONSIDERATIONS</span><div><p><strong>Estimated product cost</strong><span>${weightedFee ? `${weightedFee.toFixed(2)}% weighted annual product fee, approximately ${formatWealthCurrency(annualProductCost)} per year on the proposed amount. Advisory, custody and transaction charges are additional where applicable.` : "Review product-level fees and applicable advisory charges before implementation."}</span></p><p><strong>Taxes</strong><span>Realized gains and tax consequences require review. No tax liability is estimated in this proposal.</span></p><p><strong>Implementation</strong><span>Final eligibility, restrictions, account funding and operational readiness must be confirmed before execution.</span></p></div></section>` : ""}
        ${proposal.sections.nextSteps ? `<section class="proposal-document-section proposal-next-steps"><span class="proposal-section-label">NEXT STEPS</span><h3>Review together before anything is implemented</h3><ol><li><i>1</i><span><strong>Discuss the proposed change</strong><small>Confirm the household objective and the amount to reposition.</small></span></li><li><i>2</i><span><strong>Review the selected solutions</strong><small>Consider strategy, fees, risks, liquidity and tax implications.</small></span></li><li><i>3</i><span><strong>Approve implementation</strong><small>No transaction occurs until the required client and firm approvals are complete.</small></span></li></ol></section>` : ""}
        <section class="proposal-disclosures"><strong>Important information</strong><p>This document is an illustrative discussion aid and is not a trade confirmation, offer or solicitation. It does not by itself authorize a transaction. Proposed investments remain subject to suitability, best-interest, product eligibility, concentration, liquidity, tax, account and firm-approval review. Values and market data are as of the date shown and may change. Past performance does not guarantee future results. Fees reduce returns; consult current product materials, Form CRS, applicable Form ADV disclosures and offering documents before implementation. Tax information is general and is not tax advice. Client consent and all required supervisory approvals must be documented before any transaction.</p></section>
        <footer class="proposal-document-footer"><span>Illustrative client proposal · Prepared for discussion</span><span>${escapeHtml(proposal.id)}</span></footer>
      </main>
      <aside class="proposal-composer">
        <div class="proposal-composer-heading"><span>PROPOSAL CONFIGURATION</span><h2>Shape the client conversation</h2><p>Amounts and included sections update the proposal preview.</p></div>
        <section class="proposal-funding-card"><span>CAPITAL TO ALLOCATE</span><strong>${formatWealthCurrency(proposal.totalAmount)}</strong><small>${escapeHtml(proposal.sourceLabel)}</small><div><i style="width:${Math.min(100, (allocated / Math.max(1, proposal.totalAmount)) * 100)}%"></i></div><p><span>${formatWealthCurrency(allocated)} allocated</span><b class="${allocationValid ? "complete" : ""}">${!minimumsMet ? "Investment minimum not met" : `${formatWealthCurrency(Math.abs(remaining))} ${remaining < 0 ? "over" : "remaining"}`}</b></p></section>
        <section class="proposal-allocation-editor"><div class="proposal-composer-section-heading"><span>ALLOCATION</span><button type="button" data-proposal-rebalance>Split evenly</button></div>${proposal.candidates.map((candidate) => { const belowMinimum = candidate.amount < candidate.minimum; const otherMinimums = proposal.candidates.filter((item) => item.id !== candidate.id).reduce((sum, item) => sum + item.minimum, 0); const maximum = Math.max(candidate.minimum, proposal.totalAmount - otherMinimums); return `<label class="${belowMinimum ? "below-minimum" : ""}"><span><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.symbol || candidate.category)} · ${formatWealthCurrency(candidate.minimum)} minimum</small></span><output>${formatWealthCurrency(candidate.amount)} <em>${proposal.totalAmount ? ((candidate.amount / proposal.totalAmount) * 100).toFixed(0) : 0}%</em></output><input type="range" min="${candidate.minimum}" max="${maximum}" step="5000" value="${candidate.amount}" data-proposal-allocation="${escapeHtml(candidate.id)}" aria-label="Allocation for ${escapeHtml(candidate.name)}" ${proposal.candidates.length === 1 ? "disabled" : ""}/></label>`; }).join("")}</section>
        <section class="proposal-section-editor"><div class="proposal-composer-section-heading"><span>CLIENT SECTIONS</span></div>${[["householdImpact", "Household impact"], ["proposedSolutions", "Proposed solutions"], ["costsAndConsiderations", "Costs & considerations"], ["nextSteps", "Next steps"]].map(([key, label]) => `<label><input type="checkbox" data-proposal-section="${key}" ${proposal.sections[key] ? "checked" : ""}/><span>${label}</span></label>`).join("")}</section>
        <label class="proposal-rationale-editor"><span>ADVISOR RATIONALE</span><textarea maxlength="1200" data-proposal-rationale>${escapeHtml(proposal.rationale)}</textarea></label>
        <button type="button" class="primary-button proposal-generate-button" data-proposal-generate ${allocationValid ? "" : "disabled"}>Finalize client proposal <span aria-hidden="true">→</span></button>
        <small class="proposal-autosave">Draft saved to this household decision</small>
      </aside>
    </div>`);
}

function updateProposal(updates) {
  if (!state.proposal) return null;
  state.proposal = saveProposal({ ...state.proposal, ...updates, status: state.proposal.status === "Ready for client" ? "Draft" : state.proposal.status });
  return state.proposal;
}

function generateClientProposal() {
  const minimumsMet = state.proposal?.candidates.every((candidate) => candidate.amount >= candidate.minimum);
  if (!state.proposal || proposalAllocated() !== state.proposal.totalAmount || !minimumsMet) { showToast(minimumsMet ? "Allocate the full proposal amount first" : "Meet every investment minimum first"); return; }
  state.proposal = markProposalReady(state.proposal.decisionId);
  if (!state.proposal) { showToast("Proposal could not be finalized"); return; }
  setDecisionCandidates(state.proposal.decisionId, state.proposal.candidates);
  setDecisionPlanStatus(state.proposal.decisionId, "Ready for client");
  renderProposalBuilder();
  renderBookRows();
  updateHtml(el("proposalReadyContent"), `<div class="proposal-ready-state"><button type="button" class="proposal-ready-close" data-close-modal="proposalReadyModal" aria-label="Close">×</button><span class="proposal-ready-check">✓</span><small>CLIENT PROPOSAL READY</small><h2>${escapeHtml(state.proposal.householdName)}</h2><p>The ${formatWealthCurrency(state.proposal.totalAmount)} proposal is attached to the household decision and ready for the client conversation.</p><div><button type="button" class="secondary-button" data-proposal-print>Print or save PDF</button><button type="button" class="primary-button" data-proposal-return-household>Return to household</button></div><span class="proposal-ready-meta">${state.proposal.candidates.length} ${state.proposal.candidates.length === 1 ? "solution" : "solutions"} · ${escapeHtml(state.proposal.status)}</span></div>`);
  el("proposalReadyModal").showModal();
}

function toggleCompare(id, checked) {
  const item = state.items.find((candidate) => candidate.id === id) || state.currentDetail;
  if (checked) {
    if (state.compare.size >= 4) { showToast("You can compare up to four investments"); renderResults(); return; }
    if (item) state.compare.set(id, item);
  } else state.compare.delete(id);
  renderCompareTray();
  renderResults();
}

function chartSvg(series, benchmarkSeries = []) {
  if (!series?.length) return "";
  const width = 760, height = 210, paddingX = 12, paddingY = 18;
  const all = [...series, ...benchmarkSeries];
  const min = Math.min(...all), max = Math.max(...all), spread = max - min || 1;
  const points = (values) => values.map((value, index) => `${paddingX + index * ((width - paddingX * 2) / (values.length - 1))},${height - paddingY - ((value - min) / spread) * (height - paddingY * 2)}`).join(" ");
  const investmentPoints = points(series);
  const benchmarkPoints = benchmarkSeries.length ? points(benchmarkSeries) : "";
  const area = `${paddingX},${height - paddingY} ${investmentPoints} ${width - paddingX},${height - paddingY}`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Illustrative investment and benchmark performance"><defs><linearGradient id="profileChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#16764d" stop-opacity=".18"/><stop offset="1" stop-color="#16764d" stop-opacity="0"/></linearGradient></defs><line x1="12" y1="54" x2="748" y2="54"/><line x1="12" y1="105" x2="748" y2="105"/><line x1="12" y1="156" x2="748" y2="156"/><polygon points="${area}" fill="url(#profileChartFill)"/>${benchmarkPoints ? `<polyline points="${benchmarkPoints}" class="benchmark-line"/>` : ""}<polyline points="${investmentPoints}" class="investment-line"/></svg>`;
}

function detailSummary(id) {
  return state.items.find((item) => item.id === id || item.symbol?.toLowerCase() === String(id).toLowerCase())
    || [...state.compare.values()].find((item) => item.id === id)
    || (state.currentDetail?.id === id ? state.currentDetail : null);
}

function fetchDetail(id) {
  const key = String(id).toLowerCase();
  if (state.detailCache.has(key)) return state.detailCache.get(key);
  const pending = fetch(`/api/detail?id=${encodeURIComponent(id)}`).then(async (response) => {
    if (!response.ok) throw new Error(response.status === 404 ? "Investment not found" : "Unable to load investment research");
    const item = await response.json();
    state.detailCache.set(item.id.toLowerCase(), Promise.resolve(item));
    state.detailCache.set(String(item.canonicalSlug).toLowerCase(), Promise.resolve(item));
    return item;
  }).catch((error) => { state.detailCache.delete(key); throw error; });
  state.detailCache.set(key, pending);
  return pending;
}

function renderDetailSkeleton(summary) {
  el("drawerLoading").innerHTML = `${summary ? `<div class="profile-loading-identity">${productMark(summary)}<div><strong>${escapeHtml(summary.name)}</strong><span>${escapeHtml(summary.category)} · ${escapeHtml(summary.manager)}</span></div></div>` : ""}<div class="profile-skeleton"><i></i><i></i><i></i><i></i></div><p>Loading research profile…</p>`;
  el("drawerLoading").hidden = false;
  el("drawerContent").hidden = true;
}

function factGrid(items, className = "profile-facts") {
  return `<div class="${className}">${items.map((item) => `<div><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong>${item.context ? `<span>${escapeHtml(item.context)}</span>` : ""}</div>`).join("")}</div>`;
}

function pairedFactsTable(items) {
  const pairs = [];
  for (let index = 0; index < items.length; index += 2) pairs.push(items.slice(index, index + 2));
  return `<table class="profile-data-table paired-facts"><tbody>${pairs.map((pair) => `<tr>${pair.map((item) => `<th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td>`).join("")}${pair.length === 1 ? "<th></th><td></td>" : ""}</tr>`).join("")}</tbody></table>`;
}

function metricTable(items, className = "") {
  const hasContext = items.some((item) => item.context);
  return `<table class="profile-data-table metric-table ${className}"><thead><tr><th>Metric</th><th>Value</th>${hasContext ? "<th>Interpretation</th>" : ""}</tr></thead><tbody>${items.map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td>${hasContext ? `<td>${escapeHtml(item.context || "—")}</td>` : ""}</tr>`).join("")}</tbody></table>`;
}

function holdingsTable(items) {
  return `<table class="profile-data-table holdings-table"><thead><tr><th>#</th><th>Holding / characteristic</th></tr></thead><tbody>${items.map((holding, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><th>${escapeHtml(holding)}</th></tr>`).join("")}</tbody></table>`;
}

function breakdownRows(items) {
  return `<div class="exposure-bars">${items.map((item) => `<div><span>${escapeHtml(item.label)}</span><progress value="${Math.min(100, Math.max(2, Number(item.value) || 0))}" max="100">${escapeHtml(item.value)}%</progress><strong>${escapeHtml(item.value)}%</strong></div>`).join("")}</div>`;
}

function renderResearchProfile(item) {
  const profile = item.profile;
  const controls = item.controls;
  const selected = state.compare.has(item.id);
  const proposed = state.proposalCandidates.has(item.id);
  const saved = isInvestmentSaved(item.id);
  const pageMode = state.detailMode === "page";
  const currentIndex = state.items.findIndex((candidate) => candidate.id === item.id);
  const previous = currentIndex > 0 ? state.items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < state.items.length - 1 ? state.items[currentIndex + 1] : null;
  const controlCell = (label, control, secondary) => `<div class="profile-control-cell"><span>${escapeHtml(label)}</span><strong class="control-tone-${escapeHtml(control.tone)}"><i aria-hidden="true"></i>${escapeHtml(control.label)}</strong><small>${escapeHtml(secondary)}</small></div>`;
  const navigation = [
    ["Overview", "profile-overview"], ["Recent changes", "profile-changes"], ["Performance", "profile-performance"], [profile.composition.title, "profile-composition"],
    ["Risk", "profile-risk"], ["Fees & operations", "profile-fees"], ["UPS research", "profile-research"],
  ];
  el("drawerContent").innerHTML = `<header class="profile-hero">
      <div class="profile-utility">
        ${pageMode ? `<a class="profile-back" href="/investments">${backLabel("Back to screener")}</a>` : `<button class="profile-back" data-close-drawer>${backLabel("Back to results")}</button>`}
        <div class="profile-stepper"><button data-profile-neighbor="${escapeHtml(previous?.id || "")}" ${previous ? "" : "disabled"} aria-label="Previous result">←</button><span>${currentIndex >= 0 ? `${currentIndex + 1} of ${state.items.length} on this page` : "Investment profile"}</span><button data-profile-neighbor="${escapeHtml(next?.id || "")}" ${next ? "" : "disabled"} aria-label="Next result">→</button></div>
        ${pageMode ? "" : `<a class="open-new-tab" href="${escapeHtml(profileHref(item))}" target="_blank" rel="noopener">Open in new tab ↗</a>`}
      </div>
      <div class="profile-identity">
        <div class="profile-name-block"><div class="profile-large-mark">${productMark(item)}</div><div><span class="drawer-type">${escapeHtml(item.category)} · ${escapeHtml(item.type)}</span><h2 id="detailTitle">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.symbol)} · ${escapeHtml(item.manager)}</p><div class="drawer-badges">${item.flags.map(badge).join("")}</div></div></div>
        <div class="profile-quote"><small>${escapeHtml(profile.quote.label)}</small><strong>${escapeHtml(profile.quote.value)}</strong><span class="quote-change ${escapeHtml(profile.quote.changeTone)}">${escapeHtml(profile.quote.change)}</span><div><small>${escapeHtml(profile.quote.secondaryLabel)}</small><b>${escapeHtml(profile.quote.secondaryValue)}</b></div><em>${escapeHtml(profile.quote.asOf)}</em></div>
      </div>
      <div class="profile-actions"><button class="secondary-button" data-save-investment="${escapeHtml(item.id)}">${saved ? "★ Saved" : "☆ Save"}</button><button class="secondary-button" data-drawer-compare="${escapeHtml(item.id)}">${selected ? "Remove from compare" : "⇄ Compare"}</button>${proposalModeActive() ? `<button class="primary-button proposal-profile-add ${proposed ? "selected" : ""}" data-proposal-id="${escapeHtml(item.id)}" aria-pressed="${proposed}">${proposed ? "✓ Added to proposal" : "＋ Add to proposal"}</button>` : ""}</div>
      <div class="profile-control-band" aria-label="Research, shelf, operations and data status">
        ${controlCell("Research", controls.research, `Reviewed ${controls.research.reviewed} · Next ${controls.research.nextReview}`)}
        ${controlCell("Shelf", controls.shelf, controls.shelf.detail)}
        ${controlCell("Operations", controls.operations, controls.operations.detail)}
        ${controlCell("Data", controls.data, `${controls.data.detail} · ${controls.data.source}`)}
      </div>
    </header>
    <nav class="profile-nav" aria-label="Investment profile sections">${navigation.map(([label, section]) => `<button data-profile-section="${section}">${escapeHtml(label)}</button>`).join("")}</nav>
    <div class="profile-body">
      <section class="profile-section" id="profile-overview"><div class="section-heading"><span>Decision snapshot</span><h3>Investment overview</h3><p>Mandate, benchmark and key characteristics in one underwriting view.</p></div><div class="overview-layout"><div class="profile-description"><h4>Mandate</h4><p>${escapeHtml(item.description)}</p><dl><div><dt>Objective</dt><dd>${escapeHtml(item.objective)}</dd></div><div><dt>Benchmark</dt><dd>${escapeHtml(item.benchmark)}</dd></div></dl></div><div class="snapshot-table"><div class="table-caption"><strong>Key facts</strong><span>As of ${escapeHtml(item.asOf)}</span></div>${pairedFactsTable(profile.keyFacts)}</div></div></section>
      <section class="profile-section changes-section" id="profile-changes"><div class="section-heading"><span>Monitoring</span><h3>Recent changes</h3><p>Material research, shelf and data activity in one reviewable history.</p></div><div class="change-log">${controls.changes.map((change) => `<article class="change-row"><time>${escapeHtml(change.date)}</time><span class="change-type">${escapeHtml(change.type)}</span><div><h4>${escapeHtml(change.title)}</h4><p>${escapeHtml(change.summary)}</p></div><small>${escapeHtml(change.owner)}</small></article>`).join("")}</div></section>
      <section class="profile-section" id="profile-performance"><div class="section-heading"><span>Track record</span><h3>${escapeHtml(profile.performance.title)}</h3><p>${escapeHtml(profile.performance.subtitle)}</p></div><div class="performance-layout"><div class="profile-chart"><div class="chart-legend"><span class="investment">Investment</span><span class="benchmark">${escapeHtml(item.benchmark)}</span></div>${chartSvg(profile.performance.series, profile.performance.benchmarkSeries)}</div><table class="performance-table"><thead><tr><th>Period</th><th>Investment</th><th>Benchmark</th><th>Excess</th></tr></thead><tbody>${profile.performance.rows.map((row) => { const excess = Number((row.investment - row.benchmark).toFixed(2)); return `<tr><th>${escapeHtml(row.period)}</th><td>${formatReturn(row.investment)}</td><td>${formatReturn(row.benchmark)}</td><td class="${excess >= 0 ? "positive" : "negative"}">${formatReturn(excess)}</td></tr>`; }).join("")}</tbody></table></div></section>
      <section class="profile-section" id="profile-composition"><div class="section-heading"><span>Exposure</span><h3>${escapeHtml(profile.composition.title)}</h3><p>${escapeHtml(profile.composition.subtitle)}</p></div><div class="composition-layout"><div><div class="table-caption"><strong>Exposure mix</strong><span>Illustrative %</span></div>${breakdownRows(profile.composition.breakdown)}</div><div class="characteristic-list"><div class="table-caption"><strong>${profile.composition.holdings.length ? "Key holdings / characteristics" : "Analytical context"}</strong></div>${profile.composition.holdings.length ? holdingsTable(profile.composition.holdings) : `<p>Review fundamentals, valuation, growth and capital-return measures alongside current research.</p>`}</div></div></section>
      <section class="profile-section" id="profile-risk"><div class="section-heading"><span>Decision context</span><h3>Risk & analytical measures</h3><p>Each measure is paired with its analytical meaning and comparison basis.</p></div>${metricTable(profile.riskMetrics, "risk-table")}</section>
      <section class="profile-section" id="profile-fees"><div class="section-heading"><span>Implementation</span><h3>Fees & operations</h3><p>Cost, liquidity and implementation terms in an operational review format.</p></div><div class="fees-layout"><div><div class="table-caption"><strong>Costs</strong></div>${metricTable(profile.fees, "fee-table")}</div><div><div class="table-caption"><strong>Operating terms</strong></div>${metricTable(profile.operations, "operations-table")}</div></div></section>
      <section class="profile-section research-section" id="profile-research"><div class="section-heading"><span>House perspective</span><h3>UPS research & shelf context</h3></div><div class="research-card"><div><span class="research-label">${escapeHtml(profile.research.reviewed)}</span><h4>${escapeHtml(profile.research.title)}</h4><p>${escapeHtml(profile.research.summary)}</p><ul>${profile.research.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul><small>Coverage owner · ${escapeHtml(profile.research.owner)}</small></div><div class="governed-flags"><h4>Governed designations</h4>${item.flagDetails.length ? item.flagDetails.map((flag) => `<div class="flag-detail"><strong>${badge(flag.name)} ${escapeHtml(flag.name)}</strong><span>${escapeHtml(flag.definition)}</span><em>${escapeHtml(flag.owner)}<br>${escapeHtml(flag.effective)}</em></div>`).join("") : `<p>No active governed designations.</p>`}</div></div></section>
      <p class="profile-disclosure">Illustrative prototype data · Not for investment decisions · Values and research shown here are representative of the intended production experience.</p>
    </div>`;
  el("drawerLoading").hidden = true;
  el("drawerContent").hidden = false;
  if (!pageMode) el("drawerContent").querySelector(".profile-back")?.focus();
}

async function openDetail(id, { mode = "panel", pushHistory = true, replaceHistory = false } = {}) {
  const request = ++state.detailRequest;
  if (!el("detailDrawer").classList.contains("open")) state.lastFocus = document.activeElement;
  state.detailMode = mode;
  state.detailHistoryPushed = mode === "panel";
  document.body.classList.toggle("profile-route", mode === "page");
  document.body.classList.toggle("profile-panel-open", mode === "panel");
  document.querySelector("main").inert = mode === "panel";
  document.querySelector(".global-header").inert = mode === "panel";
  el("drawerBackdrop").hidden = mode === "page";
  el("detailDrawer").classList.add("open");
  el("detailDrawer").setAttribute("aria-hidden", "false");
  el("detailDrawer").setAttribute("aria-modal", mode === "panel" ? "true" : "false");
  renderDetailSkeleton(detailSummary(id));
  const summary = detailSummary(id);
  const href = summary ? profileHref(summary) : `/investment/${encodeURIComponent(id)}`;
  if (pushHistory) history.pushState({ profileCanvas: true, id }, "", href);
  else if (replaceHistory) history.replaceState({ ...(history.state || {}), profileCanvas: mode === "panel", id }, "", href);
  try {
    const item = await fetchDetail(id);
    if (request !== state.detailRequest) return;
    state.currentDetail = item;
    renderResearchProfile(item);
    document.title = `${item.symbol} · ${item.name} | Investment Screener`;
    if (replaceHistory || (pushHistory && href !== profileHref(item))) history.replaceState({ ...(history.state || {}), profileCanvas: mode === "panel", id: item.id }, "", profileHref(item));
  } catch (error) {
    if (request !== state.detailRequest) return;
    el("drawerLoading").innerHTML = `<div class="profile-error"><strong>${escapeHtml(error.message)}</strong><p>Return to the screener and select another investment.</p>${mode === "page" ? `<a href="/investments">Back to screener</a>` : `<button data-close-drawer>Back to results</button>`}</div>`;
  }
}

function closeDrawer({ fromHistory = false } = {}) {
  if (!fromHistory && state.detailMode === "panel" && state.detailHistoryPushed && profileFromPath()) { history.back(); return; }
  state.detailRequest += 1;
  el("detailDrawer").classList.remove("open");
  el("detailDrawer").setAttribute("aria-hidden", "true");
  el("drawerBackdrop").hidden = true;
  document.body.classList.remove("profile-route");
  document.body.classList.remove("profile-panel-open");
  document.querySelector("main").inert = false;
  document.querySelector(".global-header").inert = false;
  document.title = workspaceTitle();
  state.detailMode = null;
  state.detailHistoryPushed = false;
  state.currentDetail = null;
  state.lastFocus?.focus?.();
}

function loadCompareChartLibrary() {
  if (!compareChartLibraryPromise) compareChartLibraryPromise = import("/vendor/lightweight-charts.mjs");
  return compareChartLibraryPromise;
}

function fetchComparisonHistory(items) {
  const key = items.map((item) => item.id).join(",");
  if (!compareHistoryCache.has(key)) {
    const request = fetch(`/api/history?ids=${items.map((item) => encodeURIComponent(item.id)).join(",")}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Performance history could not be loaded");
        if (!Array.isArray(data.series) || !data.benchmark) throw new Error("Performance history response is incomplete");
        return data;
      })
      .catch((error) => { compareHistoryCache.delete(key); throw error; });
    compareHistoryCache.set(key, request);
  }
  return compareHistoryCache.get(key);
}

function cutoffForRange(range, asOf) {
  if (range === "MAX") return null;
  const date = new Date(`${asOf}T00:00:00Z`);
  if (range === "YTD") return `${date.getUTCFullYear()}-01-01`;
  const amounts = { "1M": ["month", 1], "3M": ["month", 3], "6M": ["month", 6], "1Y": ["year", 1], "3Y": ["year", 3], "5Y": ["year", 5] };
  const [unit, amount] = amounts[range] || amounts["1Y"];
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() - amount);
  else date.setUTCFullYear(date.getUTCFullYear() - amount);
  return date.toISOString().slice(0, 10);
}

function normalizeComparisonPoints(points, range, asOf) {
  const cutoff = cutoffForRange(range, asOf);
  const visible = cutoff ? points.filter((point) => point.time >= cutoff) : points;
  if (!visible.length) return [];
  const base = visible[0].value;
  return visible.map((point) => ({ time: point.time, value: Number((((point.value / base) - 1) * 100).toFixed(3)) }));
}

function chartTimeToIso(time) {
  if (typeof time === "string") return time;
  if (typeof time === "number") return new Date(time * 1000).toISOString().slice(0, 10);
  if (time && typeof time === "object") return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
  return null;
}

function updateCompareLegend(seriesData = null, time = null) {
  for (const [id, entry] of compareSeries) {
    const output = document.querySelector(`[data-compare-series-value="${CSS.escape(id)}"]`);
    if (!output) continue;
    const point = seriesData?.get(entry.series);
    const fallback = compareRangeData.get(id)?.at(-1);
    const value = point?.value ?? fallback?.value;
    output.textContent = formatChartReturn(value);
    output.classList.toggle("negative", Number(value) < 0);
  }
  const iso = chartTimeToIso(time);
  el("compareChartAsOf").textContent = iso ? `Viewing ${chartDate.format(new Date(`${iso}T00:00:00Z`))}` : `Data through ${chartDate.format(new Date(`${compareChartData.asOf}T00:00:00Z`))}`;
}

function updateCompareChartSummary() {
  const labels = compareChartData.series.map((item) => {
    const value = compareRangeData.get(item.id)?.at(-1)?.value;
    return `${item.symbol} ${formatChartReturn(value)}`;
  });
  if (compareBenchmarkVisible) labels.push(`S&P 500 ${formatChartReturn(compareRangeData.get("benchmark-sp500")?.at(-1)?.value)}`);
  el("compareChartSummary").textContent = `${compareRange} illustrative total return: ${labels.join(", ")}.`;
}

function drawCompareRange() {
  if (!compareChart || !compareChartData) return;
  const inputs = [...compareChartData.series, compareChartData.benchmark];
  for (const item of inputs) {
    const entry = compareSeries.get(item.id);
    if (!entry) continue;
    const data = normalizeComparisonPoints(item.points, compareRange, compareChartData.asOf);
    compareRangeData.set(item.id, data);
    entry.series.setData(data);
    const isBenchmark = item.id === "benchmark-sp500";
    entry.series.applyOptions({ visible: isBenchmark ? compareBenchmarkVisible : !compareHiddenSeries.has(item.id) });
  }
  document.querySelectorAll("[data-compare-range]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.compareRange === compareRange)));
  document.querySelector('[data-compare-series="benchmark-sp500"]')?.toggleAttribute("hidden", !compareBenchmarkVisible);
  compareChart.timeScale().fitContent();
  updateCompareLegend();
  updateCompareChartSummary();
}

function disposeCompareChart() {
  compareChartRequest += 1;
  compareChartResizeObserver?.disconnect();
  compareChartResizeObserver = null;
  if (compareChart && compareCrosshairHandler) compareChart.unsubscribeCrosshairMove(compareCrosshairHandler);
  compareCrosshairHandler = null;
  compareChart?.remove();
  compareChart = null;
  compareChartData = null;
  compareSeries.clear();
  compareRangeData.clear();
}

function setCompareChartStatus(message, { error = false, hidden = false } = {}) {
  const status = el("compareChartStatus");
  status.hidden = hidden;
  status.classList.toggle("error", error);
  if (message) status.querySelector("p").textContent = message;
}

function initializeCompareChart(library, data) {
  disposeCompareChart();
  compareChartData = data;
  const container = el("compareChart");
  compareChart = library.createChart(container, {
    width: Math.max(720, container.clientWidth),
    height: 315,
    layout: { background: { type: library.ColorType.Solid, color: "#ffffff" }, textColor: "#747474", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10, attributionLogo: false },
    grid: { vertLines: { color: "#f1f1ef" }, horzLines: { color: "#ececea" } },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.12 } },
    timeScale: { borderColor: "#ddddda", rightOffset: 0, fixLeftEdge: true, fixRightEdge: true, timeVisible: false, secondsVisible: false },
    crosshair: { mode: library.CrosshairMode.Normal, vertLine: { color: "#8c8c88", width: 1, labelBackgroundColor: "#171717" }, horzLine: { color: "#b8b8b4", width: 1, labelBackgroundColor: "#171717" } },
    localization: { priceFormatter: (value) => formatChartReturn(value) },
    handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
  });

  data.series.forEach((item, index) => {
    const series = compareChart.addSeries(library.LineSeries, { color: COMPARE_COLORS[index], lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 3 });
    compareSeries.set(item.id, { item, series });
  });
  const benchmark = compareChart.addSeries(library.LineSeries, { color: "#343434", lineWidth: 2, lineStyle: library.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 3, visible: compareBenchmarkVisible });
  compareSeries.set(data.benchmark.id, { item: data.benchmark, series: benchmark });
  compareCrosshairHandler = (parameter) => updateCompareLegend(parameter.time ? parameter.seriesData : null, parameter.time);
  compareChart.subscribeCrosshairMove(compareCrosshairHandler);
  compareChartResizeObserver = new ResizeObserver(([entry]) => compareChart?.resize(Math.max(720, Math.round(entry.contentRect.width)), 315));
  compareChartResizeObserver.observe(container);
  drawCompareRange();
}

async function loadComparisonChart(items) {
  const request = ++compareChartRequest;
  setCompareChartStatus("Preparing performance history…");
  try {
    const [library, data] = await Promise.all([loadCompareChartLibrary(), fetchComparisonHistory(items)]);
    if (request !== compareChartRequest || !el("compareModal").open) return;
    initializeCompareChart(library, data);
    setCompareChartStatus("", { hidden: true });
  } catch (error) {
    if (request !== compareChartRequest) return;
    setCompareChartStatus(`${error.message}. The comparison table remains available below.`, { error: true });
  }
}

function renderCompareLegend(items) {
  const itemHtml = items.map((item, index) => `<button type="button" class="compare-legend-item series-color-${index}" data-compare-series="${escapeHtml(item.id)}" aria-pressed="${!compareHiddenSeries.has(item.id)}"><span class="compare-series-swatch" aria-hidden="true"></span><span class="compare-series-copy"><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(item.name)}</small></span><output class="compare-series-value" data-compare-series-value="${escapeHtml(item.id)}">—</output></button>`).join("");
  const benchmarkHtml = `<button type="button" class="compare-legend-item series-benchmark" data-compare-series="benchmark-sp500" aria-pressed="true" ${compareBenchmarkVisible ? "" : "hidden"}><span class="compare-series-swatch" aria-hidden="true"></span><span class="compare-series-copy"><strong>S&amp;P 500</strong><small>Broad US equity benchmark</small></span><output class="compare-series-value" data-compare-series-value="benchmark-sp500">—</output></button>`;
  el("compareLegend").innerHTML = `${itemHtml}${benchmarkHtml}`;
}

function renderCompareModal() {
  const items = [...state.compare.values()];
  if (!items.length) { showToast("Select at least one investment to compare"); return; }
  const itemIds = new Set(items.map((item) => item.id));
  compareHiddenSeries = new Set([...compareHiddenSeries].filter((id) => itemIds.has(id)));
  const rows = [
    ["Vehicle", (item) => item.type], ["Manager / issuer", (item) => item.manager], ["Asset class", (item) => item.assetClass],
    ["Objective", (item) => item.objective], ["Minimum", (item) => formatMinimum(item.minimum)],
    ["Annual fee", (item) => formatFee(item.fee)], ["Risk", (item) => item.risk], ["1-year return", (item) => formatReturn(item.marketSnapshot?.live?.perf1 ?? item.perf1)],
    ["3-year return", (item) => formatReturn(item.marketSnapshot?.live?.perf3 ?? item.perf3)], ["UPS flags", (item) => item.flags.join(", ") || "None"], ["Liquidity", (item) => item.liquidity],
  ];
  renderCompareLegend(items);
  el("compareBenchmark").checked = compareBenchmarkVisible;
  document.querySelectorAll("[data-compare-range]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.compareRange === compareRange)));
  el("compareTableWrap").innerHTML = `<table class="compare-table"><thead><tr><th></th>${items.map((item) => `<th>${escapeHtml(item.name)}<small>${escapeHtml(item.symbol)}</small></th>`).join("")}</tr></thead><tbody>${rows.map(([label, getter]) => `<tr><th>${label}</th>${items.map((item) => `<td>${escapeHtml(getter(item))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  el("compareScroll").scrollTop = 0;
  el("compareModal").showModal();
  requestAnimationFrame(() => loadComparisonChart(items));
}

function renderSavedScreens() {
  const screens = getSavedScreens();
  el("savedList").innerHTML = screens.map((screen) => `<div class="saved-item"><span class="saved-icon">☆</span><div><strong>${escapeHtml(screen.name)}</strong><small>${escapeHtml(screen.subtitle || "Saved investment criteria")}</small></div><button data-run-saved="${escapeHtml(screen.id)}">Run screen</button><button data-delete-saved="${escapeHtml(screen.id)}" aria-label="Delete ${escapeHtml(screen.name)}">×</button></div>`).join("");
  const investments = getSavedInvestments();
  el("savedInvestments").innerHTML = investments.length ? investments.map((item) => `<div class="saved-item"><span class="saved-icon">★</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.symbol)}</small></div><a href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}">Open</a><button data-delete-investment="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join("") : `<p class="saved-empty">No saved investments yet.</p>`;
  el("savedCount").textContent = String(screens.length);
}

function applySavedScreen(id) {
  const screen = getSavedScreens().find((item) => item.id === id);
  if (!screen) return;
  state.category = screen.state.category || "All";
  state.q = screen.state.q || "";
  state.flags = new Set(screen.state.flags || []);
  state.risks = new Set(screen.state.risks || []);
  state.statuses = new Set(screen.state.statuses || []);
  const legacyRanges = {
    ...(Number.isFinite(screen.state.maxMinimum) ? { minimum: { max: screen.state.maxMinimum } } : {}),
    ...(Number.isFinite(screen.state.maxFee) ? { fee: { max: screen.state.maxFee } } : {}),
  };
  const savedRanges = screen.state.ranges || legacyRanges;
  state.ranges = state.category === "All" && state.q ? savedRanges : normalizeRanges(savedRanges, state.category);
  state.sort = SORTS.includes(screen.state.sort) && isSortAllowed(screen.state.sort, state.category, Boolean(state.q)) ? screen.state.sort : defaultSort(Boolean(state.q));
  state.sortExplicit = Boolean(screen.state.sort && state.sort === screen.state.sort);
  state.pendingColumns = Array.isArray(screen.state.columns) ? { category: screen.state.columnCategory || screen.state.category || "All", columns: screen.state.columns } : null;
  el("searchInput").value = state.q;
  el("savedModal").close();
  state.investmentSearchStarted = true;
  setWorkspaceView("investments");
  runSearch();
}

function saveCurrentScreen(name) {
  const screens = getSavedScreens();
  screens.unshift({
    id: `screen-${Date.now()}`,
    name,
    subtitle: `${state.category}${state.flags.size ? ` · ${[...state.flags].join(" · ")}` : ""}`,
    state: { category: state.category, q: state.q, flags: [...state.flags], risks: [...state.risks], statuses: [...state.statuses], ranges: state.ranges, sort: state.sort, columns: selectedColumns(), columnCategory: state.appliedCategory },
  });
  setSavedScreens(screens);
  showToast(`Saved “${name}”`);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(location.search);
  const profile = profileFromPath();
  const household = householdFromPath();
  const proposalId = proposalFromPath();
  const proposal = proposalId ? getProposal(proposalId) : null;
  state.workspaceView = proposalId ? "proposal" : profile || /^\/investments\/?$/i.test(location.pathname) ? "investments" : household ? "wealth" : "book";
  state.currentHouseholdId = proposal?.householdId || household;
  state.proposal = proposal;
  if (proposal) state.proposalCandidates = new Map(proposal.candidates.map((candidate) => [candidate.id, candidate]));
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

document.addEventListener("click", (event) => {
  const workspaceView = event.target.closest("[data-workspace-view]");
  if (workspaceView) {
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
  if (scenarioBack && state.householdScenario?.householdId) returnFromInvestmentContext();
  const wealthRangeButton = event.target.closest("[data-wealth-range]");
  if (wealthRangeButton) { wealthRange = wealthRangeButton.dataset.wealthRange; drawWealthRange(); }
  const wealthInsight = event.target.closest("[data-wealth-insight]");
  if (wealthInsight) handleWealthInsight(wealthInsight.dataset.wealthInsight);
  const wealthAccount = event.target.closest("[data-wealth-account]");
  if (wealthAccount) openWealthDrawer(`account:${wealthAccount.dataset.wealthAccount}`);
  const wealthGoal = event.target.closest("[data-wealth-goal]");
  if (wealthGoal) openWealthDrawer(`goal:${wealthGoal.dataset.wealthGoal}`);
  const decisionOpen = event.target.closest("[data-decision-open]");
  if (decisionOpen) { closeWealthDrawer({ restoreFocus: false }); openDecisionInScreener(decisionOpen.dataset.decisionOpen); }
  const wealthAction = event.target.closest("[data-wealth-action]");
  if (wealthAction?.dataset.wealthAction === "accounts") openWealthDrawer("accounts");
  if (wealthAction?.dataset.wealthAction === "concentration") openPrimaryConcentrationDecision();
  if (wealthAction?.dataset.wealthAction === "relationship") openWealthDrawer("relationship");
  if (wealthAction?.dataset.wealthAction === "decisions") openWealthDrawer("decisions");
  if (wealthAction?.dataset.wealthAction === "meeting") openWealthDrawer("meeting");
  if (wealthAction?.dataset.wealthAction === "timeline") openWealthDrawer("timeline");
  const householdScenario = event.target.closest("[data-household-scenario]");
  if (householdScenario?.dataset.householdScenario === "concentration") applyHouseholdScenario(state.concentrationSearchIntent);
  if (event.target.closest("[data-close-wealth-drawer]") || event.target === el("wealthDrawerBackdrop")) closeWealthDrawer();
  if (event.target.closest("[data-close-decision-studio]") || event.target === el("decisionStudioBackdrop")) closeDecisionStudio();
  if (event.target.closest("[data-decision-build-plan]")) buildActiveDecisionPlan();
  if (event.target.closest("[data-decision-implement]")) launchDecisionImplementation();
  const openProposal = event.target.closest("[data-open-proposal]");
  if (openProposal) { closeDecisionStudio({ restoreFocus: false }); openProposalBuilder(openProposal.dataset.openProposal); }
  const proposalSelection = event.target.closest("[data-proposal-id]");
  if (proposalSelection) toggleProposalCandidate(proposalSelection.dataset.proposalId, !state.proposalCandidates.has(proposalSelection.dataset.proposalId));
  const removeProposal = event.target.closest("[data-remove-proposal]");
  if (removeProposal) toggleProposalCandidate(removeProposal.dataset.removeProposal, false);
  if (event.target.closest("[data-proposal-back-results]")) { setWorkspaceView("investments"); renderProposalTray(); }
  if (event.target.closest("[data-open-decision-from-proposal]")) { setWorkspaceView("investments"); renderProposalTray(); }
  const amountChoice = event.target.closest("[data-scenario-amount]");
  if (amountChoice) refreshEmbeddedMandate({ [amountChoice.dataset.scenarioAmountKey || "redeployAmount"]: Number(amountChoice.dataset.scenarioAmount) });
  if (event.target.closest("[data-proposal-generate]")) generateClientProposal();
  if (event.target.closest("[data-proposal-rebalance]") && state.proposal) {
    const candidates = allocateProposalCandidates(state.proposal.candidates, state.proposal.totalAmount);
    state.proposalCandidates = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    updateProposal({ candidates });
    renderProposalBuilder();
  }
  if (event.target.closest("[data-proposal-print]")) window.print();
  if (event.target.closest("[data-proposal-return-household]") && state.proposal) {
    el("proposalReadyModal").close();
    openHousehold(state.proposal.householdId);
  }
  const planStep = event.target.closest("[data-decision-plan-step]");
  if (planStep && state.activeDecisionDetail) { state.activeDecisionPlan = toggleDecisionPlanStep(state.activeDecisionDetail.decision.id, planStep.dataset.decisionPlanStep); renderDecisionStudio(); renderBookRows(); }
  const sortHeader = event.target.closest("[data-sort-header]");
  if (sortHeader) {
    state.sort = sortHeader.dataset.sortHeader;
    state.sortExplicit = true;
    renderSortControl();
    runSearch();
  }
  const columnPreset = event.target.closest("[data-column-preset]");
  if (columnPreset) {
    columnDraft = [...(CATEGORY_COLUMN_PRESETS[state.appliedCategory]?.[columnPreset.dataset.columnPreset] || CATEGORY_DEFAULT_COLUMNS[state.appliedCategory])];
    renderColumnConfigurator();
  }
  const columnMove = event.target.closest("[data-column-move]");
  if (columnMove) {
    const index = columnDraft.indexOf(columnMove.dataset.column);
    const destination = columnMove.dataset.columnMove === "up" ? index - 1 : index + 1;
    if (index >= 0 && destination >= 0 && destination < columnDraft.length) [columnDraft[index], columnDraft[destination]] = [columnDraft[destination], columnDraft[index]];
    renderColumnConfigurator();
  }
  const columnRemove = event.target.closest("[data-column-remove]");
  if (columnRemove && columnDraft.length > 1) {
    columnDraft = columnDraft.filter((column) => column !== columnRemove.dataset.columnRemove);
    renderColumnConfigurator();
  }
  const range = event.target.closest("[data-compare-range]");
  if (range && COMPARE_RANGE_OPTIONS.has(range.dataset.compareRange)) { compareRange = range.dataset.compareRange; drawCompareRange(); }
  const chartSeries = event.target.closest("[data-compare-series]");
  if (chartSeries && chartSeries.dataset.compareSeries !== "benchmark-sp500") {
    const id = chartSeries.dataset.compareSeries;
    if (compareHiddenSeries.has(id)) compareHiddenSeries.delete(id); else compareHiddenSeries.add(id);
    chartSeries.setAttribute("aria-pressed", String(!compareHiddenSeries.has(id)));
    drawCompareRange();
  }
  const category = event.target.closest("[data-category]");
  if (category) { state.category = category.dataset.category; state.appliedCategory = state.category; state.ranges = {}; state.q = state.category === "All" ? state.q : ""; if (state.category !== "All") el("searchInput").value = ""; normalizeActiveSort(); runSearch(); }
  const screen = event.target.closest("[data-screen]");
  if (screen) applyQuickScreen(screen.dataset.screen);
  const detail = event.target.closest("[data-detail-id]");
  if (detail && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (el("savedModal").open) el("savedModal").close();
    if (state.workspaceView !== "investments") setWorkspaceView("investments", { updateHistory: false });
    openDetail(detail.dataset.detailId);
  }
  const remove = event.target.closest("[data-remove-filter]");
  if (remove) removeFilter(remove.dataset.removeFilter);
  const resetRange = event.target.closest("[data-reset-range]");
  if (resetRange) { delete state.ranges[resetRange.dataset.resetRange]; runSearch(); }
  const removeCompare = event.target.closest("[data-remove-compare]");
  if (removeCompare) toggleCompare(removeCompare.dataset.removeCompare, false);
  if (event.target.closest("[data-close-drawer]") || event.target === el("drawerBackdrop")) closeDrawer();
  const closeModal = event.target.closest("[data-close-modal]");
  if (closeModal) el(closeModal.dataset.closeModal).close();
  const openModal = event.target.closest("[data-open-modal]");
  if (openModal) { if (el("wealthDrawer").classList.contains("open")) closeWealthDrawer({ restoreFocus: false }); el(openModal.dataset.openModal).showModal(); }
  const openSaved = event.target.closest("[data-open-saved]");
  if (openSaved) { renderSavedScreens(); el("savedModal").showModal(); }
  const runSaved = event.target.closest("[data-run-saved]");
  if (runSaved) applySavedScreen(runSaved.dataset.runSaved);
  const deleteSaved = event.target.closest("[data-delete-saved]");
  if (deleteSaved) { const screens = getSavedScreens().filter((item) => item.id !== deleteSaved.dataset.deleteSaved); setSavedScreens(screens); renderSavedScreens(); showToast("Saved screen removed"); }
  const deleteInvestment = event.target.closest("[data-delete-investment]");
  if (deleteInvestment) { setSavedInvestments(getSavedInvestments().filter((item) => item.id !== deleteInvestment.dataset.deleteInvestment)); renderSavedScreens(); showToast("Investment removed from saved"); }
  const saveInvestment = event.target.closest("[data-save-investment]");
  if (saveInvestment && state.currentDetail) { const saved = toggleSavedInvestment(state.currentDetail); saveInvestment.textContent = saved ? "★ Saved" : "☆ Save"; }
  const drawerCompare = event.target.closest("[data-drawer-compare]");
  if (drawerCompare) {
    toggleCompare(drawerCompare.dataset.drawerCompare, !state.compare.has(drawerCompare.dataset.drawerCompare));
    if (state.currentDetail) renderResearchProfile(state.currentDetail);
  }
  const neighbor = event.target.closest("[data-profile-neighbor]");
  if (neighbor?.dataset.profileNeighbor) openDetail(neighbor.dataset.profileNeighbor, { mode: state.detailMode, pushHistory: false, replaceHistory: true });
  const section = event.target.closest("[data-profile-section]");
  if (section) el(section.dataset.profileSection)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function scheduleDetailPrefetch(target) {
  const detail = target.closest?.("[data-detail-id]");
  if (!detail) return;
  window.clearTimeout(state.prefetchTimer);
  state.prefetchTimer = window.setTimeout(() => fetchDetail(detail.dataset.detailId).catch(() => {}), 160);
}

function prefetchWealthDetail(target) {
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
document.addEventListener("focusin", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchBookHousehold(event.target); });

document.addEventListener("click", (event) => {
  const summary = event.target.closest?.("[data-range-group] > summary");
  const group = summary?.parentElement;
  if (!group || group.open) return;
  group.parentElement.querySelectorAll("[data-range-group][open]").forEach((candidate) => { candidate.open = false; });
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-range-number]")) {
    target.closest("[data-range-input-sizer]").dataset.value = target.value || "0";
    if (target.value !== "") updateRangeSelection(target.dataset.rangeNumber, target.dataset.rangeBound, target.value);
  }
});

document.addEventListener("focusout", (event) => {
  const target = event.target;
  if (!target.matches("[data-range-number]")) return;
  updateRangeSelection(target.dataset.rangeNumber, target.dataset.rangeBound, target.value);
  runSearch();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (event.key !== "Enter" || !target.matches("[data-range-number]")) return;
  event.preventDefault();
  updateRangeSelection(target.dataset.rangeNumber, target.dataset.rangeBound, target.value);
  target.blur();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-column-choice]")) {
    const column = target.dataset.columnChoice;
    if (target.checked && !columnDraft.includes(column)) {
      if (columnDraft.length >= MAX_RESULT_COLUMNS) { target.checked = false; showToast(`Choose up to ${MAX_RESULT_COLUMNS} columns`); }
      else columnDraft.push(column);
    } else if (!target.checked && columnDraft.includes(column)) {
      if (columnDraft.length === 1) { target.checked = true; showToast("Keep at least one column"); }
      else columnDraft = columnDraft.filter((candidate) => candidate !== column);
    }
    renderColumnConfigurator();
  }
  if (target.matches("#compareBenchmark")) { compareBenchmarkVisible = target.checked; drawCompareRange(); }
  if (target.matches('[data-filter="flag"]')) { target.checked ? state.flags.add(target.value) : state.flags.delete(target.value); runSearch(); }
  if (target.matches('[data-filter="risk"]')) { target.checked ? state.risks.add(target.value) : state.risks.delete(target.value); runSearch(); }
  if (target.matches('[data-filter="status"]')) { target.checked ? state.statuses.add(target.value) : state.statuses.delete(target.value); runSearch(); }
  if (target.matches("[data-compare-id]")) toggleCompare(target.dataset.compareId, target.checked);
  if (target.matches("[data-scenario-target]")) refreshEmbeddedMandate({ targetWeight: Number(target.value) });
  if (target.matches("[data-proposal-allocation]") && state.proposal) {
    const amount = Math.max(0, Math.round(Number(target.value) || 0));
    const candidates = reallocateProposalCandidate(state.proposal.candidates, state.proposal.totalAmount, target.dataset.proposalAllocation, amount);
    state.proposalCandidates = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    updateProposal({ candidates });
    renderProposalBuilder();
  }
  if (target.matches("[data-proposal-section]") && state.proposal) {
    updateProposal({ sections: { ...state.proposal.sections, [target.dataset.proposalSection]: target.checked } });
    renderProposalBuilder();
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-proposal-rationale]") || !state.proposal) return;
  updateProposal({ rationale: event.target.value });
});

document.addEventListener("error", (event) => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains("product-logo")) {
    event.target.closest(".product-monogram")?.classList.add("logo-failed");
  }
}, true);

el("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  window.clearTimeout(debounceTimer);
  state.q = el("searchInput").value.trim();
  if (state.q.length === 1) { el("latency").textContent = "Type 1 more"; el("latency").title = "Enter at least two characters to search"; return; }
  runSearch();
});
el("searchInput").addEventListener("input", () => {
  state.q = el("searchInput").value.trim();
  window.clearTimeout(debounceTimer);
  cancelActiveSearch();
  if (state.q.length === 1) { el("latency").textContent = "Type 1 more"; el("latency").title = "Enter at least two characters to search"; return; }
  debouncedSearch();
});
el("bookSearch").addEventListener("input", (event) => {
  state.bookQuery = event.target.value.trim();
  window.clearTimeout(bookSearchTimer);
  bookSearchTimer = window.setTimeout(() => loadBook(), 180);
});
el("bookSort").addEventListener("change", (event) => { state.bookSort = event.target.value; loadBook(); });
el("bookLoadMore").addEventListener("click", () => { if (state.bookNextCursor !== null) { state.bookCursor = state.bookNextCursor; loadBook({ reset: false }); } });
el("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; state.sortExplicit = true; runSearch(); });
el("clearAll").addEventListener("click", () => { state.q = ""; state.category = "All"; state.appliedCategory = "All"; state.flags.clear(); state.risks.clear(); state.statuses.clear(); state.ranges = {}; state.sort = defaultSort(false); state.sortExplicit = false; el("searchInput").value = ""; runSearch(); });
el("prevPage").addEventListener("click", () => { if (state.previousCursor !== null) { state.cursor = state.previousCursor; runSearch({ preserveCursor: true }); window.scrollTo({ top: 330, behavior: "smooth" }); } });
el("nextPage").addEventListener("click", () => { if (state.nextCursor !== null) { state.cursor = state.nextCursor; runSearch({ preserveCursor: true }); window.scrollTo({ top: 330, behavior: "smooth" }); } });
el("compareButton").addEventListener("click", renderCompareModal);
el("compareTopButton").addEventListener("click", renderCompareModal);
el("compareModal").addEventListener("close", disposeCompareChart);
el("compareModal").addEventListener("pointerdown", (event) => {
  const dialog = el("compareModal");
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (event.target === dialog && outside) dialog.close();
});
el("clearCompare").addEventListener("click", () => { state.compare.clear(); renderCompareTray(); renderResults(); });
el("proposalContinue").addEventListener("click", () => openProposalBuilder());
el("saveScreenButton").addEventListener("click", () => { el("saveName").value = state.q ? state.q.slice(0, 60) : `${state.category} screen`; el("saveModal").showModal(); });
el("saveForm").addEventListener("submit", (event) => { event.preventDefault(); saveCurrentScreen(el("saveName").value.trim()); el("saveModal").close(); });
el("dismissInterpretation").addEventListener("click", () => { el("interpretation").hidden = true; });
el("dismissScenario").addEventListener("click", () => {
  state.householdScenario = null;
  state.proposalCandidates.clear();
  el("scenarioRibbon").hidden = true;
  document.body.classList.remove("proposal-mode-active");
  renderProposalTray();
  renderCompareTray();
  renderResults();
  if (state.workspaceView === "investments" && !profileFromPath()) history.replaceState({ workspaceView: "investments" }, "", investmentUrl());
});
el("columnsButton").addEventListener("click", openColumnConfigurator);
el("resetColumns").addEventListener("click", () => { columnDraft = [...CATEGORY_DEFAULT_COLUMNS[state.appliedCategory]]; renderColumnConfigurator(); });
el("applyColumns").addEventListener("click", applyColumnDraft);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (state.workspaceView !== "investments") setWorkspaceView("investments"); el("searchInput").focus(); }
  if (event.key === "Escape" && el("wealthDrawer").classList.contains("open")) closeWealthDrawer();
  if (event.key === "Escape" && state.detailMode === "panel" && el("detailDrawer").classList.contains("open")) closeDrawer();
});

window.addEventListener("popstate", () => {
  const slug = profileFromPath();
  if (slug) {
    setWorkspaceView("investments", { updateHistory: false });
    openDetail(slug, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
    return;
  }
  const proposalId = proposalFromPath();
  if (proposalId) {
    const proposal = getProposal(proposalId);
    if (proposal) {
      state.proposal = proposal;
      state.proposalCandidates = new Map(proposal.candidates.map((candidate) => [candidate.id, candidate]));
      openProposalBuilder(proposalId);
    } else setWorkspaceView("proposal", { updateHistory: false });
    return;
  }
  if (el("detailDrawer").classList.contains("open")) closeDrawer({ fromHistory: true });
  const householdId = householdFromPath();
  if (householdId) { openHousehold(householdId, { updateHistory: false }); return; }
  if (/^\/investments\/?$/i.test(location.pathname)) { setWorkspaceView("investments", { updateHistory: false }); return; }
  setWorkspaceView("book", { updateHistory: false });
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-decision-input]")) scheduleDecisionModel();
});

document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-decision-plan-status]") || !state.activeDecisionDetail) return;
  state.activeDecisionPlan = setDecisionPlanStatus(state.activeDecisionDetail.decision.id, event.target.value);
  renderDecisionStudio();
  renderBookRows();
});

state.columnPreferences = loadColumnPreferences();
hydrateFromUrl();
el("flagGovernance").innerHTML = PRIMARY_FLAGS.map((flag) => `<div class="governance-row"><span class="badge ${FLAG_COLORS[flag]}">${escapeHtml(flag)}</span><div><strong>${escapeHtml(FLAG_DEFINITIONS[flag].owner)}</strong><small>${escapeHtml(FLAG_DEFINITIONS[flag].definition)}</small></div></div>`).join("");
renderCategories();
renderFilterOptions();
renderActiveFilters();
renderSavedScreens();
const initialProfile = profileFromPath();
const initialHousehold = householdFromPath();
const initialProposalId = proposalFromPath();
if (initialProposalId && state.proposal) {
  openHousehold(state.proposal.householdId, { updateHistory: false }).then(() => openProposalBuilder(initialProposalId));
} else if (initialProposalId) {
  setWorkspaceView("proposal", { updateHistory: false });
} else if (initialHousehold) {
  openHousehold(initialHousehold, { updateHistory: false });
} else {
  setWorkspaceView(state.workspaceView, { updateHistory: false });
  if (state.workspaceView === "book") loadBook();
}
const initialInvestmentLoad = state.workspaceView === "investments" ? ensureInvestmentWorkspaceLoaded() : Promise.resolve();
initialInvestmentLoad.finally(() => {
  if (initialProfile) openDetail(initialProfile, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
});
