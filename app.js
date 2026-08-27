import { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_COLORS, FLAG_DEFINITIONS, PRIMARY_FLAGS, RISKS, SORTS, STATUSES } from "/lib/shared-config.js";
import { brandLogo } from "/lib/brand-logos.js";

const number = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const state = {
  q: "",
  category: "All",
  flags: new Set(),
  risks: new Set(),
  statuses: new Set(),
  maxMinimum: undefined,
  maxFee: undefined,
  sort: "relevance",
  cursor: 0,
  previousCursor: null,
  nextCursor: null,
  total: 130428,
  items: [],
  facets: null,
  controller: null,
  compare: new Map(),
  currentDetail: null,
  lastFocus: null,
};

const el = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function formatCount(value) { return number.format(value || 0); }
function formatMinimum(value) {
  if (!value) return "$0";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 ? 1 : 0)}K`;
  return currency.format(value);
}
function formatFee(value) { return value === null || value === undefined ? "—" : `${Number(value).toFixed(value < 0.1 ? 2 : 2)}%`; }
function formatReturn(value) { return value === null || value === undefined ? "—" : `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`; }
function monogram(item) { return item.symbol?.slice(0, 3) || item.name.split(" ").slice(0, 2).map((part) => part[0]).join(""); }
function productClass(category) { return category === "SMAs" ? "sma" : category === "Fixed Income" ? "fixed" : category === "Equities" ? "equity" : ""; }
function productMark(item) {
  const fallback = `<span class="product-monogram-text">${escapeHtml(monogram(item))}</span>`;
  const logo = brandLogo(item.brandKey);
  if (!logo) return `<span class="product-monogram ${productClass(item.category)}" aria-hidden="true">${fallback}</span>`;
  return `<span class="product-monogram has-logo brand-${escapeHtml(item.brandKey)}" aria-hidden="true" title="${escapeHtml(logo.label)}">${fallback}<img class="product-logo" src="${escapeHtml(logo.src)}" alt="" width="22" height="22" loading="lazy" decoding="async"/></span>`;
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
  el("categoryStrip").innerHTML = CATEGORY_ORDER.map((name) => {
    const count = CATEGORY_COUNTS[name];
    const liveCount = state.facets?.categories?.[name];
    const display = name === "All" ? state.facets ? state.total : count : liveCount ?? count;
    return `<button class="category-tab ${state.category === name ? "active" : ""}" data-category="${escapeHtml(name)}"><strong>${escapeHtml(name === "Fixed Income" ? "Fixed income" : name)}</strong><span>${formatCount(display)}</span></button>`;
  }).join("");
}

function renderFilterOptions() {
  const flagCounts = state.facets?.flags || {};
  el("flagFilters").innerHTML = PRIMARY_FLAGS.map((flag) => `<label title="${escapeHtml(FLAG_DEFINITIONS[flag].definition)}"><input type="checkbox" data-filter="flag" value="${escapeHtml(flag)}" ${state.flags.has(flag) ? "checked" : ""}/> <span>${escapeHtml(flag)}</span><em>${formatCount(flagCounts[flag] ?? 0)}</em></label>`).join("");
  const riskCounts = state.facets?.risks || {};
  el("riskFilters").innerHTML = RISKS.map((risk) => `<label><input type="checkbox" data-filter="risk" value="${risk}" ${state.risks.has(risk) ? "checked" : ""}/> <span>${risk}</span><em>${formatCount(riskCounts[risk] ?? 0)}</em></label>`).join("");
  const statuses = state.facets?.statuses || {};
  el("statusAvailableCount").textContent = formatCount(statuses.Available ?? 0);
  el("statusNewCount").textContent = formatCount(statuses.New ?? 0);
  el("statusLimitedCount").textContent = formatCount(statuses.Limited ?? 0);
  document.querySelectorAll('[data-filter="status"]').forEach((input) => { input.checked = state.statuses.has(input.value); });
}

function activeFilterEntries() {
  const values = [];
  state.flags.forEach((flag) => values.push([`flag:${flag}`, flag]));
  state.risks.forEach((risk) => values.push([`risk:${risk}`, `${risk} risk`]));
  state.statuses.forEach((status) => values.push([`status:${status}`, status === "New" ? "New to shelf" : status]));
  if (Number.isFinite(state.maxMinimum)) values.push(["maxMinimum", `Minimum ≤ ${formatMinimum(state.maxMinimum)}`]);
  if (Number.isFinite(state.maxFee)) values.push(["maxFee", `Fee ≤ ${state.maxFee}%`]);
  return values;
}

function renderActiveFilters() {
  const entries = activeFilterEntries();
  el("activeFilterCount").textContent = `${entries.length} active`;
  el("activeChips").innerHTML = entries.map(([key, label]) => `<span class="filter-chip">${escapeHtml(label)}<button data-remove-filter="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(label)}">×</button></span>`).join("");
}

function badge(flag) { return `<span class="badge ${FLAG_COLORS[flag] || "blue"}">${escapeHtml(flag)}</span>`; }

function visibleFlags(flags) {
  const selected = [...state.flags].filter((flag) => flags.includes(flag));
  return [...selected, ...flags.filter((flag) => !selected.includes(flag))].slice(0, Math.max(2, selected.length));
}

function renderResults() {
  const body = el("resultsBody");
  if (!state.items.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state"><strong>No investments match this screen</strong>Remove one or more filters, or search the full shelf.</td></tr>`;
    return;
  }
  body.innerHTML = state.items.map((item) => {
    const checked = state.compare.has(item.id);
    return `<tr data-row-id="${escapeHtml(item.id)}">
      <td class="check-cell"><input class="row-check" type="checkbox" data-compare-id="${escapeHtml(item.id)}" aria-label="Compare ${escapeHtml(item.name)}" ${checked ? "checked" : ""}/></td>
      <td><div class="investment-cell">${productMark(item)}<div class="investment-meta"><button data-detail-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button><div class="investment-sub">${escapeHtml(item.type)} · ${escapeHtml(item.manager)}${item.matchReason ? `<span class="match-reason">${escapeHtml(item.matchReason)}</span>` : ""}<span class="badges">${visibleFlags(item.flags).map(badge).join("")}</span></div></div></div></td>
      <td><span class="metric-primary">${formatMinimum(item.minimum)}</span><span class="metric-secondary">Opening</span></td>
      <td><span class="metric-primary">${formatFee(item.fee)}</span><span class="metric-secondary">Annual</span></td>
      <td><span class="metric-primary">${escapeHtml(item.risk)}</span></td>
      <td><span class="${item.perf3 >= 0 ? "return-positive" : item.perf3 === null ? "" : "return-negative"}">${formatReturn(item.perf3)}</span><span class="metric-secondary">Annualized</span></td>
      <td class="action-cell"><button class="row-menu" data-detail-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.name)}">›</button></td>
    </tr>`;
  }).join("");
}

function updateHeader() {
  el("resultsTitle").textContent = state.category === "All" ? "All investments" : state.category;
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
  if (Number.isFinite(state.maxMinimum)) params.set("maxMinimum", String(state.maxMinimum));
  if (Number.isFinite(state.maxFee)) params.set("maxFee", String(state.maxFee));
  params.set("sort", state.sort);
  params.set("cursor", String(state.cursor));
  params.set("pageSize", "25");
  return `/api/search?${params}`;
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category !== "All") params.set("category", state.category);
  if (state.flags.size) params.set("flags", [...state.flags].join(","));
  if (state.risks.size) params.set("risks", [...state.risks].join(","));
  if (state.statuses.size) params.set("statuses", [...state.statuses].join(","));
  if (Number.isFinite(state.maxMinimum)) params.set("maxMinimum", String(state.maxMinimum));
  if (Number.isFinite(state.maxFee)) params.set("maxFee", String(state.maxFee));
  if (state.sort !== "relevance") params.set("sort", state.sort);
  history.replaceState(null, "", params.size ? `/?${params}` : "/");
}

async function runSearch({ preserveCursor = false } = {}) {
  if (!preserveCursor) state.cursor = 0;
  state.controller?.abort();
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
    state.items = data.items;
    state.total = data.total;
    state.nextCursor = data.nextCursor;
    state.previousCursor = data.previousCursor;
    state.facets = data.facets;
    if (data.appliedCategory && state.category === "All" && data.appliedCategory !== "All") state.category = data.appliedCategory;
    const roundTripMs = Math.max(1, Math.round(performance.now() - requestStarted));
    el("latency").textContent = `${roundTripMs} ms`;
    el("latency").title = `Browser round trip; server search ${data.tookMs} ms`;
    renderInterpretation(data.interpreted);
    renderCategories();
    renderFilterOptions();
    renderActiveFilters();
    renderResults();
    updateHeader();
    syncUrl();
    if (loadingShownAt) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const remaining = 140 - (performance.now() - loadingShownAt);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      el("resultsBody").innerHTML = `<tr><td colspan="7" class="empty-state"><strong>Search is temporarily unavailable</strong>${escapeHtml(error.message)}. Try again.</td></tr>`;
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
  state.maxFee = undefined; state.maxMinimum = undefined;
  if (name === "muni") { state.q = "New York municipal income under 50 bps"; state.category = "Fixed Income"; state.flags.add("Tax-Aware"); state.risks.add("Conservative"); state.maxFee = .5; }
  if (name === "core") { state.q = "core equity building blocks aligned with the CIO house view"; state.category = "ETFs"; state.flags.add("CIO House View"); state.risks.add("Moderate"); }
  if (name === "sustainable") { state.q = "sustainable investment solutions"; state.category = "All"; state.flags.add("Sustainable"); }
  if (name === "tax") { state.q = "tax-aware SMAs with direct indexing"; state.category = "SMAs"; state.flags.add("Tax-Aware"); state.flags.add("Direct Indexing"); state.risks.add("Moderate"); }
  el("searchInput").value = state.q;
  el("maxMinimum").value = "";
  el("maxFee").value = state.maxFee ?? "";
  runSearch();
}

function removeFilter(key) {
  if (key === "maxMinimum") { state.maxMinimum = undefined; el("maxMinimum").value = ""; }
  else if (key === "maxFee") { state.maxFee = undefined; el("maxFee").value = ""; }
  else {
    const [type, value] = key.split(":");
    if (type === "flag") state.flags.delete(value);
    if (type === "risk") state.risks.delete(value);
    if (type === "status") state.statuses.delete(value);
  }
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

function chartSvg(series) {
  if (!series?.length) return "";
  const width = 450, height = 105, padding = 5;
  const min = Math.min(...series), max = Math.max(...series), spread = max - min || 1;
  const points = series.map((value, index) => `${padding + index * ((width - padding * 2) / (series.length - 1))},${height - padding - ((value - min) / spread) * (height - padding * 2)}`).join(" ");
  const area = `${padding},${height} ${points} ${width - padding},${height}`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Illustrative performance trend"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#16764d" stop-opacity=".24"/><stop offset="1" stop-color="#16764d" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#chartFill)"/><polyline points="${points}" fill="none" stroke="#16764d" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

async function openDetail(id) {
  state.lastFocus = document.activeElement;
  el("drawerBackdrop").hidden = false;
  el("detailDrawer").classList.add("open");
  el("detailDrawer").setAttribute("aria-hidden", "false");
  el("drawerLoading").hidden = false;
  el("drawerContent").hidden = true;
  try {
    const response = await fetch(`/api/detail?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Unable to load details");
    const item = await response.json();
    state.currentDetail = item;
    const selected = state.compare.has(item.id);
    const saved = isInvestmentSaved(item.id);
    el("drawerContent").innerHTML = `<header class="drawer-header"><button class="drawer-close" data-close-drawer aria-label="Close details">×</button><span class="drawer-type">${escapeHtml(item.category)} · ${escapeHtml(item.type)}</span><h2 id="detailTitle">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.symbol)} · ${escapeHtml(item.manager)}</p><div class="drawer-badges">${item.flags.map(badge).join("")}</div></header>
      <div class="drawer-actions"><button class="secondary-button" data-save-investment="${escapeHtml(item.id)}">${saved ? "★ Saved" : "☆ Save"}</button><button class="primary-button" id="drawerCompare" data-drawer-compare="${escapeHtml(item.id)}">${selected ? "Remove from compare" : "＋ Add to compare"}</button></div>
      <section class="drawer-section"><h3>Overview</h3><p>${escapeHtml(item.description)}</p></section>
      <section class="drawer-section"><div class="detail-metrics"><div class="detail-metric"><small>Minimum</small><strong>${formatMinimum(item.minimum)}</strong></div><div class="detail-metric"><small>Annual fee</small><strong>${formatFee(item.fee)}</strong></div><div class="detail-metric"><small>Risk</small><strong>${escapeHtml(item.risk)}</strong></div><div class="detail-metric"><small>1Y return</small><strong>${formatReturn(item.perf1)}</strong></div><div class="detail-metric"><small>3Y return</small><strong>${formatReturn(item.perf3)}</strong></div><div class="detail-metric"><small>Assets</small><strong>${escapeHtml(item.aum)}</strong></div></div><div class="performance-chart">${chartSvg(item.performanceSeries)}</div></section>
      <section class="drawer-section"><h3>Investment details</h3><div class="detail-metrics">${Object.entries(item.details).map(([key, value]) => `<div class="detail-metric"><small>${escapeHtml(key)}</small><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></section>
      ${item.flagDetails.length ? `<section class="drawer-section"><h3>UPS views & programs</h3>${item.flagDetails.map((flag) => `<div class="flag-detail"><strong>${badge(flag.name)} ${escapeHtml(flag.name)}</strong><span>${escapeHtml(flag.definition)}</span><em>${escapeHtml(flag.owner)}<br>${escapeHtml(flag.effective)}</em></div>`).join("")}</section>` : ""}
      <section class="drawer-section"><h3>Documents</h3>${item.documents.map((document, index) => `<button class="document-link" data-document-index="${index}"><span><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(document.meta)}</small></span><span>›</span></button>`).join("")}</section>`;
    el("drawerLoading").hidden = true;
    el("drawerContent").hidden = false;
    el("drawerContent").querySelector(".drawer-close")?.focus();
  } catch (error) {
    el("drawerLoading").innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function closeDrawer() {
  el("detailDrawer").classList.remove("open");
  el("detailDrawer").setAttribute("aria-hidden", "true");
  el("drawerBackdrop").hidden = true;
  state.lastFocus?.focus?.();
}

function renderCompareModal() {
  const items = [...state.compare.values()];
  if (!items.length) { showToast("Select at least one investment to compare"); return; }
  const rows = [
    ["Vehicle", (item) => item.type], ["Manager / issuer", (item) => item.manager], ["Asset class", (item) => item.assetClass],
    ["Objective", (item) => item.objective], ["Minimum", (item) => formatMinimum(item.minimum)],
    ["Annual fee", (item) => formatFee(item.fee)], ["Risk", (item) => item.risk], ["1-year return", (item) => formatReturn(item.perf1)],
    ["3-year return", (item) => formatReturn(item.perf3)], ["UPS flags", (item) => item.flags.join(", ") || "None"], ["Liquidity", (item) => item.liquidity],
  ];
  el("compareTableWrap").innerHTML = `<table class="compare-table"><thead><tr><th></th>${items.map((item) => `<th>${escapeHtml(item.name)}<small>${escapeHtml(item.symbol)}</small></th>`).join("")}</tr></thead><tbody>${rows.map(([label, getter]) => `<tr><th>${label}</th>${items.map((item) => `<td>${escapeHtml(getter(item))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  el("compareModal").showModal();
}

function renderSavedScreens() {
  const screens = getSavedScreens();
  el("savedList").innerHTML = screens.map((screen) => `<div class="saved-item"><span class="saved-icon">☆</span><div><strong>${escapeHtml(screen.name)}</strong><small>${escapeHtml(screen.subtitle || "Saved investment criteria")}</small></div><button data-run-saved="${escapeHtml(screen.id)}">Run screen</button><button data-delete-saved="${escapeHtml(screen.id)}" aria-label="Delete ${escapeHtml(screen.name)}">×</button></div>`).join("");
  const investments = getSavedInvestments();
  el("savedInvestments").innerHTML = investments.length ? investments.map((item) => `<div class="saved-item"><span class="saved-icon">★</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.symbol)}</small></div><button data-detail-id="${escapeHtml(item.id)}">Open</button><button data-delete-investment="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join("") : `<p class="saved-empty">No saved investments yet.</p>`;
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
  state.maxMinimum = screen.state.maxMinimum;
  state.maxFee = screen.state.maxFee;
  el("searchInput").value = state.q;
  el("maxMinimum").value = state.maxMinimum ?? "";
  el("maxFee").value = state.maxFee ?? "";
  el("savedModal").close();
  runSearch();
}

function saveCurrentScreen(name) {
  const screens = getSavedScreens();
  screens.unshift({
    id: `screen-${Date.now()}`,
    name,
    subtitle: `${state.category}${state.flags.size ? ` · ${[...state.flags].join(" · ")}` : ""}`,
    state: { category: state.category, q: state.q, flags: [...state.flags], risks: [...state.risks], statuses: [...state.statuses], maxMinimum: state.maxMinimum, maxFee: state.maxFee },
  });
  setSavedScreens(screens);
  showToast(`Saved “${name}”`);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.q = params.get("q") || "";
  const category = params.get("category") || "All";
  state.category = CATEGORY_ORDER.includes(category) ? category : "All";
  state.flags = new Set((params.get("flags") || "").split(",").filter((value) => PRIMARY_FLAGS.includes(value)));
  state.risks = new Set((params.get("risks") || "").split(",").filter((value) => RISKS.includes(value)));
  state.statuses = new Set((params.get("statuses") || "").split(",").filter((value) => STATUSES.includes(value)));
  const maxMinimum = Number(params.get("maxMinimum"));
  const maxFee = Number(params.get("maxFee"));
  state.maxMinimum = params.has("maxMinimum") && Number.isFinite(maxMinimum) && maxMinimum >= 0 ? maxMinimum : undefined;
  state.maxFee = params.has("maxFee") && Number.isFinite(maxFee) && maxFee >= 0 && maxFee <= 10 ? maxFee : undefined;
  const sort = params.get("sort") || "relevance";
  state.sort = SORTS.includes(sort) ? sort : "relevance";
  el("searchInput").value = state.q;
  el("maxMinimum").value = state.maxMinimum ?? "";
  el("maxFee").value = state.maxFee ?? "";
  el("sortSelect").value = state.sort;
}

document.addEventListener("click", (event) => {
  const category = event.target.closest("[data-category]");
  if (category) { state.category = category.dataset.category; state.q = state.category === "All" ? state.q : ""; if (state.category !== "All") el("searchInput").value = ""; runSearch(); }
  const screen = event.target.closest("[data-screen]");
  if (screen) applyQuickScreen(screen.dataset.screen);
  const detail = event.target.closest("[data-detail-id]");
  if (detail) { if (el("savedModal").open) el("savedModal").close(); openDetail(detail.dataset.detailId); }
  const remove = event.target.closest("[data-remove-filter]");
  if (remove) removeFilter(remove.dataset.removeFilter);
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
  const documentButton = event.target.closest("[data-document-index]");
  if (documentButton && state.currentDetail) {
    const document = state.currentDetail.documents[Number(documentButton.dataset.documentIndex)];
    el("documentTitle").textContent = document.name;
    el("documentMeta").textContent = `${state.currentDetail.name} · ${document.meta}`;
    el("documentDescription").textContent = `Preview for ${document.name.toLowerCase()} associated with ${state.currentDetail.symbol}.`;
    el("documentModal").showModal();
  }
  const drawerCompare = event.target.closest("[data-drawer-compare]");
  if (drawerCompare) { toggleCompare(drawerCompare.dataset.drawerCompare, !state.compare.has(drawerCompare.dataset.drawerCompare)); openDetail(drawerCompare.dataset.drawerCompare); }
});

document.addEventListener("change", (event) => {
  const target = event.target;
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
el("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; runSearch(); });
el("maxMinimum").addEventListener("change", (event) => { state.maxMinimum = event.target.value === "" ? undefined : Number(event.target.value); runSearch(); });
el("maxFee").addEventListener("change", (event) => { state.maxFee = event.target.value === "" ? undefined : Number(event.target.value); runSearch(); });
el("clearAll").addEventListener("click", () => { state.q = ""; state.category = "All"; state.flags.clear(); state.risks.clear(); state.statuses.clear(); state.maxMinimum = undefined; state.maxFee = undefined; el("searchInput").value = ""; el("maxMinimum").value = ""; el("maxFee").value = ""; runSearch(); });
el("prevPage").addEventListener("click", () => { if (state.previousCursor !== null) { state.cursor = state.previousCursor; runSearch({ preserveCursor: true }); window.scrollTo({ top: 330, behavior: "smooth" }); } });
el("nextPage").addEventListener("click", () => { if (state.nextCursor !== null) { state.cursor = state.nextCursor; runSearch({ preserveCursor: true }); window.scrollTo({ top: 330, behavior: "smooth" }); } });
el("compareButton").addEventListener("click", renderCompareModal);
el("compareTopButton").addEventListener("click", renderCompareModal);
el("clearCompare").addEventListener("click", () => { state.compare.clear(); renderCompareTray(); renderResults(); });
el("saveScreenButton").addEventListener("click", () => { el("saveName").value = state.q ? state.q.slice(0, 60) : `${state.category} screen`; el("saveModal").showModal(); });
el("saveForm").addEventListener("submit", (event) => { event.preventDefault(); saveCurrentScreen(el("saveName").value.trim()); el("saveModal").close(); });
el("dismissInterpretation").addEventListener("click", () => { el("interpretation").hidden = true; });
el("columnsButton").addEventListener("click", () => { document.body.classList.toggle("compact-columns"); el("columnsButton").textContent = document.body.classList.contains("compact-columns") ? "▦ Standard view" : "▦ Compact view"; showToast(document.body.classList.contains("compact-columns") ? "Compact view applied" : "Standard view restored"); });
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el("searchInput").focus(); }
  if (event.key === "Escape" && el("detailDrawer").classList.contains("open")) closeDrawer();
});

hydrateFromUrl();
el("flagGovernance").innerHTML = PRIMARY_FLAGS.map((flag) => `<div class="governance-row"><span class="badge ${FLAG_COLORS[flag]}">${escapeHtml(flag)}</span><div><strong>${escapeHtml(FLAG_DEFINITIONS[flag].owner)}</strong><small>${escapeHtml(FLAG_DEFINITIONS[flag].definition)}</small></div></div>`).join("");
renderCategories();
renderFilterOptions();
renderActiveFilters();
renderSavedScreens();
runSearch({ preserveCursor: true });
