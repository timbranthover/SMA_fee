import { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_COLORS, FLAG_DEFINITIONS, PRIMARY_FLAGS, RISKS, SORTS, STATUSES } from "/lib/shared-config.js";
import { brandLogo } from "/lib/brand-logos.js";

const number = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const state = {
  q: "",
  category: "All",
  appliedCategory: "All",
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
  detailCache: new Map(),
  detailRequest: 0,
  detailMode: null,
  detailHistoryPushed: false,
  prefetchTimer: null,
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
  el("categoryStrip").innerHTML = CATEGORY_ORDER.map((name) => {
    const count = CATEGORY_COUNTS[name];
    const liveCount = state.facets?.categories?.[name];
    const display = name === "All" ? state.facets ? state.total : count : liveCount ?? count;
    return `<button class="category-tab ${state.appliedCategory === name ? "active" : ""}" data-category="${escapeHtml(name)}"><strong>${escapeHtml(name === "Fixed Income" ? "Fixed income" : name)}</strong><span>${formatCount(display)}</span></button>`;
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
      <td><div class="investment-cell">${productMark(item)}<div class="investment-meta"><a href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</a><div class="investment-sub">${escapeHtml(item.type)} · ${escapeHtml(item.manager)}${item.matchReason ? `<span class="match-reason">${escapeHtml(item.matchReason)}</span>` : ""}<span class="badges">${visibleFlags(item.flags).map(badge).join("")}</span></div></div></div></td>
      <td><span class="metric-primary">${formatMinimum(item.minimum)}</span><span class="metric-secondary">Opening</span></td>
      <td><span class="metric-primary">${formatFee(item.fee)}</span><span class="metric-secondary">Annual</span></td>
      <td><span class="metric-primary">${escapeHtml(item.risk)}</span></td>
      <td><span class="${item.perf3 >= 0 ? "return-positive" : item.perf3 === null ? "" : "return-negative"}">${formatReturn(item.perf3)}</span><span class="metric-secondary">Annualized</span></td>
      <td class="action-cell"><a class="row-menu" href="${escapeHtml(profileHref(item))}" data-detail-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.name)}">›</a></td>
    </tr>`;
  }).join("");
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
  if (!profileFromPath()) history.replaceState(null, "", params.size ? `/?${params}` : "/");
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
    state.appliedCategory = data.appliedCategory || state.category;
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
    ["Risk", "profile-risk"], ["Fees & operations", "profile-fees"], ["UPS research", "profile-research"], ["Documents", "profile-documents"],
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
      <section class="profile-section" id="profile-overview"><div class="section-heading"><span>At a glance</span><h3>Overview</h3><p>The essential characteristics needed to understand the investment and its intended role.</p></div><div class="overview-layout"><div class="profile-description"><h4>Investment objective</h4><p>${escapeHtml(item.description)}</p><dl><div><dt>Objective</dt><dd>${escapeHtml(item.objective)}</dd></div><div><dt>Primary benchmark</dt><dd>${escapeHtml(item.benchmark)}</dd></div></dl></div>${factGrid(profile.keyFacts)}</div></section>
      <section class="profile-section" id="profile-performance"><div class="section-heading"><span>Track record</span><h3>${escapeHtml(profile.performance.title)}</h3><p>${escapeHtml(profile.performance.subtitle)}</p></div><div class="performance-layout"><div class="profile-chart"><div class="chart-legend"><span class="investment">Investment</span><span class="benchmark">${escapeHtml(item.benchmark)}</span></div>${chartSvg(profile.performance.series, profile.performance.benchmarkSeries)}</div><table class="performance-table"><thead><tr><th>Period</th><th>Investment</th><th>Benchmark</th></tr></thead><tbody>${profile.performance.rows.map((row) => `<tr><th>${escapeHtml(row.period)}</th><td class="${row.investment >= 0 ? "positive" : "negative"}">${formatReturn(row.investment)}</td><td>${formatReturn(row.benchmark)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="profile-section" id="profile-composition"><div class="section-heading"><span>What is inside</span><h3>${escapeHtml(profile.composition.title)}</h3><p>${escapeHtml(profile.composition.subtitle)}</p></div><div class="composition-layout">${breakdownRows(profile.composition.breakdown)}<div class="characteristic-list"><h4>${profile.composition.holdings.length ? "Key holdings / characteristics" : "Operating profile"}</h4>${profile.composition.holdings.length ? `<ol>${profile.composition.holdings.map((holding, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(holding)}</li>`).join("")}</ol>` : `<p>Review fundamentals, valuation, growth and capital-return measures alongside current research.</p>`}</div></div></section>
      <section class="profile-section" id="profile-risk"><div class="section-heading"><span>Decision context</span><h3>Risk & analytical measures</h3><p>Measures are shown with context so an advisor can interpret them rather than simply collect numbers.</p></div>${factGrid(profile.riskMetrics, "risk-facts")}</section>
      <section class="profile-section" id="profile-fees"><div class="section-heading"><span>Implementation</span><h3>Fees & operations</h3><p>Costs and operating terms are kept together because both affect whether an idea is practical.</p></div><div class="fees-layout"><div><h4>Costs</h4>${factGrid(profile.fees, "stacked-facts")}</div><div><h4>Operating terms</h4>${factGrid(profile.operations, "stacked-facts operations")}</div></div></section>
      <section class="profile-section research-section" id="profile-research"><div class="section-heading"><span>House perspective</span><h3>UPS research & shelf context</h3></div><div class="research-card"><div><span class="research-label">${escapeHtml(profile.research.reviewed)}</span><h4>${escapeHtml(profile.research.title)}</h4><p>${escapeHtml(profile.research.summary)}</p><ul>${profile.research.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul><small>Coverage owner · ${escapeHtml(profile.research.owner)}</small></div><div class="governed-flags"><h4>Governed designations</h4>${item.flagDetails.length ? item.flagDetails.map((flag) => `<div class="flag-detail"><strong>${badge(flag.name)} ${escapeHtml(flag.name)}</strong><span>${escapeHtml(flag.definition)}</span><em>${escapeHtml(flag.owner)}<br>${escapeHtml(flag.effective)}</em></div>`).join("") : `<p>No active governed designations.</p>`}</div></div></section>
      <section class="profile-section" id="profile-documents"><div class="section-heading"><span>Source material</span><h3>Documents</h3><p>Use current governed documents for product terms, risk factors and disclosures.</p></div><div class="profile-documents">${item.documents.map((document, index) => `<button class="document-link" data-document-index="${index}"><span class="document-icon">PDF</span><span><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(document.meta)}</small></span><span>Preview ›</span></button>`).join("")}</div></section>
      <p class="profile-disclosure">Illustrative prototype data · Not for investment decisions · Values, research and documents shown here are representative of the intended production experience.</p>
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
  state.appliedCategory = state.category;
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
  if (category) { state.category = category.dataset.category; state.appliedCategory = state.category; state.q = state.category === "All" ? state.q : ""; if (state.category !== "All") el("searchInput").value = ""; runSearch(); }
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
  if (event.key === "Escape" && state.detailMode === "panel" && el("detailDrawer").classList.contains("open")) closeDrawer();
});

window.addEventListener("popstate", () => {
  const slug = profileFromPath();
  if (!slug) { closeDrawer({ fromHistory: true }); return; }
  openDetail(slug, { mode: history.state?.profileCanvas ? "panel" : "page", pushHistory: false });
});

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
