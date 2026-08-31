import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app.js", import.meta.url);
let source = await readFile(path, "utf8");

function replaceOnce(label, before, after) {
  if (!source.includes(before)) throw new Error(`Missing app.js patch anchor: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "wealth imports",
  'import { CONCENTRATION_REVIEW, HOUSEHOLD, HOUSEHOLD_ACCOUNTS, HOUSEHOLD_GOALS, HOUSEHOLD_HOLDINGS, HOUSEHOLD_INSIGHTS, WEALTH_ALLOCATION, WEALTH_HISTORY } from "/lib/wealth-data.js";\nimport noUiSlider from "/vendor/nouislider.mjs";',
  'import { HOUSEHOLD, HOUSEHOLD_ACCOUNTS, HOUSEHOLD_GOALS, HOUSEHOLD_HOLDINGS, HOUSEHOLD_INSIGHTS, WEALTH_ALLOCATION, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadWealthHistory } from "/lib/wealth-data.js";',
);

replaceOnce(
  "investment search state",
  '  columnPreferences: {},\n  pendingColumns: null,\n};',
  '  columnPreferences: {},\n  pendingColumns: null,\n  investmentSearchStarted: false,\n};',
);

replaceOnce(
  "wealth async state",
  'let wealthChartResizeObserver = null;\nlet wealthRange = "1Y";',
  'let wealthChartResizeObserver = null;\nlet wealthRange = "1Y";\nlet wealthHistory = null;\nlet wealthDrawerRequest = 0;\nlet initialInvestmentSearchPromise = null;\nlet rangeSliderLibraryPromise = null;',
);

replaceOnce(
  "history source",
  '  return WEALTH_HISTORY.filter((point) => new Date(`${point.time}T00:00:00Z`) >= cutoff);',
  '  return (wealthHistory || []).filter((point) => new Date(`${point.time}T00:00:00Z`) >= cutoff);',
);

replaceOnce(
  "lazy chart history",
  '    const library = await loadCompareChartLibrary();\n    if (state.workspaceView !== "wealth" || wealthChart) return;',
  '    const [library, history] = await Promise.all([loadCompareChartLibrary(), loadWealthHistory()]);\n    if (state.workspaceView !== "wealth" || wealthChart) return;\n    wealthHistory = history;',
);

replaceOnce(
  "lazy investment workspace",
  '  } else {\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  }\n}\n\nfunction closeWealthDrawer',
  '  } else {\n    ensureInvestmentWorkspaceLoaded();\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  }\n}\n\nfunction closeWealthDrawer',
);

replaceOnce(
  "invalidate drawer request",
  'function closeWealthDrawer({ restoreFocus = true } = {}) {\n  el("wealthDrawer").classList.remove("open");',
  'function closeWealthDrawer({ restoreFocus = true } = {}) {\n  wealthDrawerRequest += 1;\n  el("wealthDrawer").classList.remove("open");',
);

replaceOnce(
  "concentration drawer input",
  'function concentrationDrawer() {\n  const review = CONCENTRATION_REVIEW;',
  'function concentrationDrawer(review) {',
);

replaceOnce(
  "account drawer input",
  'function accountDrawer(accountId) {\n  const account = HOUSEHOLD_ACCOUNTS.find((item) => item.id === accountId);',
  'function accountDrawer(account) {',
);

replaceOnce(
  "goal drawer input",
  'function goalDrawer(goalId) {\n  const goal = HOUSEHOLD_GOALS.find((item) => item.id === goalId);',
  'function goalDrawer(goal) {',
);

const oldOpenDrawer = `function openWealthDrawer(id) {
  state.lastFocus = document.activeElement;
  if (id === "concentration") el("wealthDrawerContent").innerHTML = concentrationDrawer();
  else if (id === "accounts") el("wealthDrawerContent").innerHTML = accountsDrawer();
  else if (id.startsWith("account:")) el("wealthDrawerContent").innerHTML = accountDrawer(id.slice(8));
  else if (id.startsWith("goal:")) el("wealthDrawerContent").innerHTML = goalDrawer(id.slice(5));
  else el("wealthDrawerContent").innerHTML = operationalDrawer(id);
  el("wealthDrawerBackdrop").hidden = false;
  el("wealthDrawer").classList.add("open");
  el("wealthDrawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("wealth-drawer-open");
  document.querySelector("main").inert = true;
  document.querySelector(".global-header").inert = true;
  requestAnimationFrame(() => el("wealthDrawer").querySelector("[data-close-wealth-drawer]")?.focus());
}`;

const newOpenDrawer = `function wealthDrawerLoading() {
  return \`<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD DETAIL</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">Loading household detail…</h2><p>Retrieving only the data needed for this view.</p></div>\`;
}

function wealthDrawerError(error) {
  return \`<header class="wealth-drawer-header"><div><span class="eyebrow">HOUSEHOLD DETAIL</span><button type="button" class="wealth-drawer-back" data-close-wealth-drawer>← Back to Total Wealth</button></div><button type="button" class="wealth-drawer-close" data-close-wealth-drawer aria-label="Close">×</button></header><div class="wealth-drawer-body operational-review"><h2 id="wealthDrawerTitle">Household detail unavailable</h2><p>\${escapeHtml(error.message || "Unable to load household detail")}</p></div>\`;
}

async function openWealthDrawer(id) {
  const request = ++wealthDrawerRequest;
  state.lastFocus = document.activeElement;
  let html = null;
  let detailRequest = null;
  if (id === "concentration") detailRequest = loadConcentrationReview().then(concentrationDrawer);
  else if (id === "accounts") html = accountsDrawer();
  else if (id.startsWith("account:")) detailRequest = loadHouseholdAccount(id.slice(8)).then(accountDrawer);
  else if (id.startsWith("goal:")) detailRequest = loadHouseholdGoal(id.slice(5)).then(goalDrawer);
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
}`;
replaceOnce("async wealth drawers", oldOpenDrawer, newOpenDrawer);

replaceOnce(
  "scenario avoids duplicate load",
  '  showScenarioRibbon(scenario);\n  setWorkspaceView("investments");\n  runSearch();',
  '  showScenarioRibbon(scenario);\n  state.investmentSearchStarted = true;\n  setWorkspaceView("investments");\n  runSearch();',
);

replaceOnce(
  "saved screen avoids duplicate load",
  '  el("savedModal").close();\n  setWorkspaceView("investments");\n  runSearch();',
  '  el("savedModal").close();\n  state.investmentSearchStarted = true;\n  setWorkspaceView("investments");\n  runSearch();',
);

replaceOnce(
  "mark search started",
  'async function runSearch({ preserveCursor = false } = {}) {\n  if (!preserveCursor) state.cursor = 0;',
  'async function runSearch({ preserveCursor = false } = {}) {\n  state.investmentSearchStarted = true;\n  if (!preserveCursor) state.cursor = 0;',
);

replaceOnce(
  "ensure investment loader",
  'let debounceTimer;\nfunction debouncedSearch() {',
  `function ensureInvestmentWorkspaceLoaded() {
  if (state.investmentSearchStarted) return initialInvestmentSearchPromise || Promise.resolve();
  state.investmentSearchStarted = true;
  initialInvestmentSearchPromise = runSearch({ preserveCursor: true }).finally(() => { initialInvestmentSearchPromise = null; });
  return initialInvestmentSearchPromise;
}

let debounceTimer;
function debouncedSearch() {`,
);

replaceOnce(
  "lazy range library helper",
  'function initializeRangeSlider(definition, facet) {',
  `function loadRangeSliderLibrary() {
  if (!rangeSliderLibraryPromise) rangeSliderLibraryPromise = import("/vendor/nouislider.mjs").then((module) => module.default);
  return rangeSliderLibraryPromise;
}

async function initializeRangeSlider(definition, facet) {`,
);

replaceOnce(
  "lazy range library use",
  '  const selection = effectiveRange(definition.field, facet);\n  noUiSlider.create(target, {',
  '  const selection = effectiveRange(definition.field, facet);\n  const noUiSlider = await loadRangeSliderLibrary();\n  if (!target.isConnected || target.noUiSlider) return;\n  noUiSlider.create(target, {',
);

replaceOnce(
  "wealth intent prefetch",
  'document.addEventListener("pointerover", (event) => scheduleDetailPrefetch(event.target));\ndocument.addEventListener("focusin", (event) => scheduleDetailPrefetch(event.target));',
  `function prefetchWealthDetail(target) {
  const account = target.closest?.("[data-wealth-account]");
  if (account) { loadHouseholdAccount(account.dataset.wealthAccount).catch(() => {}); return; }
  const goal = target.closest?.("[data-wealth-goal]");
  if (goal) { loadHouseholdGoal(goal.dataset.wealthGoal).catch(() => {}); return; }
  const concentration = target.closest?.('[data-wealth-insight="concentration"], [data-wealth-action="concentration"]');
  if (concentration) loadConcentrationReview().catch(() => {});
}

document.addEventListener("pointerover", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); });
document.addEventListener("focusin", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); });`,
);

replaceOnce(
  "initial investment search",
  'setWorkspaceView(state.workspaceView, { updateHistory: false });\nconst initialProfile = profileFromPath();\nrunSearch({ preserveCursor: true }).finally(() => {\n  if (initialProfile) openDetail(initialProfile, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });\n});',
  'const initialProfile = profileFromPath();\nsetWorkspaceView(state.workspaceView, { updateHistory: false });\nconst initialInvestmentLoad = state.workspaceView === "investments" ? ensureInvestmentWorkspaceLoaded() : Promise.resolve();\ninitialInvestmentLoad.finally(() => {\n  if (initialProfile) openDetail(initialProfile, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });\n});',
);

await writeFile(path, source);
