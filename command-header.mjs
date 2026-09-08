// Proposal controls render from the application's canonical scenario response.
// There is no second household lookup, inferred DOM state, or parallel money model.
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const percent = (value) => `${Number(value).toFixed(1)}%`;

export function renderProposalControls({ container, scenario, detail, pending, onChange }) {
  if (!scenario || !detail) { container.hidden = true; return; }
  container.hidden = false;
  const concentration = detail.decision.kind === "concentration";
  const amountKey = concentration ? "redeployAmount" : detail.decision.kind === "liquidity" ? "deployAmount" : "allocationAmount";
  const amount = Number(scenario.implementation.amount || 0);
  const maximum = concentration ? Math.max(0, scenario.economics.release - (scenario.economics.goalFunding || 0))
    : detail.decision.kind === "liquidity" ? Math.max(0, scenario.before.cash - scenario.economics.reserveAmount)
    : Number(detail.model.bounds[amountKey]?.max || amount);
  const target = Number(scenario.inputs.targetWeight || 0);
  const signature = JSON.stringify([scenario.decisionId, target, amount, maximum, pending]);
  if (container.dataset.signature === signature) return;
  container.dataset.signature = signature;
  const disabled = pending ? "disabled" : "";
  const symbol = scenario.proposalModel?.sourceSymbol || "Position";
  container.innerHTML = `<div class="proposal-decision-grid ${concentration ? "" : "generic"}">
    <div class="proposal-decision-summary"><span>${concentration ? "Direct position" : "Available capital"}</span>
      <div><strong>${concentration ? escape(symbol) : money.format(maximum)}</strong>${concentration ? `<b>${percent(scenario.before.concentrationPct)}</b><i aria-hidden="true">→</i><em>${percent(scenario.after.concentrationPct)}</em>` : ""}</div>
      <small>${concentration ? `${money.format(scenario.economics.release)} sale proceeds` : "From this household decision"}</small>
    </div>
    ${concentration ? `<label class="proposal-decision-field proposal-decision-target"><span>Target direct weight</span><div class="proposal-decision-input"><input type="number" data-command-target-input min="1" max="${scenario.before.concentrationPct}" step="0.1" value="${target}" aria-label="Target ${escape(symbol)} position weight" ${disabled}><b>%</b></div><input class="proposal-decision-range" type="range" data-command-target-range min="1" max="${scenario.before.concentrationPct}" step="0.1" value="${target}" aria-label="Target ${escape(symbol)} position weight slider" ${disabled}></label>` : ""}
    <label class="proposal-decision-field proposal-decision-amount"><span>${concentration ? "Amount to reinvest" : "Amount to invest"}</span><div class="proposal-decision-input money"><b>$</b><input type="text" inputmode="numeric" data-command-amount-input value="${number.format(amount)}" aria-label="${concentration ? "Amount to reinvest" : "Amount to invest"}" ${disabled}></div><input class="proposal-decision-range" type="range" data-command-amount-range min="0" max="${maximum}" step="1000" value="${amount}" aria-label="Investment amount slider" ${disabled}></label>
    <div class="proposal-decision-cash"><span>Cash after investment</span><strong>${money.format(scenario.after.cash)}</strong><small>${pending ? "Updating mandate…" : "Before taxes · uninvested cash"}</small></div>
  </div>`;
  const amountInput = container.querySelector("[data-command-amount-input]");
  const amountRange = container.querySelector("[data-command-amount-range]");
  const commitAmount = () => {
    const parsed = Number(amountInput.value.replace(/,/g, ""));
    const next = amountInput.value.trim() && Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, Math.round(parsed))) : amount;
    amountInput.value = number.format(next);
    if (next !== amount) onChange({ [amountKey]: next });
  };
  amountInput.addEventListener("change", commitAmount);
  amountInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); commitAmount(); amountInput.blur(); } });
  amountRange.addEventListener("input", () => { amountInput.value = number.format(Number(amountRange.value)); });
  amountRange.addEventListener("change", commitAmount);
  if (concentration) {
    const input = container.querySelector("[data-command-target-input]");
    const range = container.querySelector("[data-command-target-range]");
    const commit = () => {
      const parsed = Number(input.value);
      const next = input.value.trim() && Number.isFinite(parsed) ? Math.min(scenario.before.concentrationPct, Math.max(1, parsed)) : target;
      input.value = String(next);
      if (next !== target) onChange({ targetWeight: next });
    };
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); commit(); input.blur(); } });
    range.addEventListener("input", () => { input.value = range.value; });
    range.addEventListener("change", commit);
  }
}
