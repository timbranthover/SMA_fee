const STYLE_LINK_ID = "proposal-command-bar-stylesheet";
const contextCache = new Map();
let renderGeneration = 0;
let enhancementScheduled = false;
let observer = null;

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
function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function ensureStylesheet() {
  const existing = document.getElementById(STYLE_LINK_ID);
  if (existing) return existing.dataset.ready === "true" ? Promise.resolve(true) : new Promise((resolve) => {
    existing.addEventListener("load", () => resolve(true), { once: true });
    existing.addEventListener("error", () => resolve(false), { once: true });
  });

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = STYLE_LINK_ID;
    link.rel = "stylesheet";
    link.href = "/command-header.css";
    link.addEventListener("load", () => { link.dataset.ready = "true"; resolve(true); }, { once: true });
    link.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(link);
  });
}

function householdNameFromRibbon(ribbon) {
  const title = ribbon.querySelector("#scenarioTitle")?.textContent?.trim() || "";
  const match = title.match(/^Select investments for\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  return ribbon.querySelector("#scenarioBack")?.textContent?.trim().replace(/^←\s*/, "") || "";
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Context request failed (${response.status})`);
  return response.json();
}

async function resolveHouseholdId(ribbon) {
  const fromUrl = new URLSearchParams(location.search).get("householdId");
  if (fromUrl) return fromUrl;
  const householdName = householdNameFromRibbon(ribbon);
  if (!householdName) return null;
  const book = await fetchJson(`/api/wealth?view=book&q=${encodeURIComponent(householdName)}&focus=all&sort=name-asc&pageSize=25`);
  const households = book?.data?.items || [];
  return (households.find((item) => item.name === householdName) || households[0])?.id || null;
}

async function loadHouseholdContext(ribbon) {
  const householdId = await resolveHouseholdId(ribbon);
  if (!householdId) return null;
  if (contextCache.has(householdId)) return contextCache.get(householdId);
  const pending = Promise.all([
    fetchJson(`/api/wealth?view=overview&householdId=${encodeURIComponent(householdId)}`),
    fetchJson(`/api/wealth?view=concentration&householdId=${encodeURIComponent(householdId)}`).catch(() => null),
  ]).then(([overviewResponse, concentrationResponse]) => ({
    householdId,
    household: overviewResponse?.data?.household || null,
    overview: overviewResponse?.data || null,
    concentration: concentrationResponse?.data || null,
  })).catch((error) => {
    console.warn("Proposal command context unavailable", error);
    contextCache.delete(householdId);
    return null;
  });
  contextCache.set(householdId, pending);
  return pending;
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

function ensureControls(tray) {
  let controls = tray.querySelector(".proposal-decision-controls");
  if (controls) return controls;
  controls = document.createElement("section");
  controls.className = "proposal-decision-controls";
  controls.setAttribute("aria-label", "Proposal decision parameters");
  const allocation = tray.querySelector(".proposal-tray-allocation");
  tray.insertBefore(controls, allocation || null);
  return controls;
}

function compactSelectedInvestments(tray) {
  const items = tray.querySelector("#proposalTrayItems");
  if (!items) return;
  const candidates = [...items.querySelectorAll(".proposal-tray-item")];
  items.dataset.overflow = candidates.length > 2 ? `+${candidates.length - 2}` : "";
  items.classList.toggle("has-selected-investments", candidates.length > 0);
}

function updateConcentrationReadout(controls, context, target, amount) {
  const economics = concentrationEconomics(context, target, amount);
  const release = economics.release;
  const reinvest = Math.min(release, Math.max(0, roundMoney(amount)));
  const remaining = Math.max(0, release - reinvest);

  const targetSummary = controls.querySelector("[data-command-target-summary]");
  const amountInput = controls.querySelector("[data-command-amount-input]");
  const amountRange = controls.querySelector("[data-command-amount-range]");
  const available = controls.querySelector("[data-command-available]");
  const retained = controls.querySelector("[data-command-retained]");
  const modeled = controls.querySelector("[data-command-modeled-cash]");

  if (targetSummary) targetSummary.textContent = formatPercent(target);
  if (amountInput) amountInput.value = number.format(reinvest);
  if (amountRange) {
    amountRange.max = String(release);
    amountRange.value = String(reinvest);
  }
  if (available) available.textContent = `${formatMoney(release)} proceeds`;
  if (retained) retained.textContent = formatMoney(remaining);
  if (modeled) modeled.textContent = formatMoney(economics.existingCash + remaining);
  return { ...economics, reinvest, remaining };
}

function renderConcentrationControls(ribbon, controls, mandate, legacy, context) {
  const review = context?.concentration;
  if (!review?.holding || !legacy.hasTarget) return false;

  const currentWeight = Number(review.holding.weight || 0);
  const policyTarget = Number(review.targetWeight || legacy.target || 0);
  const targetMinimum = 1;
  const targetMaximum = Math.max(targetMinimum, currentWeight);
  const target = clamp(Number.isFinite(legacy.target) ? legacy.target : policyTarget, targetMinimum, targetMaximum);
  const initialEconomics = concentrationEconomics(context, target, Number.isFinite(legacy.amount) ? legacy.amount : 0);
  const amount = Math.min(initialEconomics.release, Math.max(0, Number.isFinite(legacy.amount) ? legacy.amount : 0));
  const symbol = review.holding.symbol || "Position";
  const signature = [symbol, currentWeight, policyTarget, target, amount, initialEconomics.release, initialEconomics.existingCash].join("|");
  if (controls.dataset.signature === signature) return true;
  controls.dataset.signature = signature;

  controls.innerHTML = `<div class="proposal-decision-grid">
    <div class="proposal-decision-summary">
      <span>Position change</span>
      <div><strong>${escapeHtml(symbol)}</strong><b>${formatPercent(currentWeight)}</b><i aria-hidden="true">→</i><em data-command-target-summary>${formatPercent(target)}</em></div>
      <small>${formatMoney(review.holding.value)} current · policy ${formatPercent(policyTarget)}</small>
    </div>
    <label class="proposal-decision-field proposal-decision-target">
      <span>Target weight</span>
      <div class="proposal-decision-input"><input type="number" data-command-target-input min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target.toFixed(1)}" aria-label="Target ${escapeHtml(symbol)} position weight"><b>%</b></div>
      <input class="proposal-decision-range" type="range" data-command-target-range min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target}" aria-label="Target ${escapeHtml(symbol)} position weight">
    </label>
    <label class="proposal-decision-field proposal-decision-amount">
      <span>Amount to reinvest</span>
      <div class="proposal-decision-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-command-amount-input value="${number.format(amount)}" aria-label="Amount to reinvest"></div>
      <div class="proposal-decision-range-row"><input class="proposal-decision-range" type="range" data-command-amount-range min="0" max="${initialEconomics.release}" step="5000" value="${amount}" aria-label="Amount to reinvest"><small data-command-available>${formatMoney(initialEconomics.release)} proceeds</small></div>
    </label>
    <div class="proposal-decision-cash">
      <span>Cash retained</span>
      <strong data-command-retained>${formatMoney(initialEconomics.remaining)}</strong>
      <small>${formatMoney(initialEconomics.existingCash)} → <b data-command-modeled-cash>${formatMoney(initialEconomics.modeledCash)}</b></small>
    </div>
  </div>`;

  const targetInput = controls.querySelector("[data-command-target-input]");
  const targetRange = controls.querySelector("[data-command-target-range]");
  const amountInput = controls.querySelector("[data-command-amount-input]");
  const amountRange = controls.querySelector("[data-command-amount-range]");
  const legacyTarget = legacy.targetElement || mandate.querySelector("select[data-scenario-target]");

  const localTarget = () => clamp(roundHalf(targetInput.value), targetMinimum, targetMaximum);
  const localAmount = () => {
    const parsed = parseAmount(amountInput.value);
    return Number.isFinite(parsed) ? parsed : Number(amountRange.value) || 0;
  };
  const refreshLocal = () => {
    const nextTarget = localTarget();
    targetInput.value = nextTarget.toFixed(1);
    targetRange.value = String(nextTarget);
    updateConcentrationReadout(controls, context, nextTarget, localAmount());
  };
  const commitTarget = () => {
    refreshLocal();
    if (!legacyTarget) return;
    legacyTarget.value = String(localTarget());
    legacyTarget.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const commitAmount = () => {
    const nextTarget = localTarget();
    const next = updateConcentrationReadout(controls, context, nextTarget, localAmount());
    dispatchAmount(ribbon, next.reinvest, legacy.amountKey);
  };

  targetRange.addEventListener("input", () => {
    targetInput.value = Number(targetRange.value).toFixed(1);
    refreshLocal();
  });
  targetRange.addEventListener("change", commitTarget);
  targetInput.addEventListener("input", refreshLocal);
  targetInput.addEventListener("change", commitTarget);
  targetInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); targetInput.blur(); } });

  amountRange.addEventListener("input", () => {
    amountInput.value = number.format(Number(amountRange.value));
    updateConcentrationReadout(controls, context, localTarget(), Number(amountRange.value));
  });
  amountRange.addEventListener("change", commitAmount);
  amountInput.addEventListener("input", () => {
    const nextTarget = localTarget();
    const parsed = parseAmount(amountInput.value);
    if (!Number.isFinite(parsed)) return;
    const economics = concentrationEconomics(context, nextTarget, parsed);
    const nextAmount = Math.min(economics.release, Math.max(0, roundMoney(parsed)));
    amountRange.max = String(economics.release);
    amountRange.value = String(nextAmount);
    const available = controls.querySelector("[data-command-available]");
    const retained = controls.querySelector("[data-command-retained]");
    const modeled = controls.querySelector("[data-command-modeled-cash]");
    if (available) available.textContent = `${formatMoney(economics.release)} proceeds`;
    if (retained) retained.textContent = formatMoney(Math.max(0, economics.release - nextAmount));
    if (modeled) modeled.textContent = formatMoney(economics.existingCash + Math.max(0, economics.release - nextAmount));
  });
  amountInput.addEventListener("change", commitAmount);
  amountInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); amountInput.blur(); } });
  return true;
}

function renderGenericControls(ribbon, controls, legacy) {
  if (!legacy.hasAmount) return false;
  const maximum = Math.max(legacy.amountMaximum, legacy.amount || 0);
  const amount = clamp(legacy.amount || 0, 0, maximum);
  const signature = ["generic", maximum, amount, legacy.amountKey].join("|");
  if (controls.dataset.signature === signature) return true;
  controls.dataset.signature = signature;
  controls.innerHTML = `<div class="proposal-decision-grid generic">
    <div class="proposal-decision-summary"><span>Investment mandate</span><div><strong>${formatMoney(maximum)}</strong></div><small>Capital available from the household decision</small></div>
    <label class="proposal-decision-field proposal-decision-amount"><span>Amount to invest</span><div class="proposal-decision-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-command-amount-input value="${number.format(amount)}" aria-label="Amount to invest"></div><div class="proposal-decision-range-row"><input class="proposal-decision-range" type="range" data-command-amount-range min="0" max="${maximum}" step="5000" value="${amount}" aria-label="Amount to invest"><small>${formatMoney(maximum)} available</small></div></label>
  </div>`;
  const input = controls.querySelector("[data-command-amount-input]");
  const range = controls.querySelector("[data-command-amount-range]");
  const sync = () => {
    const value = clamp(parseAmount(input.value) ?? Number(range.value), 0, maximum);
    range.value = String(roundMoney(value));
    input.value = number.format(roundMoney(value));
    return roundMoney(value);
  };
  range.addEventListener("input", () => { input.value = number.format(Number(range.value)); });
  range.addEventListener("change", () => dispatchAmount(ribbon, Number(range.value), legacy.amountKey));
  input.addEventListener("change", () => dispatchAmount(ribbon, sync(), legacy.amountKey));
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
  return true;
}

function clearEnhancement() {
  renderGeneration += 1;
  const ribbon = document.querySelector("#scenarioRibbon");
  const tray = document.querySelector("#proposalTray");
  ribbon?.classList.remove("proposal-command-mode");
  tray?.classList.remove("proposal-command-mode");
  tray?.querySelector(".proposal-decision-controls")?.remove();
  const items = tray?.querySelector("#proposalTrayItems");
  if (items) {
    items.classList.remove("has-selected-investments");
    items.dataset.overflow = "";
  }
}

async function enhanceProposalTray() {
  const ribbon = document.querySelector("#scenarioRibbon.proposal-mode:not([hidden])");
  const tray = document.querySelector("#proposalTray:not([hidden])");
  const mandate = ribbon?.querySelector("#scenarioMandate");
  if (!ribbon || !tray || !mandate) { clearEnhancement(); return; }

  const legacy = captureLegacyState(mandate);
  if (!legacy.hasTarget && !legacy.hasAmount) { clearEnhancement(); return; }

  const stylesReady = await ensureStylesheet();
  if (!stylesReady) { clearEnhancement(); return; }

  const generation = ++renderGeneration;
  ribbon.classList.add("proposal-command-mode");
  tray.classList.add("proposal-command-mode");
  compactSelectedInvestments(tray);
  const controls = ensureControls(tray);
  if (!controls.dataset.signature) controls.innerHTML = `<div class="proposal-decision-loading"><span></span><small>Loading decision parameters</small></div>`;

  const context = legacy.hasTarget ? await loadHouseholdContext(ribbon) : null;
  if (generation !== renderGeneration || !ribbon.isConnected || !tray.isConnected || ribbon.hidden || tray.hidden) return;

  if (context?.concentration && renderConcentrationControls(ribbon, controls, mandate, legacy, context)) {
    compactSelectedInvestments(tray);
    return;
  }
  renderGenericControls(ribbon, controls, legacy);
  compactSelectedInvestments(tray);
}

function scheduleEnhancement() {
  if (enhancementScheduled) return;
  enhancementScheduled = true;
  requestAnimationFrame(() => {
    enhancementScheduled = false;
    enhanceProposalTray();
  });
}

ensureStylesheet().then(() => scheduleEnhancement());
observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    return !target?.closest?.(".proposal-decision-controls");
  });
  if (relevant) scheduleEnhancement();
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-pressed"] });
