const DEFAULT_LIQUIDITY_TARGET_PCT = 4;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function roundMoney(value, step = 1000) {
  return Math.round((Number(value) || 0) / step) * step;
}

function ratio(value, total) {
  return total > 0 ? value / total : 0;
}

function safeRisk(riskProfile = "") {
  if (/conservative/i.test(riskProfile)) return "Conservative";
  if (/growth/i.test(riskProfile)) return "Moderate";
  return "Moderate";
}

function goalGap(goal) {
  return goal ? Math.max(0, Number(goal.target) - Number(goal.funded)) : 0;
}

function progress(funded, target) {
  return target > 0 ? Math.min(100, Math.round(funded / target * 100)) : 0;
}

function numericAssumption(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function metric(key, label, format, before, after, tone = "neutral", detail = "") {
  return { key, label, format, before, after, delta: Number(after) - Number(before), tone, detail };
}

export const DECISION_STATUSES = Object.freeze(["New", "Reviewing", "Plan drafted", "Client discussion", "Approved", "In progress", "Complete"]);

export function decisionStatusRank(status) {
  const index = DECISION_STATUSES.indexOf(status);
  return index < 0 ? 0 : index;
}

export function planTemplateForDecision(type) {
  const templates = {
    concentration: [
      "Review account location and taxable lots",
      "Confirm liquidity or goal-funding amount",
      "Evaluate diversified implementation candidates",
      "Prepare client discussion",
      "Confirm approved implementation approach",
    ],
    liquidity: [
      "Confirm near-term household liquidity needs",
      "Set the minimum cash reserve",
      "Evaluate deployment alternatives",
      "Review the proposed amount with the client",
      "Confirm the implementation approach",
    ],
    "goal-funding": [
      "Validate the goal target and timing",
      "Confirm the funding source",
      "Model the incremental funding amount",
      "Review the household impact with the client",
      "Record the agreed next step",
    ],
    "upcoming-obligation": [
      "Confirm the obligation and due date",
      "Validate the funding source",
      "Reserve the required liquidity",
      "Confirm payment timing and ownership",
    ],
    allocation: [
      "Validate the household policy target",
      "Confirm the implementation amount",
      "Evaluate appropriate implementation options",
      "Review the allocation change with the client",
      "Confirm the approved allocation path",
    ],
  };
  return templates[type] || ["Review the underlying evidence", "Confirm the advisor decision", "Record the agreed next step"];
}

function concentrationScenario({ decision, household, review, goal }, assumptions) {
  if (!review?.holding || !household?.financialAssets) return null;
  const currentWeight = Number(review.holding.weight) || 0;
  const policyTarget = Number(review.targetWeight) || 0;
  const minimumTarget = Math.min(currentWeight, Math.max(0, Math.min(5, policyTarget)));
  const defaultTarget = clamp(policyTarget || currentWeight, minimumTarget, currentWeight);
  const targetWeight = clamp(numericAssumption(assumptions.targetWeight, defaultTarget), minimumTarget, currentWeight);
  const targetValue = household.financialAssets * targetWeight / 100;
  const releaseAmount = Math.max(0, review.holding.value - targetValue);
  const gap = goalGap(goal);
  const maxGoalFunding = Math.min(gap, releaseAmount);
  const goalFundingAmount = clamp(numericAssumption(assumptions.goalFundingAmount, 0), 0, maxGoalFunding);
  const implementationAmount = Math.max(0, releaseAmount - goalFundingAmount);
  const realizedGain = review.holding.value > 0 ? releaseAmount / review.holding.value * Number(review.unrealizedGain || 0) : 0;
  const proposedCash = household.investableCash + goalFundingAmount;
  const proposedGoalFunded = goal ? Math.min(goal.target, goal.funded + goalFundingAmount) : 0;
  const currentRiskContribution = Number(review.riskContribution || 0);
  const proposedRiskContribution = currentWeight > 0 ? currentRiskContribution * targetWeight / currentWeight : 0;
  const stressBefore = Number(review.holding.value) * 0.35;
  const stressAfter = targetValue * 0.35;
  const controls = [{ key: "targetWeight", label: `${review.holding.symbol} target weight`, format: "percent", min: minimumTarget, max: currentWeight, step: 1, value: targetWeight }];
  if (goal && maxGoalFunding >= 25_000) controls.push({ key: "goalFundingAmount", label: `Earmark for ${goal.name}`, format: "currency", min: 0, max: roundMoney(maxGoalFunding, 25_000), step: 25_000, value: roundMoney(goalFundingAmount, 25_000) });

  const metrics = [
    metric("positionWeight", "Concentrated position", "percent", currentWeight, targetWeight, "good", `${review.holding.symbol} household weight`),
    metric("positionValue", "Position market value", "currency", review.holding.value, targetValue, "good"),
    metric("stressLoss", "35% single-stock drawdown", "currency-negative", stressBefore, stressAfter, "good", "Illustrative position-level stress"),
    metric("liquidity", "Readily available liquidity", "currency", household.investableCash, proposedCash, goalFundingAmount > 0 ? "good" : "neutral"),
    metric("riskContribution", "Modeled equity-risk contribution", "percent", currentRiskContribution, proposedRiskContribution, "good"),
  ];
  if (goal) metrics.push(metric("goalProgress", `${goal.name} funding`, "percent", goal.progress, progress(proposedGoalFunded, goal.target), goalFundingAmount > 0 ? "good" : "neutral"));
  metrics.push(metric("realizedGain", "Estimated realized gain", "currency", 0, realizedGain, "watch", "Gain estimate only; taxes are not modeled"));

  return {
    kind: "concentration",
    summary: `Model a reduction in ${review.holding.symbol} while deciding how much released value should support household liquidity or a priority goal versus be redeployed.`,
    controls,
    metrics,
    outputs: {
      releaseAmount: roundMoney(releaseAmount),
      goalFundingAmount: roundMoney(goalFundingAmount),
      implementationAmount: roundMoney(implementationAmount),
      estimatedRealizedGain: roundMoney(realizedGain),
      stressLossReduction: roundMoney(stressBefore - stressAfter),
    },
    implementation: implementationAmount >= 25_000 ? {
      objective: "Diversified US equity implementation",
      amount: roundMoney(implementationAmount),
      category: "SMAs",
      query: "tax-aware direct indexing",
      flags: ["Tax-Aware", "Direct Indexing"],
      risks: [safeRisk(household.riskProfile)],
      tags: [household.name, `${review.holding.symbol} concentration`, "Tax-aware implementation"],
    } : null,
    notes: [
      "Scenario math uses current household and position values; it does not forecast market returns.",
      "Estimated realized gain is proportional to current position-level unrealized gain. Tax liability is intentionally not estimated.",
    ],
  };
}

function liquidityScenario({ household }, assumptions) {
  if (!household?.financialAssets) return null;
  const targetCash = household.financialAssets * DEFAULT_LIQUIDITY_TARGET_PCT / 100;
  const maximumDeployable = Math.max(0, household.investableCash - targetCash);
  const deployAmount = clamp(numericAssumption(assumptions.deployAmount, maximumDeployable), 0, maximumDeployable);
  const cashAfter = household.investableCash - deployAmount;
  return {
    kind: "liquidity",
    summary: "Model how much excess household cash can be deployed while preserving an explicit liquidity floor.",
    controls: [{ key: "deployAmount", label: "Amount to deploy", format: "currency", min: 0, max: roundMoney(maximumDeployable, 25_000), step: 25_000, value: roundMoney(deployAmount, 25_000) }],
    metrics: [
      metric("cash", "Household cash", "currency", household.investableCash, cashAfter, deployAmount > 0 ? "good" : "neutral"),
      metric("liquidityPct", "Liquidity", "percent", household.liquidityPct, ratio(cashAfter, household.financialAssets) * 100, "neutral"),
      metric("deployment", "Amount deployed", "currency", 0, deployAmount, deployAmount > 0 ? "good" : "neutral"),
    ],
    outputs: { implementationAmount: roundMoney(deployAmount), liquidityFloor: roundMoney(targetCash) },
    implementation: deployAmount >= 25_000 ? {
      objective: "Deploy excess household liquidity",
      amount: roundMoney(deployAmount),
      category: "Fixed Income",
      query: "short duration cash management",
      flags: [],
      risks: ["Conservative"],
      tags: [household.name, `${DEFAULT_LIQUIDITY_TARGET_PCT}% liquidity floor`, "Daily liquidity"],
    } : null,
    notes: ["The liquidity floor is an explicit scenario assumption, not a suitability recommendation."],
  };
}

function goalFundingScenario({ household, goal }, assumptions) {
  if (!household || !goal) return null;
  const gap = goalGap(goal);
  const liquidityFloor = household.financialAssets * DEFAULT_LIQUIDITY_TARGET_PCT / 100;
  const availableAboveFloor = Math.max(0, household.investableCash - liquidityFloor);
  const maximumFunding = Math.min(gap, household.investableCash);
  const defaultFunding = Math.min(gap, availableAboveFloor);
  const fundingAmount = clamp(numericAssumption(assumptions.fundingAmount, defaultFunding), 0, maximumFunding);
  const fundedAfter = Math.min(goal.target, goal.funded + fundingAmount);
  const cashAfter = Math.max(0, household.investableCash - fundingAmount);
  return {
    kind: "goal-funding",
    summary: `Model incremental funding for ${goal.name} and see the immediate effect on household liquidity.`,
    controls: [{ key: "fundingAmount", label: "Additional goal funding", format: "currency", min: 0, max: roundMoney(maximumFunding, 25_000), step: 25_000, value: roundMoney(fundingAmount, 25_000) }],
    metrics: [
      metric("goalFunded", "Goal funded amount", "currency", goal.funded, fundedAfter, fundingAmount > 0 ? "good" : "neutral"),
      metric("goalProgress", "Goal progress", "percent", goal.progress, progress(fundedAfter, goal.target), fundingAmount > 0 ? "good" : "neutral"),
      metric("cash", "Household cash", "currency", household.investableCash, cashAfter, cashAfter < liquidityFloor ? "watch" : "neutral"),
      metric("liquidityPct", "Liquidity", "percent", household.liquidityPct, ratio(cashAfter, household.financialAssets) * 100, cashAfter < liquidityFloor ? "watch" : "neutral"),
    ],
    outputs: { fundingAmount: roundMoney(fundingAmount), remainingGap: roundMoney(Math.max(0, goal.target - fundedAfter)), liquidityFloor: roundMoney(liquidityFloor) },
    implementation: null,
    notes: ["Funding is modeled from currently available household cash only; future contributions and market returns are excluded."],
  };
}

function upcomingObligationScenario({ decision, household }) {
  const amount = Math.max(0, Number(decision.amount || 0));
  const cashAfter = Math.max(0, household.investableCash - amount);
  return {
    kind: "upcoming-obligation",
    summary: "Confirm that the identified funding source covers the upcoming obligation and preserves acceptable post-funding liquidity.",
    controls: [],
    metrics: [
      metric("obligation", "Upcoming obligation", "currency", 0, amount, "watch"),
      metric("cash", "Household cash after funding", "currency", household.investableCash, cashAfter, "neutral"),
      metric("liquidityPct", "Liquidity after funding", "percent", household.liquidityPct, ratio(cashAfter, household.financialAssets) * 100, "neutral"),
    ],
    outputs: { obligationAmount: roundMoney(amount), cashAfter: roundMoney(cashAfter) },
    implementation: null,
    notes: ["This view confirms funding capacity; it does not initiate a payment or transfer."],
  };
}

function allocationScenario({ decision, household }, assumptions) {
  const currentPct = Math.max(0, Number(decision.currentPct || 0));
  const targetPct = Math.max(currentPct, Number(decision.targetPct || currentPct));
  const fullGap = Math.max(0, household.financialAssets * (targetPct - currentPct) / 100);
  const implementationAmount = clamp(numericAssumption(assumptions.implementationAmount, fullGap), 0, fullGap);
  const proposedPct = household.financialAssets ? currentPct + implementationAmount / household.financialAssets * 100 : currentPct;
  return {
    kind: "allocation",
    summary: "Model the amount required to move the household allocation toward its stated policy target.",
    controls: [{ key: "implementationAmount", label: "Allocation change", format: "currency", min: 0, max: roundMoney(fullGap, 25_000), step: 25_000, value: roundMoney(implementationAmount, 25_000) }],
    metrics: [metric("allocation", "Policy allocation", "percent", currentPct, proposedPct, implementationAmount > 0 ? "good" : "neutral"), metric("implementation", "Implementation amount", "currency", 0, implementationAmount, "good")],
    outputs: { implementationAmount: roundMoney(implementationAmount), fullPolicyGap: roundMoney(fullGap) },
    implementation: implementationAmount >= 25_000 ? {
      objective: "Move allocation toward household policy",
      amount: roundMoney(implementationAmount),
      category: "Fixed Income",
      query: /municipal/i.test(decision.title || "") ? "municipal income" : "",
      flags: /municipal/i.test(decision.title || "") ? ["Tax-Aware"] : [],
      risks: ["Conservative"],
      tags: [household.name, `${targetPct.toFixed(1)}% policy target`],
    } : null,
    notes: ["The scenario shows arithmetic movement toward policy; it does not determine whether the target itself is appropriate."],
  };
}

export function buildDecisionScenario(context, assumptions = {}) {
  switch (context.decision.type) {
    case "concentration": return concentrationScenario(context, assumptions);
    case "liquidity": return liquidityScenario(context, assumptions);
    case "goal-funding": return goalFundingScenario(context, assumptions);
    case "upcoming-obligation": return upcomingObligationScenario(context, assumptions);
    case "allocation": return allocationScenario(context, assumptions);
    default: return { kind: "review", summary: context.decision.summary || "Review the underlying household evidence.", controls: [], metrics: [], outputs: {}, implementation: null, notes: [] };
  }
}
