// Asset-class estimates only. Product classifications are not holdings look-through.
export function investmentAllocationBucket(candidate = {}) {
  const asset = String(candidate.assetClass || "");
  if (/^US (?:Large|Small|Mid|Broad|Equity)/i.test(asset)) return "US equity";
  if (/^(?:International|Emerging Markets) Equity$/i.test(asset)) return "International equity";
  if (/Municipal/i.test(asset)) return "Municipal bonds";
  if (/^(?:Core(?: Plus)? Bond|Short Government|US Government|Investment Grade Corporate|High Yield Bond|Agency)$/i.test(asset)) return "Fixed income";
  if (/^Cash/i.test(asset)) return "Cash equivalents";
  if (/^(?:Private Credit|Private Equity|Hedge Funds|Private Infrastructure|Private Real Estate|Gold|Silver|Platinum|Palladium)$/i.test(asset)) return "Alternatives";
  return null;
}

export function calculateProposalImpact(model, candidates = []) {
  if (model?.version !== 1 || !(Number(model.financialAssets) > 0)) {
    return { impact: {}, notes: ["Reopen the household decision to refresh this proposal's impact estimates."], unresolvedAmount: 0 };
  }
  const assets = Number(model.financialAssets);
  const pct = (amount) => amount / assets * 100;
  const purchases = new Map();
  let allocated = 0;
  let unresolvedAmount = 0;
  let sourceRepurchase = 0;
  for (const candidate of candidates) {
    const amount = Math.max(0, Number(candidate.amount) || 0);
    const bucket = investmentAllocationBucket(candidate);
    allocated += amount;
    if (bucket) purchases.set(bucket, (purchases.get(bucket) || 0) + amount);
    else unresolvedAmount += amount;
    if (candidate.category === "Equities" && candidate.symbol && candidate.symbol === model.sourceSymbol) sourceRepurchase += amount;
  }
  const impact = {};
  const add = (key, label, before, after, format = "currency") => {
    if (!Number.isFinite(before)) return;
    impact[key] = { label, before, after, format };
  };
  if (model.kind === "concentration") {
    add("concentration", `Direct ${model.sourceSymbol || "source"} position`, pct(model.sourceValueBefore), pct(model.sourceValueAfterSale + sourceRepurchase), "percent");
  }
  // Funding and purchases reconcile in dollars. Unallocated capital stays in cash.
  const cash = model.cashAfterFunding - allocated;
  add("cash", "Uninvested cash", model.cashBefore, cash);
  add("cashWeight", "Uninvested cash weight", pct(model.cashBefore), pct(cash), "percent");
  const usPurchases = purchases.get("US equity") || 0;
  add("usEquity", "US equity allocation", model.usEquityBeforePct,
    unresolvedAmount || model.usEquityAfterSale === null ? null : pct(model.usEquityAfterSale + usPurchases), "percent");
  if (model.kind === "allocation") {
    add("allocation", "Municipal allocation", model.municipalBeforePct,
      unresolvedAmount ? null : model.municipalBeforePct + pct(purchases.get("Municipal bonds") || 0), "percent");
  }
  const notes = ["Allocation estimates use the selected investments' declared asset classes. Underlying holdings and tax liability are not modeled."];
  if (model.kind === "concentration") notes.push(`Direct ${model.sourceSymbol || "position"} exposure excludes holdings inside funds and managed strategies. Confirm overlap and any exclusion before implementation.`);
  if (unresolvedAmount) notes.push("Some selected investments need exposure data. Affected allocation estimates are withheld.");
  if (model.usEquityAfterSale === null) notes.push("The source position needs an asset-class classification before US equity allocation can be estimated.");
  return { impact, notes, unresolvedAmount, allocated, cash, purchases: Object.fromEntries(purchases) };
}
