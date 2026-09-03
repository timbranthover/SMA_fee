const COMMAND_STYLE_ID = "proposal-command-header-styles";
const contextCache = new Map();
let renderGeneration = 0;
let enhancementScheduled = false;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatMoney(value) {
  const numeric = Number(value) || 0;
  return Math.abs(numeric) >= 1_000_000 ? compactMoney.format(numeric) : money.format(numeric);
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric.toFixed(1).replace(/\.0$/, "")}%`;
}

function roundMoney(value) { return Math.round((Number(value) || 0) / 1000) * 1000; }
function roundHalf(value) { return Math.round((Number(value) || 0) * 2) / 2; }
function clamp(value, minimum, maximum) {
  const numeric = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(numeric) ? numeric : minimum));
}
function parseAmount(value) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}
function progress(value, minimum, maximum) {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) return 0;
  return Math.max(0, Math.min(100, ((value - minimum) / (maximum - minimum)) * 100));
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function householdNameFromRibbon(ribbon) {
  const title = ribbon.querySelector("#scenarioTitle")?.textContent?.trim() || "";
  const match = title.match(/^Select investments for\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  return ribbon.querySelector("#scenarioBack")?.textContent?.trim().replace(/^←\s*/, "") || "";
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Context request failed (${response.status})`);
  return response.json();
}

async function loadHouseholdContext(householdName) {
  if (!householdName) return null;
  if (contextCache.has(householdName)) return contextCache.get(householdName);
  const request = (async () => {
    const book = await fetchJson(`/api/wealth?view=book&q=${encodeURIComponent(householdName)}&focus=all&sort=name-asc&pageSize=200`);
    const households = book?.data?.items || [];
    const household = households.find((item) => item.name === householdName) || households[0];
    if (!household?.id) return null;
    const [overviewResponse, concentrationResponse] = await Promise.all([
      fetchJson(`/api/wealth?view=overview&householdId=${encodeURIComponent(household.id)}`),
      fetchJson(`/api/wealth?view=concentration&householdId=${encodeURIComponent(household.id)}`).catch(() => null),
    ]);
    return {
      householdId: household.id,
      household: overviewResponse?.data?.household || household,
      overview: overviewResponse?.data || null,
      concentration: concentrationResponse?.data || null,
    };
  })().catch((error) => {
    console.warn("Proposal command context unavailable", error);
    contextCache.delete(householdName);
    return null;
  });
  contextCache.set(householdName, request);
  return request;
}

function captureLegacyState(mandate) {
  const target = mandate.querySelector("select[data-scenario-target]");
  const buttons = [...mandate.querySelectorAll("[data-scenario-amount]")];
  const activeAmount = buttons.find((button) => button.getAttribute("aria-pressed") === "true") || buttons[0];
  return {
    targetElement: target,
    target: target ? Number(target.value) : null,
    amount: activeAmount ? Number(activeAmount.dataset.scenarioAmount) : null,
    amountKey: activeAmount?.dataset.scenarioAmountKey || buttons[0]?.dataset.scenarioAmountKey || "redeployAmount",
    amountMaximum: buttons.length ? Math.max(...buttons.map((button) => Number(button.dataset.scenarioAmount) || 0)) : 0,
    hasTarget: Boolean(target),
    hasAmount: Boolean(buttons.length),
  };
}

function dispatchAmount(ribbon, amount, amountKey) {
  const bridge = document.createElement("button");
  bridge.type = "button";
  bridge.hidden = true;
  bridge.dataset.scenarioAmount = String(Math.max(0, roundMoney(amount)));
  bridge.dataset.scenarioAmountKey = amountKey || "redeployAmount";
  ribbon.appendChild(bridge);
  bridge.click();
  bridge.remove();
}

function setRangeProgress(range) {
  if (!range) return;
  range.style.setProperty("--command-progress", `${progress(Number(range.value), Number(range.min), Number(range.max))}%`);
}

function concentrationEconomics(context, targetWeight, reinvestAmount) {
  const review = context?.concentration;
  const household = context?.household;
  const financialAssets = Number(household?.financialAssets || context?.overview?.household?.financialAssets || 0);
  const currentValue = Number(review?.holding?.value || 0);
  const targetValue = roundMoney(financialAssets * Number(targetWeight || 0) / 100);
  const release = Math.max(0, roundMoney(currentValue - targetValue));
  const reinvest = Math.max(0, Math.min(release, roundMoney(reinvestAmount)));
  const remaining = Math.max(0, release - reinvest);
  const existingCash = Number(household?.investableCash || context?.overview?.household?.investableCash || 0);
  return { release, reinvest, remaining, existingCash, modeledCash: roundMoney(existingCash + remaining) };
}

function ensureDock(tray) {
  let dock = tray.querySelector(".proposal-command-dock");
  if (dock) return dock;
  dock = document.createElement("div");
  dock.className = "proposal-command-dock";
  dock.setAttribute("aria-label", "Proposal decision controls");
  const allocation = tray.querySelector(".proposal-tray-allocation");
  tray.insertBefore(dock, allocation || null);
  return dock;
}

function compactSelectedInvestments(tray) {
  const items = tray.querySelector("#proposalTrayItems");
  if (!items) return;
  const candidates = [...items.querySelectorAll(".proposal-tray-item")];
  const overflow = candidates.length > 2 ? `+${candidates.length - 2} more` : "";
  if (items.dataset.overflow !== overflow) items.dataset.overflow = overflow;
  items.classList.toggle("has-selected-investments", candidates.length > 0);
}

function renderConcentrationDock(ribbon, dock, mandate, legacy, context) {
  const review = context?.concentration;
  if (!review?.holding || !legacy.hasTarget) return false;

  const currentWeight = Number(review.holding.weight || 0);
  const policyTarget = Number(review.targetWeight || legacy.target || 0);
  const targetMinimum = 1;
  const targetMaximum = Math.max(targetMinimum, currentWeight);
  const target = clamp(Number.isFinite(legacy.target) ? legacy.target : policyTarget, targetMinimum, targetMaximum);
  const economics = concentrationEconomics(context, target, Number.isFinite(legacy.amount) ? legacy.amount : 0);
  const amount = Math.min(economics.release, Number.isFinite(legacy.amount) ? legacy.amount : 0);
  const symbol = review.holding.symbol || "Position";
  const signature = ["concentration", symbol, currentWeight, policyTarget, target, amount, economics.release, economics.existingCash].join("|");
  if (dock.dataset.signature === signature) return true;
  dock.dataset.signature = signature;

  dock.innerHTML = `<div class="proposal-command-strip">
    <section class="proposal-command-section proposal-command-context">
      <span>${escapeHtml(symbol)} concentration</span>
      <strong><b>${formatPercent(currentWeight)}</b><i aria-hidden="true">→</i><b data-dock-target-summary>${formatPercent(target)}</b></strong>
      <small>${formatMoney(review.holding.value)} today · target ${formatPercent(policyTarget)}</small>
    </section>
    <section class="proposal-command-section proposal-command-target">
      <span>Target %</span>
      <label class="proposal-command-input percent"><input type="number" data-dock-target-input min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target.toFixed(1)}" aria-label="Target ${escapeHtml(symbol)} position weight"><b>%</b></label>
      <input class="proposal-command-range" type="range" data-dock-target-range min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target}" style="--command-progress:${progress(target, targetMinimum, targetMaximum)}%" aria-label="Target ${escapeHtml(symbol)} position slider">
    </section>
    <section class="proposal-command-section proposal-command-amount">
      <span>Amount to reinvest</span>
      <label class="proposal-command-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-dock-amount-input value="${number.format(amount)}" aria-label="Amount to reinvest"></label>
      <input class="proposal-command-range" type="range" data-dock-amount-range min="0" max="${economics.release}" step="5000" value="${amount}" style="--command-progress:${progress(amount, 0, economics.release)}%" aria-label="Amount to reinvest slider">
      <small data-dock-available>${formatMoney(economics.release)} available</small>
    </section>
    <section class="proposal-command-section proposal-command-cash">
      <strong><b data-dock-remainder>${formatMoney(Math.max(0, economics.release - amount))}</b> remains in cash</strong>
      <span>Existing household cash</span>
      <small><b>${formatMoney(economics.existingCash)}</b> → <b data-dock-modeled-cash>${formatMoney(economics.existingCash + Math.max(0, economics.release - amount))}</b> modeled</small>
    </section>
  </div>`;

  const targetInput = dock.querySelector("[data-dock-target-input]");
  const targetRange = dock.querySelector("[data-dock-target-range]");
  const amountInput = dock.querySelector("[data-dock-amount-input]");
  const amountRange = dock.querySelector("[data-dock-amount-range]");
  const legacyTarget = legacy.targetElement || mandate.querySelector("select[data-scenario-target]");

  const refreshLocal = () => {
    const nextTarget = clamp(roundHalf(targetInput.value), targetMinimum, targetMaximum);
    const parsedAmount = parseAmount(amountInput.value);
    const nextAmountInput = Number.isFinite(parsedAmount) ? parsedAmount : (Number(amountRange.value) || 0);
    const nextEconomics = concentrationEconomics(context, nextTarget, nextAmountInput);
    const nextAmount = Math.min(nextEconomics.release, Math.max(0, nextAmountInput));
    targetInput.value = nextTarget.toFixed(1);
    targetRange.value = String(nextTarget);
    amountRange.max = String(nextEconomics.release);
    amountRange.value = String(roundMoney(nextAmount));
    amountInput.value = number.format(roundMoney(nextAmount));
    dock.querySelector("[data-dock-target-summary]").textContent = formatPercent(nextTarget);
    dock.querySelector("[data-dock-available]").textContent = `${formatMoney(nextEconomics.release)} available`;
    dock.querySelector("[data-dock-remainder]").textContent = formatMoney(Math.max(0, nextEconomics.release - nextAmount));
    dock.querySelector("[data-dock-modeled-cash]").textContent = formatMoney(nextEconomics.existingCash + Math.max(0, nextEconomics.release - nextAmount));
    setRangeProgress(targetRange);
    setRangeProgress(amountRange);
  };

  const commitTarget = () => {
    const nextTarget = clamp(roundHalf(targetInput.value), targetMinimum, targetMaximum);
    targetInput.value = nextTarget.toFixed(1);
    refreshLocal();
    if (!legacyTarget) return;
    legacyTarget.value = String(nextTarget);
    legacyTarget.dispatchEvent(new Event("change", { bubbles: true }));
  };

  targetRange.addEventListener("input", () => { targetInput.value = Number(targetRange.value).toFixed(1); refreshLocal(); });
  targetRange.addEventListener("change", commitTarget);
  targetInput.addEventListener("input", refreshLocal);
  targetInput.addEventListener("change", commitTarget);
  targetInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); targetInput.blur(); } });

  amountRange.addEventListener("input", () => { amountInput.value = number.format(Number(amountRange.value)); refreshLocal(); });
  amountRange.addEventListener("change", () => dispatchAmount(ribbon, Number(amountRange.value), legacy.amountKey));
  amountInput.addEventListener("input", refreshLocal);
  amountInput.addEventListener("change", () => { refreshLocal(); dispatchAmount(ribbon, parseAmount(amountInput.value) || 0, legacy.amountKey); });
  amountInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); amountInput.blur(); } });
  return true;
}

function renderGenericDock(ribbon, dock, legacy) {
  if (!legacy.hasAmount) return false;
  const maximum = Math.max(legacy.amountMaximum, legacy.amount || 0);
  const amount = clamp(legacy.amount || 0, 0, maximum);
  const signature = ["generic", maximum, amount, legacy.amountKey].join("|");
  if (dock.dataset.signature === signature) return true;
  dock.dataset.signature = signature;
  dock.innerHTML = `<div class="proposal-command-strip generic">
    <section class="proposal-command-section proposal-command-context"><span>Investment mandate</span><strong><b>${formatMoney(maximum)}</b></strong><small>Capital available from the household decision</small></section>
    <section class="proposal-command-section proposal-command-amount"><span>Amount to invest</span><label class="proposal-command-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-dock-amount-input value="${number.format(amount)}" aria-label="Amount to invest"></label><input class="proposal-command-range" type="range" data-dock-amount-range min="0" max="${maximum}" step="5000" value="${amount}" style="--command-progress:${progress(amount, 0, maximum)}%" aria-label="Amount to invest slider"><small>${formatMoney(maximum)} available</small></section>
  </div>`;
  const input = dock.querySelector("[data-dock-amount-input]");
  const range = dock.querySelector("[data-dock-amount-range]");
  const sync = () => {
    const value = clamp(parseAmount(input.value) ?? Number(range.value), 0, maximum);
    range.value = String(roundMoney(value));
    input.value = number.format(roundMoney(value));
    setRangeProgress(range);
  };
  range.addEventListener("input", () => { input.value = number.format(Number(range.value)); setRangeProgress(range); });
  range.addEventListener("change", () => dispatchAmount(ribbon, Number(range.value), legacy.amountKey));
  input.addEventListener("change", () => { sync(); dispatchAmount(ribbon, parseAmount(input.value) || 0, legacy.amountKey); });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
  return true;
}

function clearDockState() {
  renderGeneration += 1;
  const ribbon = document.querySelector("#scenarioRibbon");
  const tray = document.querySelector("#proposalTray");
  ribbon?.classList.remove("command-docked-mode");
  tray?.classList.remove("proposal-command-docked");
  tray?.querySelector(".proposal-command-dock")?.remove();
  const items = tray?.querySelector("#proposalTrayItems");
  if (items) {
    items.classList.remove("has-selected-investments");
    if (items.dataset.overflow) items.dataset.overflow = "";
  }
}

async function enhanceProposalDock() {
  const ribbon = document.querySelector("#scenarioRibbon.proposal-mode:not([hidden])");
  const tray = document.querySelector("#proposalTray:not([hidden])");
  const mandate = ribbon?.querySelector("#scenarioMandate");
  if (!ribbon || !tray || !mandate) { clearDockState(); return; }

  const legacy = captureLegacyState(mandate);
  if (!legacy.hasTarget && !legacy.hasAmount) { clearDockState(); return; }

  ribbon.classList.add("command-docked-mode");
  tray.classList.add("proposal-command-docked");
  compactSelectedInvestments(tray);
  const dock = ensureDock(tray);
  const generation = ++renderGeneration;
  const householdName = householdNameFromRibbon(ribbon);
  const context = legacy.hasTarget ? await loadHouseholdContext(householdName) : null;
  if (generation !== renderGeneration || !ribbon.isConnected || !tray.isConnected || ribbon.hidden || tray.hidden || !ribbon.classList.contains("proposal-mode")) return;

  if (context?.concentration && renderConcentrationDock(ribbon, dock, mandate, legacy, context)) { compactSelectedInvestments(tray); return; }
  renderGenericDock(ribbon, dock, legacy);
  compactSelectedInvestments(tray);
}

function scheduleEnhancement() {
  if (enhancementScheduled) return;
  enhancementScheduled = true;
  requestAnimationFrame(() => { enhancementScheduled = false; enhanceProposalDock(); });
}

function installStyles() {
  if (document.getElementById(COMMAND_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = COMMAND_STYLE_ID;
  style.textContent = `
    .scenario-ribbon.proposal-mode.command-docked-mode { min-height:92px!important; grid-template-columns:minmax(228px,.72fr) minmax(360px,1fr) auto 30px!important; align-items:center; gap:clamp(12px,1.4vw,22px)!important; padding:11px clamp(24px,2.5vw,42px)!important; border-bottom-color:#d4d4cf; background:#f7f7f4; box-shadow:0 3px 12px rgba(0,0,0,.045); }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-progress { grid-column:1; grid-row:1; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-main { grid-column:2; grid-row:1; gap:4px; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-main>span { color:#767672; font-size:7.5px; letter-spacing:.1em; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-main>strong { max-width:none; font-size:20px; line-height:1.1; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-tags,.scenario-ribbon.proposal-mode.command-docked-mode .scenario-mandate,.scenario-ribbon.proposal-mode.command-docked-mode .scenario-capital { display:none!important; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-back { grid-column:3; grid-row:1; min-height:32px; order:initial; padding:6px 10px; white-space:nowrap; }
    .scenario-ribbon.proposal-mode.command-docked-mode .scenario-dismiss { grid-column:4; grid-row:1; order:initial; }

    .proposal-tray.proposal-command-docked { width:min(1320px,calc(100vw - 48px)); height:84px!important; min-height:84px!important; max-height:84px; grid-template-columns:145px 170px minmax(500px,1fr) 88px 154px; align-items:center; gap:8px; padding:8px 10px 8px 14px; overflow:visible; }
    .proposal-tray.proposal-command-docked .proposal-tray-context { min-width:0; gap:3px; }
    .proposal-tray.proposal-command-docked .proposal-tray-context>span { font-size:6.5px; }
    .proposal-tray.proposal-command-docked .proposal-tray-context strong { overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
    .proposal-tray.proposal-command-docked .proposal-tray-context small { overflow:hidden; color:#9d9d99; font-size:6.5px; text-overflow:ellipsis; white-space:nowrap; }
    .proposal-tray.proposal-command-docked .proposal-tray-items { position:relative; height:64px; min-width:0; display:grid; align-content:center; gap:4px; overflow:hidden; }
    .proposal-tray.proposal-command-docked .proposal-tray-item { width:100%; min-width:0; max-width:none; height:27px; grid-template-columns:21px minmax(0,1fr) 14px; gap:5px; padding:2px 4px; border-color:#3b3b38; background:#222221; }
    .proposal-tray.proposal-command-docked .proposal-tray-item:nth-child(n+3) { display:none; }
    .proposal-tray.proposal-command-docked .proposal-tray-item .product-monogram { width:20px; height:20px; font-size:6px; }
    .proposal-tray.proposal-command-docked .proposal-tray-item .product-logo { max-width:15px; max-height:15px; }
    .proposal-tray.proposal-command-docked .proposal-tray-item strong { font-size:7px; line-height:1.1; }
    .proposal-tray.proposal-command-docked .proposal-tray-item small { display:none; }
    .proposal-tray.proposal-command-docked .proposal-tray-item button { padding:0; font-size:12px; line-height:1; }
    .proposal-tray.proposal-command-docked .proposal-tray-items[data-overflow]:not([data-overflow=""]) .proposal-tray-item:nth-child(2) { padding-right:42px; }
    .proposal-tray.proposal-command-docked .proposal-tray-items[data-overflow]:not([data-overflow=""])::after { content:attr(data-overflow); position:absolute; right:3px; bottom:5px; padding:2px 4px; border:1px solid #474744; border-radius:2px; background:#171717; color:#b9b9b5; font-size:6px; font-weight:700; white-space:nowrap; }
    .proposal-tray.proposal-command-docked .proposal-tray-empty { height:52px; gap:7px; font-size:7px; line-height:1.25; }
    .proposal-tray.proposal-command-docked .proposal-tray-empty i { width:25px; height:25px; flex:none; }

    .proposal-command-dock { min-width:0; height:64px; border:1px solid #d2d2cc; border-radius:3px; background:#f6f6f3; color:#171717; overflow:hidden; box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
    .proposal-command-strip { height:100%; display:grid; grid-template-columns:minmax(112px,1fr) minmax(90px,.78fr) minmax(125px,1.05fr) minmax(135px,1.08fr); align-items:stretch; }
    .proposal-command-strip.generic { grid-template-columns:minmax(160px,.8fr) minmax(220px,1.2fr); }
    .proposal-command-section { min-width:0; display:grid; align-content:center; gap:3px; padding:6px 9px; border-left:1px solid #deded9; }
    .proposal-command-section:first-child { border-left:0; }
    .proposal-command-section>span { overflow:hidden; color:#6f6f6b; font-size:6.5px; font-weight:700; letter-spacing:.065em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    .proposal-command-context strong { display:flex; align-items:center; gap:5px; font-family:Georgia,serif; font-size:12px; font-weight:400; line-height:1; white-space:nowrap; }
    .proposal-command-context strong b { font-weight:400; }
    .proposal-command-context strong b:last-child { color:#355f4e; }
    .proposal-command-context strong i { color:#999994; font-size:9px; font-style:normal; }
    .proposal-command-section>small { overflow:hidden; color:#777773; font-size:6.2px; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
    .proposal-command-input { width:100%; height:23px; display:flex; align-items:center; gap:2px; border:1px solid #c3c3bd; border-radius:2px; background:#fff; padding:0 5px; color:#202020; font-variant-numeric:tabular-nums; }
    .proposal-command-input:focus-within { border-color:#777; box-shadow:0 0 0 2px rgba(0,0,0,.04); }
    .proposal-command-input input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#171717; font-size:8px; font-weight:700; text-align:right; }
    .proposal-command-input b { font-size:7px; }
    .proposal-command-input input[type=number]::-webkit-inner-spin-button,.proposal-command-input input[type=number]::-webkit-outer-spin-button { margin:0; -webkit-appearance:none; }
    .proposal-command-range { --command-progress:0%; width:100%; height:10px; margin:0; appearance:none; -webkit-appearance:none; background:transparent; cursor:pointer; }
    .proposal-command-range::-webkit-slider-runnable-track { height:2px; border-radius:2px; background:linear-gradient(to right,#2f6fe4 0 var(--command-progress),#d1d1cc var(--command-progress) 100%); }
    .proposal-command-range::-webkit-slider-thumb { width:10px; height:10px; margin-top:-4px; border:1px solid #2f6fe4; border-radius:50%; background:#2f6fe4; box-shadow:0 1px 2px rgba(0,0,0,.16); -webkit-appearance:none; }
    .proposal-command-range::-moz-range-track { height:2px; border:0; border-radius:2px; background:#d1d1cc; }
    .proposal-command-range::-moz-range-progress { height:2px; border-radius:2px; background:#2f6fe4; }
    .proposal-command-range::-moz-range-thumb { width:10px; height:10px; border:1px solid #2f6fe4; border-radius:50%; background:#2f6fe4; }
    .proposal-command-cash { gap:4px; }
    .proposal-command-cash>strong { overflow:hidden; font-family:Georgia,serif; font-size:10px; font-weight:400; line-height:1.05; text-overflow:ellipsis; white-space:nowrap; }
    .proposal-command-cash>strong b { font-weight:400; }
    .proposal-command-cash>span { font-size:6px; letter-spacing:.04em; }
    .proposal-command-cash small b { color:#252525; font-weight:700; }
    .proposal-tray.proposal-command-docked .proposal-tray-allocation { min-width:0; justify-items:end; gap:2px; }
    .proposal-tray.proposal-command-docked .proposal-tray-allocation span { font-size:6px; }
    .proposal-tray.proposal-command-docked .proposal-tray-allocation strong { font-size:14px; }
    .proposal-tray.proposal-command-docked .proposal-tray-allocation small { max-width:88px; overflow:hidden; font-size:6px; text-align:right; text-overflow:ellipsis; white-space:nowrap; }
    .proposal-tray.proposal-command-docked .proposal-continue { width:100%; height:44px; min-height:44px; padding:0 9px; font-size:8px; white-space:nowrap; }

    @media (max-width:1320px) {
      .scenario-ribbon.proposal-mode.command-docked-mode { grid-template-columns:215px minmax(330px,1fr) auto 28px!important; gap:12px!important; padding-left:24px!important; padding-right:24px!important; }
      .scenario-ribbon.proposal-mode.command-docked-mode .scenario-progress { gap:6px; }
      .scenario-ribbon.proposal-mode.command-docked-mode .scenario-progress span { gap:5px; font-size:7.5px; }
      .scenario-ribbon.proposal-mode.command-docked-mode .scenario-progress b { width:12px; flex-basis:12px; }
      .scenario-ribbon.proposal-mode.command-docked-mode .scenario-main>strong { font-size:18px; }
      .proposal-tray.proposal-command-docked { width:calc(100vw - 48px); grid-template-columns:135px 150px minmax(470px,1fr) 82px 145px; gap:6px; padding-left:12px; padding-right:8px; }
      .proposal-command-section { padding-left:7px; padding-right:7px; }
      .proposal-command-context strong { font-size:11px; }
      .proposal-command-cash>strong { font-size:9px; }
    }
  `;
  document.head.appendChild(style);
}

installStyles();
const observer = new MutationObserver(scheduleEnhancement);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "aria-pressed"] });
scheduleEnhancement();
