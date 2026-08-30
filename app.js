import { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_COLORS, FLAG_DEFINITIONS, PRIMARY_FLAGS, RISKS, STATUSES } from "/lib/shared-config.js";
import { brandLogo } from "/lib/brand-logos.js";
import { CATEGORY_COLUMN_PRESETS, CATEGORY_COLUMN_RULES, CATEGORY_DEFAULT_COLUMNS, COLUMN_DEFINITIONS, MAX_RESULT_COLUMNS, columnLabel, normalizeColumns } from "/lib/column-config.js";
import { defaultSort, headerSort, isSortAllowed, sortOptions, SORTS } from "/lib/sort-config.js";
import { normalizeRanges, parseRanges, rangeDefinitions, serializeRanges } from "/lib/range-config.js";
import noUiSlider from "/vendor/nouislider.mjs";

const number = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const chartDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const COMPARE_COLORS = ["#b51f35", "#246a58", "#315f8f", "#9b7629"];
const COMPARE_RANGE_OPTIONS = new Set(["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"]);

const state = {
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

const elementCache = new Map();
const el = (id) => {
  if (!elementCache.has(id)) elementCache.set(id, document.getElementById(id));
  return elementCache.get(id);
};
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

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
  if (definition.format === "currency") return formatMinimum(numeric);
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
  if (!selected) return `Median ${formatRangeValue(facet.median, definition)}`;
  if (Number.isFinite(selected.min) && Number.isFinite(selected.max)) return `${formatRangeValue(selected.min, definition)}–${formatRangeValue(selected.max, definition)}`;
  if (Number.isFinite(selected.min)) return `≥ ${formatRangeValue(selected.min, definition)}`;
  return `≤ ${formatRangeValue(selected.max, definition)}`;
}

function rangeEstimate(facet, minimum, maximum) {
  const span = facet.max - facet.min || 1;
  return facet.bins.reduce((total, count, index) => {
    const center = facet.min + ((index + .5) / facet.bins.length) * span;
    return center >= minimum && center <= maximum ? total + count : total;
  }, 0);
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

function rangeModule(definition, facet, open) {
  const selection = effectiveRange(definition.field, facet);
  const maximumBin = Math.max(...facet.bins, 1);
  const span = facet.max - facet.min || 1;
  const bars = facet.bins.map((count, index) => {
    const center = facet.min + ((index + .5) / facet.bins.length) * span;
    const selected = center >= selection.min && center <= selection.max;
    const height = Math.max(7, Math.round((count / maximumBin) * 100));
    return `<i class="distribution-bar ${selected ? "selected" : ""}" style="--bar-height:${height}%" data-bin-count="${count}" data-bin-index="${index}"></i>`;
  }).join("");
  const active = Boolean(state.ranges[definition.field]);
  const affixes = rangeAffixes(definition);
  const numberField = (bound, label, value) => `<label class="range-number-control">
    <span class="sr-only">${escapeHtml(label)} ${escapeHtml(definition.label)}</span>
    ${affixes.prefix ? `<span class="range-affix">${affixes.prefix}</span>` : ""}
    <input type="number" data-range-number="${escapeHtml(definition.field)}" data-range-bound="${bound}" min="${facet.min}" max="${facet.max}" step="${definition.step}" value="${value}" inputmode="decimal" />
    ${affixes.suffix ? `<span class="range-affix">${affixes.suffix}</span>` : ""}
  </label>`;
  return `<details class="filter-group distribution-group" data-range-group="${escapeHtml(definition.field)}" ${open ? "open" : ""}>
    <summary><span class="range-summary-title">${escapeHtml(definition.label)}<small data-range-summary>${escapeHtml(rangeSummary(definition, facet))}</small></span><span class="filter-chevron">⌃</span></summary>
    <div class="distribution-filter">
      <div class="distribution-plot">
        <div class="distribution-bars" aria-hidden="true">${bars}</div>
        <div class="range-slider" data-range-slider="${escapeHtml(definition.field)}"></div>
      </div>
      <div class="range-value-row">
        ${numberField("min", "Minimum", rangeInputValue(selection.min, definition))}
        <span class="range-separator">to</span>
        ${numberField("max", "Maximum", rangeInputValue(selection.max, definition))}
        <button type="button" data-reset-range="${escapeHtml(definition.field)}" ${active ? "" : "hidden"}>Reset</button>
      </div>
      <div class="distribution-foot"><span>Median ${escapeHtml(formatRangeValue(facet.median, definition))}</span><span data-range-count>${formatCount(state.total)} matches</span></div>
    </div>
  </details>`;
}

function initializeRangeSlider(definition, facet) {
  const group = document.querySelector(`[data-range-group="${CSS.escape(definition.field)}"]`);
  const target = group?.querySelector(`[data-range-slider="${CSS.escape(definition.field)}"]`);
  if (!group || !target || target.noUiSlider) return;
  const selection = effectiveRange(definition.field, facet);
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
  const span = facet.max - facet.min || 1;
  const slider = group.querySelector(`[data-range-slider="${CSS.escape(field)}"]`);
  if (syncSlider && slider?.noUiSlider) slider.noUiSlider.set([selection.min, selection.max], false);
  group.querySelectorAll(`[data-range-number="${CSS.escape(field)}"]`).forEach((input) => { input.value = rangeInputValue(selection[input.dataset.rangeBound], definition); });
  const reset = group.querySelector("[data-reset-range]");
  reset.hidden = !state.ranges[field];
  group.querySelector("[data-range-summary]").textContent = rangeSummary(definition, facet);
  const estimate = rangeEstimate(facet, selection.min, selection.max);
  group.querySelector("[data-range-count]").textContent = state.ranges[field] ? `≈ ${formatCount(estimate)} matches` : `${formatCount(state.total)} matches`;
  group.querySelectorAll("[data-bin-index]").forEach((bar) => {
    const center = facet.min + ((Number(bar.dataset.binIndex) + .5) / facet.bins.length) * span;
    bar.classList.toggle("selected", center >= selection.min && center <= selection.max);
  });
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
  if (!facet) return;
  if (rawValue === "") {
    const next = { ...(state.ranges[field] || {}) };
    delete next[bound];
    if (Number.isFinite(next.min) || Number.isFinite(next.max)) state.ranges[field] = next;
    else delete state.ranges[field];
    refreshRangeControl(field);
    return;
  }
  const current = effectiveRange(field, facet);
  const value = Math.max(facet.min, Math.min(facet.max, Number(rawValue)));
  if (!Number.isFinite(value)) return;
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

function visibleFlags(flags) {
  const selected = [...state.flags].filter((flag) => flags.includes(flag));
  return [...selected, ...flags.filter((flag) => !selected.includes(flag))].slice(0, Math.max(2, selected.length));
}

function renderMarketHeaders() {
  const columns = selectedColumns();
  el("resultsTable").style.setProperty("--result-columns", String(columns.length));
  el("columnsButton").textContent = `▦ Columns · ${columns.length}/${MAX_RESULT_COLUMNS}`;
  const sortableHeader = (column, label, className = "") => {
    const config = headerSort(state.appliedCategory, column, state.sort);
    if (!config) return `<th class="${className}">${escapeHtml(label)}</th>`;
    const ariaSort = config.active ? (config.direction === "asc" ? "ascending" : "descending") : "none";
    const indicator = config.active ? (config.direction === "asc" ? "↑" : "↓") : "↕";
    return `<th class="${className} sortable-column ${config.active ? "active-sort" : ""}" aria-sort="${ariaSort}"><button type="button" data-sort-header="${escapeHtml(config.nextSort)}" title="Sort by ${escapeHtml(label)}">${escapeHtml(label)}<span aria-hidden="true">${indicator}</span></button></th>`;
  };
  updateHtml(el("resultsHeader"), `<th class="check-cell"><span class="sr-only">Compare</span></th>${sortableHeader("investment", "Investment", "col-investment")}${columns.map((column) => sortableHeader(column, columnLabel(state.appliedCategory, column), `result-data-column col-${escapeHtml(column)}`)).join("")}<th class="action-cell"><span class="sr-only">Actions</span></th>`);
}

function marketMetric(metric) {
  return `<span class="metric-primary">${escapeHtml(metric.value)}</span><span class="metric-secondary">${escapeHtml(metric.label)}</span>`;
}

function marketPrimary(snapshot) {
  return `<div class="market-value-line"><span class="metric-primary">${escapeHtml(snapshot.primary.value)}</span><span class="snapshot-change ${escapeHtml(snapshot.primary.tone)}">${escapeHtml(snapshot.primary.change)}</span></div><span class="metric-secondary">${escapeHtml(snapshot.primary.label)} · ${escapeHtml(snapshot.asOf)}</span>`;
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

const SNAPSHOT_COLUMNS = new Set(["primary", "trend", "featuredDecision", "featuredImplementation", "forwardPE", "dividendYield", "secYield", "expenseRatio", "managerFee", "yieldToWorst", "creditRating", "reportedReturn3Y", "reportedLiquidity", "contingentCoupon", "term", "annualFee", "guaranteePeriod", "return1Y", "custodyFee"]);

function snapshotMetric(snapshot, column) {
  if (!snapshot) return null;
  if (column === "featuredDecision") return snapshot.metrics?.[snapshot.featured?.[0]];
  if (column === "featuredImplementation") return snapshot.metrics?.[snapshot.featured?.[1]];
  return snapshot.metrics?.[column];
}

function renderResultColumn(item, column) {
  const snapshot = item.marketSnapshot;
  if (column === "primary") return snapshot ? marketPrimary(snapshot) : marketSnapshotPlaceholder();
  if (column === "trend") return snapshot ? marketSparkline(snapshot.trend) : marketSnapshotPlaceholder();
  if (SNAPSHOT_COLUMNS.has(column)) return snapshot ? marketMetric(snapshotMetric(snapshot, column) || { value: "—", label: columnLabel(item.category, column) }) : marketSnapshotPlaceholder();
  if (column === "minimum") return marketMetric({ value: formatMinimum(item.minimum), label: "Opening" });
  if (column === "fee") return marketMetric({ value: formatFee(item.fee), label: "Annual" });
  if (column === "risk") return marketMetric({ value: item.risk, label: "Risk level" });
  if (column === "perf1") return marketMetric({ value: formatReturn(item.perf1), label: "Annualized" });
  if (column === "perf3") return marketMetric({ value: formatReturn(item.perf3), label: "Annualized" });
  if (column === "liquidity") return marketMetric({ value: item.liquidity || "—", label: "Terms" });
  if (column === "assetClass") return marketMetric({ value: item.assetClass || "—", label: "Classification" });
  return marketMetric({ value: "—", label: columnLabel(item.category, column) });
}

function resultColspan() { return selectedColumns().length + 3; }

function renderResults() {
  const body = el("resultsBody");
  renderMarketHeaders();
  if (!state.items.length) {
    body.innerHTML = `<tr><td colspan="${resultColspan()}" class="empty-state"><strong>No investments match this screen</strong>Remove one or more filters, or search the full shelf.</td></tr>`;
    return;
  }
  const columns = selectedColumns();
  body.innerHTML = state.items.map((item) => {
    const checked = state.compare.has(item.id);
    return `<tr data-row-id="${escapeHtml(item.id)}">
      <td class="check-cell"><input class="row-check" type="checkbox" data-compare-id="${escapeHtml(item.id)}" aria-label="Compare ${escapeHtml(item.name)}" ${checked ? "checked" : ""}/></td>
      <td><div class="investment-cell">${productMark(item)}<div class="investment-meta"><a href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</a><div class="investment-sub">${escapeHtml(item.type)} · ${escapeHtml(item.manager)}${item.matchReason ? `<span class="match-reason">${escapeHtml(item.matchReason)}</span>` : ""}<span class="badges">${visibleFlags(item.flags).map(badge).join("")}</span></div></div></div></td>
      ${columns.map((column) => `<td class="result-data-column col-${escapeHtml(column)} ${column === "primary" ? "market-primary" : ""}">${renderResultColumn(item, column)}</td>`).join("")}
      <td class="action-cell"><a class="row-menu" href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.name)}">›</a></td>
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
    state.items = state.items.map((item) => ({ ...item, marketSnapshot: state.snapshotCache.get(item.id) }));
    renderResults();
  } catch (error) {
    if (error.name !== "AbortError") console.warn("Market snapshots unavailable", error);
  }
}

function syncUrl() {
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
  if (!profileFromPath()) history.replaceState(null, "", params.size ? `/?${params}` : "/");
}

async function runSearch({ preserveCursor = false } = {}) {
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
  el("compareTray").hidden = count === 0;
  el("compareItems").innerHTML = [...state.compare.values()].map((item) => `<div class="compare-item"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.symbol)}</small><button data-remove-compare="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join("");
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
  const selected = state.compare.has(item.id);
  const saved = isInvestmentSaved(item.id);
  const pageMode = state.detailMode === "page";
  const currentIndex = state.items.findIndex((candidate) => candidate.id === item.id);
  const previous = currentIndex > 0 ? state.items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < state.items.length - 1 ? state.items[currentIndex + 1] : null;
  const navigation = [
    ["Overview", "profile-overview"], ["Performance", "profile-performance"], [profile.composition.title, "profile-composition"],
    ["Risk", "profile-risk"], ["Fees & operations", "profile-fees"], ["UPS research", "profile-research"],
  ];
  el("drawerContent").innerHTML = `<header class="profile-hero">
      <div class="profile-utility">
        ${pageMode ? `<a class="profile-back" href="/">← Back to screener</a>` : `<button class="profile-back" data-close-drawer>← Back to results</button>`}
        <div class="profile-stepper"><button data-profile-neighbor="${escapeHtml(previous?.id || "")}" ${previous ? "" : "disabled"} aria-label="Previous result">←</button><span>${currentIndex >= 0 ? `${currentIndex + 1} of ${state.items.length} on this page` : "Investment profile"}</span><button data-profile-neighbor="${escapeHtml(next?.id || "")}" ${next ? "" : "disabled"} aria-label="Next result">→</button></div>
        ${pageMode ? "" : `<a class="open-new-tab" href="${escapeHtml(profileHref(item))}" target="_blank" rel="noopener">Open in new tab ↗</a>`}
      </div>
      <div class="profile-identity">
        <div class="profile-name-block"><div class="profile-large-mark">${productMark(item)}</div><div><span class="drawer-type">${escapeHtml(item.category)} · ${escapeHtml(item.type)}</span><h2 id="detailTitle">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.symbol)} · ${escapeHtml(item.manager)}</p><div class="drawer-badges">${item.flags.map(badge).join("")}</div></div></div>
        <div class="profile-quote"><small>${escapeHtml(profile.quote.label)}</small><strong>${escapeHtml(profile.quote.value)}</strong><span class="quote-change ${escapeHtml(profile.quote.changeTone)}">${escapeHtml(profile.quote.change)}</span><div><small>${escapeHtml(profile.quote.secondaryLabel)}</small><b>${escapeHtml(profile.quote.secondaryValue)}</b></div><em>${escapeHtml(profile.quote.asOf)}</em></div>
      </div>
      <div class="profile-actions"><button class="secondary-button" data-save-investment="${escapeHtml(item.id)}">${saved ? "★ Saved" : "☆ Save"}</button><button class="primary-button" data-drawer-compare="${escapeHtml(item.id)}">${selected ? "Remove from compare" : "＋ Add to compare"}</button></div>
    </header>
    <nav class="profile-nav" aria-label="Investment profile sections">${navigation.map(([label, section]) => `<button data-profile-section="${section}">${escapeHtml(label)}</button>`).join("")}</nav>
    <div class="profile-body">
      <section class="profile-section" id="profile-overview"><div class="section-heading"><span>Decision snapshot</span><h3>Investment overview</h3><p>Mandate, benchmark and key characteristics in one underwriting view.</p></div><div class="overview-layout"><div class="profile-description"><h4>Mandate</h4><p>${escapeHtml(item.description)}</p><dl><div><dt>Objective</dt><dd>${escapeHtml(item.objective)}</dd></div><div><dt>Benchmark</dt><dd>${escapeHtml(item.benchmark)}</dd></div></dl></div><div class="snapshot-table"><div class="table-caption"><strong>Key facts</strong><span>As of ${escapeHtml(item.asOf)}</span></div>${pairedFactsTable(profile.keyFacts)}</div></div></section>
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
    el("drawerLoading").innerHTML = `<div class="profile-error"><strong>${escapeHtml(error.message)}</strong><p>Return to the screener and select another investment.</p>${mode === "page" ? `<a href="/">Back to screener</a>` : `<button data-close-drawer>Back to results</button>`}</div>`;
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
  document.title = "Investment Screener";
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
    ["Annual fee", (item) => formatFee(item.fee)], ["Risk", (item) => item.risk], ["1-year return", (item) => formatReturn(item.perf1)],
    ["3-year return", (item) => formatReturn(item.perf3)], ["UPS flags", (item) => item.flags.join(", ") || "None"], ["Liquidity", (item) => item.liquidity],
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
  if (openModal) el(openModal.dataset.openModal).showModal();
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

document.addEventListener("pointerover", (event) => scheduleDetailPrefetch(event.target));
document.addEventListener("focusin", (event) => scheduleDetailPrefetch(event.target));

document.addEventListener("click", (event) => {
  const summary = event.target.closest?.("[data-range-group] > summary");
  const group = summary?.parentElement;
  if (!group || group.open) return;
  group.parentElement.querySelectorAll("[data-range-group][open]").forEach((candidate) => { candidate.open = false; });
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-range-number]") && target.value !== "") updateRangeSelection(target.dataset.rangeNumber, target.dataset.rangeBound, target.value);
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
el("saveScreenButton").addEventListener("click", () => { el("saveName").value = state.q ? state.q.slice(0, 60) : `${state.category} screen`; el("saveModal").showModal(); });
el("saveForm").addEventListener("submit", (event) => { event.preventDefault(); saveCurrentScreen(el("saveName").value.trim()); el("saveModal").close(); });
el("dismissInterpretation").addEventListener("click", () => { el("interpretation").hidden = true; });
el("columnsButton").addEventListener("click", openColumnConfigurator);
el("resetColumns").addEventListener("click", () => { columnDraft = [...CATEGORY_DEFAULT_COLUMNS[state.appliedCategory]]; renderColumnConfigurator(); });
el("applyColumns").addEventListener("click", applyColumnDraft);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el("searchInput").focus(); }
  if (event.key === "Escape" && state.detailMode === "panel" && el("detailDrawer").classList.contains("open")) closeDrawer();
});

window.addEventListener("popstate", () => {
  const slug = profileFromPath();
  if (!slug) { closeDrawer({ fromHistory: true }); return; }
  openDetail(slug, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
});

state.columnPreferences = loadColumnPreferences();
hydrateFromUrl();
el("flagGovernance").innerHTML = PRIMARY_FLAGS.map((flag) => `<div class="governance-row"><span class="badge ${FLAG_COLORS[flag]}">${escapeHtml(flag)}</span><div><strong>${escapeHtml(FLAG_DEFINITIONS[flag].owner)}</strong><small>${escapeHtml(FLAG_DEFINITIONS[flag].definition)}</small></div></div>`).join("");
renderCategories();
renderFilterOptions();
renderActiveFilters();
renderSavedScreens();
const initialProfile = profileFromPath();
runSearch({ preserveCursor: true }).finally(() => {
  if (initialProfile) openDetail(initialProfile, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
});
