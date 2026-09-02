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

function roundMoney(value) {
  return Math.round((Number(value) || 0) / 1000) * 1000;
}

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
  return { financialAssets, currentValue, targetValue, release, reinvest, remaining, existingCash, modeledCash: roundMoney(existingCash + remaining) };
}

function renderConcentrationCommand(ribbon, mandate, legacy, context) {
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
  const name = String(review.holding.name || symbol).replace(/\s+(Inc\.?|Corporation|Corp\.?)$/i, "");

  mandate.innerHTML = `<div class="scenario-command-grid" data-command-header>
    <section class="scenario-command-current" aria-label="Current concentration context">
      <span>${escapeHtml(symbol)} concentration</span>
      <div class="scenario-current-flow"><strong>${formatPercent(currentWeight)}</strong><i aria-hidden="true">→</i><strong data-command-target-summary>${formatPercent(target)}</strong></div>
      <small>${formatMoney(review.holding.value)} today</small>
      <em>Household target ${formatPercent(policyTarget)}</em>
    </section>
    <section class="scenario-command-control scenario-command-target">
      <header><span>Target ${escapeHtml(name)} position</span><label class="scenario-command-input percent"><input type="number" data-scenario-target min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target.toFixed(1)}" aria-label="Target ${escapeHtml(name)} position weight"><b>%</b></label></header>
      <input class="scenario-command-range" type="range" data-command-target-range min="${targetMinimum}" max="${targetMaximum}" step="0.5" value="${target}" style="--command-progress:${progress(target, targetMinimum, targetMaximum)}%" aria-label="Target ${escapeHtml(name)} position weight slider">
      <footer><span>${formatPercent(targetMinimum)}</span><em>Household target ${formatPercent(policyTarget)}</em><span>${formatPercent(targetMaximum)}</span></footer>
    </section>
    <section class="scenario-command-control scenario-command-amount">
      <header><span>Amount to reinvest<small data-command-proceeds>${formatMoney(economics.release)} proceeds created</small></span><label class="scenario-command-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-command-amount-input value="${number.format(amount)}" aria-label="Amount to reinvest"></label></header>
      <input class="scenario-command-range" type="range" data-command-amount-range data-command-amount-key="${escapeHtml(legacy.amountKey)}" min="0" max="${economics.release}" step="5000" value="${amount}" style="--command-progress:${progress(amount, 0, economics.release)}%" aria-label="Amount to reinvest slider">
      <footer><span>$0</span><em data-command-available>${formatMoney(economics.release)} available</em><span data-command-maximum>${formatMoney(economics.release)}</span></footer>
      <p class="scenario-command-note"><strong data-command-remainder>${formatMoney(Math.max(0, economics.release - amount))}</strong> of sale proceeds remains in cash. Existing household cash ${formatMoney(economics.existingCash)} → <strong data-command-modeled-cash>${formatMoney(economics.existingCash + Math.max(0, economics.release - amount))}</strong> modeled.</p>
    </section>
  </div>`;

  const targetInput = mandate.querySelector("[data-scenario-target]");
  const targetRange = mandate.querySelector("[data-command-target-range]");
  const amountInput = mandate.querySelector("[data-command-amount-input]");
  const amountRange = mandate.querySelector("[data-command-amount-range]");

  const refreshLocal = () => {
    const nextTarget = clamp(Number(targetInput.value), targetMinimum, targetMaximum);
    const nextEconomics = concentrationEconomics(context, nextTarget, parseAmount(amountInput.value) ?? Number(amountRange.value));
    const nextAmount = Math.min(nextEconomics.release, Math.max(0, parseAmount(amountInput.value) ?? Number(amountRange.value) || 0));
    targetInput.value = nextTarget.toFixed(1);
    targetRange.value = String(nextTarget);
    amountRange.max = String(nextEconomics.release);
    amountRange.value = String(roundMoney(nextAmount));
    amountInput.value = number.format(roundMoney(nextAmount));
    mandate.querySelector("[data-command-target-summary]").textContent = formatPercent(nextTarget);
    mandate.querySelector("[data-command-proceeds]").textContent = `${formatMoney(nextEconomics.release)} proceeds created`;
    mandate.querySelector("[data-command-available]").textContent = `${formatMoney(nextEconomics.release)} available`;
    mandate.querySelector("[data-command-maximum]").textContent = formatMoney(nextEconomics.release);
    mandate.querySelector("[data-command-remainder]").textContent = formatMoney(Math.max(0, nextEconomics.release - nextAmount));
    mandate.querySelector("[data-command-modeled-cash]").textContent = formatMoney(nextEconomics.existingCash + Math.max(0, nextEconomics.release - nextAmount));
    setRangeProgress(targetRange);
    setRangeProgress(amountRange);
  };

  targetRange.addEventListener("input", () => {
    targetInput.value = Number(targetRange.value).toFixed(1);
    refreshLocal();
  });
  targetRange.addEventListener("change", () => {
    targetInput.value = Number(targetRange.value).toFixed(1);
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  targetInput.addEventListener("input", refreshLocal);
  targetInput.addEventListener("change", () => {
    const value = clamp(Number(targetInput.value), targetMinimum, targetMaximum);
    targetInput.value = value.toFixed(1);
    refreshLocal();
  });
  targetInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); targetInput.blur(); } });

  amountRange.addEventListener("input", () => {
    amountInput.value = number.format(Number(amountRange.value));
    refreshLocal();
  });
  amountRange.addEventListener("change", () => dispatchAmount(ribbon, Number(amountRange.value), legacy.amountKey));
  amountInput.addEventListener("input", refreshLocal);
  amountInput.addEventListener("change", () => {
    refreshLocal();
    dispatchAmount(ribbon, parseAmount(amountInput.value) || 0, legacy.amountKey);
  });
  amountInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); amountInput.blur(); } });
  return true;
}

function renderGenericAmountCommand(ribbon, mandate, legacy) {
  if (!legacy.hasAmount) return false;
  const maximum = Math.max(legacy.amountMaximum, legacy.amount || 0);
  const amount = clamp(legacy.amount || 0, 0, maximum);
  mandate.innerHTML = `<div class="scenario-command-grid generic" data-command-header>
    <section class="scenario-command-current"><span>Investment mandate</span><strong class="scenario-generic-value">${formatMoney(maximum)}</strong><small>Capital available from the household decision</small></section>
    <section class="scenario-command-control scenario-command-amount">
      <header><span>Amount to invest</span><label class="scenario-command-input money"><b>$</b><input type="text" inputmode="numeric" autocomplete="off" data-command-amount-input value="${number.format(amount)}" aria-label="Amount to invest"></label></header>
      <input class="scenario-command-range" type="range" data-command-amount-range data-command-amount-key="${escapeHtml(legacy.amountKey)}" min="0" max="${maximum}" step="5000" value="${amount}" style="--command-progress:${progress(amount, 0, maximum)}%" aria-label="Amount to invest slider">
      <footer><span>$0</span><em>${formatMoney(maximum)} available</em><span>${formatMoney(maximum)}</span></footer>
    </section>
  </div>`;
  const input = mandate.querySelector("[data-command-amount-input]");
  const range = mandate.querySelector("[data-command-amount-range]");
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

async function enhanceCommandHeader() {
  const ribbon = document.querySelector("#scenarioRibbon.proposal-mode:not([hidden])");
  const mandate = ribbon?.querySelector("#scenarioMandate");
  if (!ribbon || !mandate || mandate.querySelector("[data-command-header]")) return;
  const legacy = captureLegacyState(mandate);
  if (!legacy.hasTarget && !legacy.hasAmount) return;

  ribbon.classList.add("command-header-mode");
  const tags = ribbon.querySelector("#scenarioTags");
  const capital = ribbon.querySelector("#scenarioCapital");
  if (tags) tags.hidden = true;
  if (capital) capital.hidden = true;

  const generation = ++renderGeneration;
  const householdName = householdNameFromRibbon(ribbon);
  const context = legacy.hasTarget ? await loadHouseholdContext(householdName) : null;
  if (generation !== renderGeneration || !ribbon.isConnected || ribbon.hidden || !ribbon.classList.contains("proposal-mode")) return;
  if (mandate.querySelector("[data-command-header]")) return;

  if (context?.concentration && renderConcentrationCommand(ribbon, mandate, legacy, context)) return;
  renderGenericAmountCommand(ribbon, mandate, legacy);
}

function scheduleEnhancement() {
  if (enhancementScheduled) return;
  enhancementScheduled = true;
  requestAnimationFrame(() => {
    enhancementScheduled = false;
    enhanceCommandHeader();
  });
}

function installStyles() {
  if (document.getElementById(COMMAND_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = COMMAND_STYLE_ID;
  style.textContent = `
    .scenario-ribbon.proposal-mode.command-header-mode { min-height: 184px; grid-template-columns: minmax(0,1fr) auto 30px; grid-template-rows: auto 1fr; align-items:center; gap:11px 10px; padding:13px clamp(24px,2.5vw,42px) 16px; border-bottom-color:#cfcfca; background:#f7f7f4; box-shadow:0 4px 15px rgba(0,0,0,.05); }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-progress { grid-column:1; grid-row:1; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-main { grid-column:1/-1; grid-row:2; display:grid; grid-template-columns:minmax(205px,.72fr) minmax(0,3fr); grid-template-rows:auto auto; align-items:center; column-gap:clamp(20px,2vw,34px); }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-main > span { grid-column:1; grid-row:1; align-self:end; color:#777; font-size:8px; font-weight:700; letter-spacing:.1em; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-main > strong { grid-column:1; grid-row:2; align-self:start; max-width:255px; overflow:visible; white-space:normal; font-family:Georgia,serif; font-size:21px; font-weight:400; line-height:1.16; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-tags, .scenario-ribbon.proposal-mode.command-header-mode .scenario-capital { display:none !important; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-mandate { grid-column:2; grid-row:1/span 2; min-width:0; display:block; margin:0; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-back { grid-column:2; grid-row:1; min-height:32px; order:initial; border:1px solid #cfcfca; border-radius:2px; padding:6px 10px; background:#fff; font-size:8px; white-space:nowrap; }
    .scenario-ribbon.proposal-mode.command-header-mode .scenario-dismiss { grid-column:3; grid-row:1; width:30px; height:30px; order:initial; }
    .scenario-command-grid { min-width:0; display:grid; grid-template-columns:minmax(135px,.55fr) minmax(220px,1fr) minmax(300px,1.28fr); align-items:stretch; gap:clamp(14px,1.5vw,24px); }
    .scenario-command-grid.generic { grid-template-columns:minmax(220px,.7fr) minmax(380px,1.55fr); }
    .scenario-command-current { min-width:0; display:grid; align-content:center; gap:4px; padding-right:clamp(12px,1.3vw,22px); border-right:1px solid #d6d6d1; }
    .scenario-command-current > span { overflow:hidden; color:#6f6f6b!important; font-size:7.5px!important; font-weight:700; letter-spacing:.1em!important; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    .scenario-current-flow { display:flex; align-items:center; gap:8px; }
    .scenario-current-flow strong, .scenario-generic-value { font-family:Georgia,serif; font-size:22px; font-weight:400; line-height:1; }
    .scenario-current-flow strong:last-child { color:#355f4e; }
    .scenario-current-flow i { color:#9b9b96; font-size:13px; font-style:normal; }
    .scenario-command-current small { color:#747470; font-size:8px; }
    .scenario-command-current em { color:#52524f; font-size:7.5px; font-style:normal; font-weight:700; }
    .scenario-command-control { min-width:0; display:grid; align-content:center; gap:7px; }
    .scenario-command-control header { min-height:36px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .scenario-command-control header > span { display:grid; gap:3px; color:#5d5d59!important; font-size:7.5px!important; font-weight:700; letter-spacing:.08em!important; text-transform:uppercase; }
    .scenario-command-control header > span small { color:#8a8a86; font-size:7px; font-weight:400; letter-spacing:0; text-transform:none; }
    .scenario-command-input { height:32px; display:inline-flex!important; align-items:center; justify-content:flex-end; gap:3px!important; flex:none; border:1px solid #bebeb9; border-radius:2px; background:#fff; padding:0 8px; color:#222; font-variant-numeric:tabular-nums; }
    .scenario-command-input:focus-within { border-color:#555; box-shadow:0 0 0 2px rgba(0,0,0,.06); }
    .scenario-command-input input { min-width:0; border:0; outline:0; background:transparent; color:#171717; font-size:10px; font-weight:700; text-align:right; cursor:text; }
    .scenario-command-input.percent input { width:48px; }
    .scenario-command-input.money input { width:88px; }
    .scenario-command-input b { font-size:9px; font-weight:700; }
    .scenario-command-input input[type=number]::-webkit-inner-spin-button, .scenario-command-input input[type=number]::-webkit-outer-spin-button { margin:0; -webkit-appearance:none; }
    .scenario-command-range { --command-progress:0%; width:100%; height:16px; margin:0; appearance:none; -webkit-appearance:none; background:transparent; cursor:pointer; }
    .scenario-command-range::-webkit-slider-runnable-track { height:3px; border-radius:2px; background:linear-gradient(to right,#171717 0 var(--command-progress),#d2d2ce var(--command-progress) 100%); }
    .scenario-command-range::-webkit-slider-thumb { width:14px; height:14px; margin-top:-5.5px; border:1px solid #8d8d88; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.18); -webkit-appearance:none; }
    .scenario-command-range::-moz-range-track { height:3px; border:0; border-radius:2px; background:#d2d2ce; }
    .scenario-command-range::-moz-range-progress { height:3px; border-radius:2px; background:#171717; }
    .scenario-command-range::-moz-range-thumb { width:14px; height:14px; border:1px solid #8d8d88; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.18); }
    .scenario-command-control footer { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; color:#92928e; font-size:7px; font-variant-numeric:tabular-nums; }
    .scenario-command-control footer em { overflow:hidden; color:#60605c; font-size:7.5px; font-style:normal; font-weight:700; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    .scenario-command-note { margin:0; color:#767672; font-size:7.5px; line-height:1.35; }
    .scenario-command-note strong { color:#222; }
    @media (max-width:1320px) {
      .scenario-ribbon.proposal-mode.command-header-mode { padding-left:24px; padding-right:24px; }
      .scenario-ribbon.proposal-mode.command-header-mode .scenario-main { grid-template-columns:185px minmax(0,1fr); column-gap:18px; }
      .scenario-ribbon.proposal-mode.command-header-mode .scenario-main > strong { max-width:195px; font-size:19px; }
      .scenario-command-grid { grid-template-columns:126px minmax(190px,.9fr) minmax(270px,1.2fr); gap:14px; }
      .scenario-command-grid.generic { grid-template-columns:190px minmax(330px,1.4fr); }
      .scenario-command-current { padding-right:12px; }
      .scenario-command-input.money input { width:76px; }
    }
  `;
  document.head.appendChild(style);
}

installStyles();
const observer = new MutationObserver(scheduleEnhancement);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "aria-pressed"] });
scheduleEnhancement();
