import { MORRISON_WEALTH_DATASET } from "./wealth-source.js";

const ADVISOR_ID = "advisor-042";
const AS_OF = "Aug 21, 2026 · 9:42 AM ET";
const GENERATED_HOUSEHOLDS = 127;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function round(value, step = 1) {
  return Math.round(value / step) * step;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pct(value, total) {
  return total ? Number((value / total * 100).toFixed(1)) : 0;
}

function moneyShort(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2).replace(/\.0$/, "")}M`;
  return `$${Math.round(value / 1000)}K`;
}

function allocationParts(total, weights) {
  const normalized = weights.map((weight) => weight / weights.reduce((sum, item) => sum + item, 0));
  let used = 0;
  return normalized.map((weight, index) => {
    if (index === normalized.length - 1) return total - used;
    const value = round(total * weight, 1000);
    used += value;
    return value;
  });
}

function initials(name) {
  return name.split(/\s+/).filter((part) => !["Household", "Family"].includes(part)).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

const PRIMARY_SURNAMES = [
  "Chen", "Patel", "Rivera", "Walsh", "Kim", "Shah", "Martinez", "Nguyen", "Johnson", "Cohen", "Singh", "Garcia", "Thompson", "Lee", "Anderson", "Brown",
  "Williams", "Davis", "Wilson", "Moore", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young",
];
const SECONDARY_SURNAMES = [
  "Bennett", "Foster", "Brooks", "Reed", "Morgan", "Cooper", "Bailey", "Price", "Ward", "Kelly", "Murphy", "Ross", "Cook", "Bell", "Perry", "Powell",
];
const FIRST_NAMES = ["James", "Sophia", "Daniel", "Maya", "Michael", "Olivia", "David", "Emma", "Alexander", "Isabella", "Jonathan", "Ava", "Christopher", "Grace", "Andrew", "Natalie"];
const LOCATIONS = ["New York", "Boston", "Chicago", "Miami", "San Francisco", "Los Angeles", "Austin", "Seattle", "Greenwich", "Palm Beach", "Denver", "Washington, DC"];
const RISK_PROFILES = ["Conservative", "Moderate", "Moderate growth", "Growth", "Balanced growth"];
const ACCOUNT_TEMPLATES = [
  ["Joint brokerage", "Taxable", "Advisory", "custodied", "Primary taxable portfolio", "Taxable · joint tenants"],
  ["Family trust", "Trust", "Advisory", "custodied", "Intergenerational wealth", "Taxable trust"],
  ["Traditional IRA", "Retirement", "Advisory", "custodied", "Retirement income", "Tax deferred"],
  ["Roth IRA", "Retirement", "Advisory", "custodied", "Long-term tax-free growth", "Tax free"],
  ["Employer 401(k)", "Held away", "Connected external", "held-away", "Retirement income", "Tax deferred"],
  ["Cash management", "Taxable", "Advisory", "custodied", "Liquidity reserve", "Taxable"],
  ["Education 529", "529", "Advisory", "custodied", "Education funding", "Tax advantaged"],
  ["External investments", "Held away", "Connected external", "held-away", "Full-balance-sheet visibility", "Mixed registrations"],
  ["Private investments", "Alternative", "Advisory", "custodied", "Long-term alternatives", "Mixed"],
  ["Donor-advised fund", "Charitable", "Advisory", "custodied", "Charitable giving", "Tax advantaged"],
];
const HOLDINGS = [
  ["AAPL", "Apple Inc.", "apple"], ["MSFT", "Microsoft Corporation", "microsoft"], ["NVDA", "NVIDIA Corporation", "nvidia"],
  ["VOO", "Vanguard S&P 500 ETF", "vanguard"], ["JPM", "JPMorgan Chase & Co.", null], ["AMZN", "Amazon.com, Inc.", "amazon"],
  ["GOOGL", "Alphabet Inc.", "google"], ["META", "Meta Platforms, Inc.", "meta"], ["BRK.B", "Berkshire Hathaway Inc.", null],
  ["—", "UPS Core Municipal Portfolio", null], ["VTI", "Vanguard Total Stock Market ETF", "vanguard"], ["BND", "Vanguard Total Bond Market ETF", "vanguard"],
];
const ALLOCATION_LABELS = [
  ["US equity", "navy"], ["International equity", "blue"], ["Fixed income", "teal"], ["Alternatives", "amber"], ["Cash", "gray"], ["Other", "slate"],
];

function householdName(index) {
  if (index < PRIMARY_SURNAMES.length) return `${PRIMARY_SURNAMES[index]} Household`;
  const left = PRIMARY_SURNAMES[index % PRIMARY_SURNAMES.length];
  const right = SECONDARY_SURNAMES[Math.floor(index / PRIMARY_SURNAMES.length) % SECONDARY_SURNAMES.length];
  return `${left}-${right} Household`;
}

function buildHistory(seed, endingMillions) {
  const points = [];
  const endYear = 2026;
  const endMonth = 7;
  for (let offset = 60; offset >= 0; offset -= 1) {
    const monthIndex = endYear * 12 + endMonth - offset;
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const progress = (60 - offset) / 60;
    const trend = endingMillions * (0.68 + 0.32 * progress);
    const cycle = Math.sin((seed + offset) * 0.29) * endingMillions * 0.018;
    const shock = Math.exp(-Math.pow((progress - 0.45) / 0.09, 2)) * endingMillions * (0.025 + (seed % 5) * 0.004);
    points.push({ time: `${year}-${String(month + 1).padStart(2, "0")}-21`, value: Number((trend + cycle - shock).toFixed(3)) });
  }
  points[points.length - 1].value = Number(endingMillions.toFixed(3));
  return points;
}

function generatedHousehold(index) {
  const seed = index + 11;
  const id = `household-${String(index + 1).padStart(3, "0")}`;
  const name = householdName(index);
  const surname = name.replace(/ Household$/, "");
  let financialAssets = round(2_400_000 + ((seed * 1_783_271) % 28_000_000), 10_000);
  if (seed % 19 === 0) financialAssets = round(financialAssets * 2.15, 10_000);
  const accountCount = 4 + seed % 7;
  const accountWeights = [38, 19, 13, 9, 7, 5, 4, 3, 2, 1].slice(0, accountCount);
  const accountValues = allocationParts(financialAssets, accountWeights);
  const location = LOCATIONS[seed % LOCATIONS.length];
  const riskProfile = RISK_PROFILES[seed % RISK_PROFILES.length];
  const returnPct = Number((4.1 + ((seed * 17) % 93) / 10).toFixed(1));
  const memberOne = FIRST_NAMES[seed % FIRST_NAMES.length];
  const memberTwo = FIRST_NAMES[(seed * 3 + 5) % FIRST_NAMES.length];
  const members = [`${memberOne} ${surname}`, `${memberTwo} ${surname}`];
  const accounts = [];
  const accountAllocations = [];
  const positions = [];

  accountValues.forEach((marketValue, accountIndex) => {
    const template = ACCOUNT_TEMPLATES[(accountIndex + seed) % ACCOUNT_TEMPLATES.length];
    const accountId = `${id}-account-${accountIndex + 1}`;
    const isCash = template[0] === "Cash management";
    const cashRate = isCash ? 0.72 : 0.018 + ((seed + accountIndex * 7) % 11) / 100;
    const cashBalance = Math.min(marketValue, round(marketValue * cashRate, 1000));
    const accountReturn = Number((returnPct + ((accountIndex % 3) - 1) * 0.8).toFixed(1));
    accounts.push({
      id: accountId,
      householdId: id,
      name: accountIndex === 1 && template[0] === "Family trust" ? `${surname} Family Trust` : template[0],
      registration: template[1], currency: "USD", marketValue,
      allocationLabel: isCash ? "Liquidity" : accountIndex % 3 === 0 ? "Growth" : accountIndex % 3 === 1 ? "Balanced" : "Diversified",
      ytdReturnPct: isCash ? 3.8 : accountReturn, purpose: template[4], taxTreatment: template[5], program: template[2], custodyType: template[3], cashBalance,
      unrealizedGain: template[1] === "Taxable" || template[1] === "Trust" ? round(marketValue * (0.08 + (seed % 9) / 100), 1000) : 0,
      lastReconciled: template[3] === "held-away" ? "Aug 20 · Daily feed" : "Aug 21 · 9:42 AM ET",
      sourceSystem: template[3] === "held-away" ? "held-away-aggregation" : "portfolio-accounting",
    });

    const baseMix = isCash ? [8, 2, 8, 0, 80, 2] : [46 + (seed + accountIndex) % 15, 12 + seed % 9, 18 + accountIndex % 8, 8 + seed % 7, 4 + accountIndex % 5, 6];
    const totalMix = baseMix.reduce((sum, item) => sum + item, 0);
    let allocated = 0;
    baseMix.forEach((raw, mixIndex) => {
      let weightPct = mixIndex === baseMix.length - 1 ? 100 - allocated : Math.round(raw / totalMix * 100);
      weightPct = Math.max(0, weightPct);
      allocated += weightPct;
      if (!weightPct) return;
      accountAllocations.push({ id: `${accountId}-allocation-${mixIndex}`, accountId, label: ALLOCATION_LABELS[mixIndex][0], weightPct, tone: ALLOCATION_LABELS[mixIndex][1] });
    });
  });

  const concentration = seed % 4 === 0;
  const firstWeight = concentration ? 18 + seed % 9 : 8 + seed % 7;
  const holdingWeights = [firstWeight, 8 + seed % 4, 5.5 + seed % 3, 4 + (seed % 4) / 2, 3.2 + (seed % 5) / 5];
  const holdingSnapshots = holdingWeights.map((weight, holdingIndex) => {
    const holding = HOLDINGS[(seed + holdingIndex * 2) % HOLDINGS.length];
    return {
      id: `${id}-holding-${holdingIndex + 1}`, householdId: id, asOf: AS_OF, instrumentId: holding[0] === "—" ? `MODEL-${seed}` : holding[0], symbol: holding[0], name: holding[1],
      marketValue: round(financialAssets * weight / 100, 1000), householdWeightPct: Number(weight.toFixed(1)), ytdReturnPct: Number((returnPct + holdingIndex * 1.3 - 1.2).toFixed(1)), brandKey: holding[2],
    };
  });

  const primaryHolding = holdingSnapshots[0];
  if (accounts.length >= 2) {
    const firstValue = Math.min(round(primaryHolding.marketValue * 0.68, 1000), round(accounts[0].marketValue * 0.72, 1000));
    const secondValue = Math.min(primaryHolding.marketValue - firstValue, round(accounts[1].marketValue * 0.72, 1000));
    [firstValue, secondValue].forEach((marketValue, positionIndex) => {
      if (marketValue <= 0) return;
      const account = accounts[positionIndex];
      positions.push({
        id: `${id}-${primaryHolding.instrumentId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${positionIndex + 1}`,
        householdId: id, accountId: account.id, instrumentId: primaryHolding.instrumentId, symbol: primaryHolding.symbol, name: primaryHolding.name, marketValue,
        accountWeightPct: pct(marketValue, account.marketValue), unrealizedGain: round(marketValue * (0.18 + seed % 11 / 100), 1000), brandKey: primaryHolding.brandKey,
      });
    });
  }

  const cash = accounts.reduce((sum, account) => sum + account.cashBalance, 0);
  const cashPct = pct(cash, financialAssets);
  const allocationWeights = [42 + seed % 8, 12 + seed % 5, 19 - seed % 4, 10 + seed % 4, Math.round(cashPct), 7];
  const allocationTotal = allocationWeights.reduce((sum, item) => sum + item, 0);
  let allocationUsed = 0;
  let marketValueUsed = 0;
  const householdAllocationSnapshots = allocationWeights.map((raw, allocationIndex) => {
    const weightPct = allocationIndex === allocationWeights.length - 1 ? 100 - allocationUsed : Math.round(raw / allocationTotal * 100);
    allocationUsed += weightPct;
    const marketValue = allocationIndex === allocationWeights.length - 1 ? financialAssets - marketValueUsed : round(financialAssets * weightPct / 100, 1000);
    marketValueUsed += marketValue;
    return { id: `${id}-allocation-${allocationIndex}`, householdId: id, asOf: AS_OF, label: ALLOCATION_LABELS[allocationIndex][0], weightPct, marketValue, tone: ALLOCATION_LABELS[allocationIndex][1] };
  });

  const goalTemplates = [
    ["Retirement income", "2037", 0.84 + (seed % 12) / 100],
    ["Family gifting", "Annual", 0.70 + (seed % 19) / 100],
    ["Education funding", "2031–2035", 0.79 + (seed % 22) / 100],
    ["Legacy & estate", "Ongoing", 0.76 + (seed % 20) / 100],
    ["Second home", "2028", 0.55 + (seed % 31) / 100],
  ];
  const goalCount = 3 + seed % 3;
  const goals = goalTemplates.slice(0, goalCount).map(([goalName, timing, fundedRatio], goalIndex) => {
    const targetAmount = round((financialAssets * [0.62, 0.035, 0.06, 0.44, 0.13][goalIndex]), 10_000);
    const ratio = clamp(fundedRatio - (goalIndex === goalCount - 1 && seed % 3 === 0 ? 0.12 : 0), 0.42, 1);
    const fundedAmount = round(targetAmount * ratio, 1000);
    const progress = Math.round(fundedAmount / targetAmount * 100);
    const tone = progress >= 74 ? "good" : "watch";
    return {
      id: `${id}-goal-${goalIndex + 1}`, householdId: id, name: goalName, timing, status: progress >= 100 ? "Funded" : tone === "good" ? "On track" : "Review", tone, currency: "USD",
      targetAmount, fundedAmount, confidencePct: clamp(progress + 7, 58, 96), annualFundingAmount: progress >= 100 ? 0 : round(targetAmount * 0.035, 1000),
      nextReview: ["Oct 2026", "Nov 2026", "Jan 2027", "Dec 2026"][goalIndex % 4], owner: goalName.includes("Education") ? "Beneficiaries" : "Joint",
      action: tone === "good" ? "Maintain the current funding and allocation path." : "Review funding source and timing at the next planning meeting.",
    };
  });

  const watchGoals = goals.filter((goal) => goal.tone === "watch");
  const insights = [];
  if (concentration) {
    insights.push({ id: `${id}-concentration`, householdId: id, severity: "Priority", tone: "red", title: `${primaryHolding.symbol} concentration is ${primaryHolding.householdWeightPct.toFixed(1)}%`, detail: `${moneyShort(primaryHolding.marketValue)} across ${positions.length || 1} accounts`, action: "Review" });
  }
  if (cashPct >= 7) insights.push({ id: `${id}-cash`, householdId: id, severity: "Opportunity", tone: "green", title: `${moneyShort(cash)} available for investment`, detail: `${cashPct.toFixed(1)}% cash across the household`, action: "Explore" });
  if (watchGoals.length) insights.push({ id: `${id}-goal-review`, householdId: id, severity: "Planning", tone: "amber", title: `${watchGoals[0].name} needs review`, detail: `${Math.round(watchGoals[0].fundedAmount / watchGoals[0].targetAmount * 100)}% funded · ${watchGoals[0].nextReview}`, action: "Review" });
  if (seed % 7 === 0) {
    const callAmount = round(50_000 + (seed % 7) * 25_000, 5000);
    insights.push({ id: `${id}-capital-call`, householdId: id, severity: "Upcoming", tone: "amber", title: `${moneyShort(callAmount)} private-investment capital call`, detail: "Due within 30 days · funding source identified", action: "Review", details: { eyebrow: "UPCOMING OBLIGATION", summary: "Available household cash covers the upcoming obligation without requiring an investment sale.", rows: [["Funding source", accounts[0].name], ["Cash available", moneyShort(cash)], ["Call amount", moneyShort(callAmount)], ["Status", "Funding source identified"]] } });
  }
  if (seed % 5 === 0) insights.push({ id: `${id}-research-change`, householdId: id, severity: "Research", tone: "slate", title: "Two followed investments changed", detail: "Research and shelf updates since last review", action: "View", details: { eyebrow: "FOLLOWED INVESTMENTS", summary: "Research and shelf activity tied to investments followed in this relationship.", rows: [[holdingSnapshots[1].name, "Research review completed"], [holdingSnapshots[2].name, "Data refreshed"]] } });
  if (!insights.length) insights.push({ id: `${id}-planning-current`, householdId: id, severity: "Current", tone: "blue", title: "Household plan remains on track", detail: "No material exceptions since the last review", action: "View" });

  const nonFinancialAssets = [{ id: `${id}-non-financial`, householdId: id, category: "Non-financial assets", currency: "USD", marketValue: round(450_000 + (seed % 17) * 145_000, 10_000) }];
  const liabilities = [{ id: `${id}-liabilities`, householdId: id, category: "Liabilities", currency: "USD", balance: round((seed % 11) * 70_000, 10_000) }];
  const concentrationPolicies = concentration ? [{
    id: `${id}-concentration-policy`, householdId: id, instrumentId: primaryHolding.instrumentId, isPrimary: true, targetWeightPct: 12, modeledRiskContributionPct: clamp(Math.round(primaryHolding.householdWeightPct * 1.25), 18, 39),
    scenarios: [
      { name: "10% single-stock decline", holdingMove: `−${moneyShort(primaryHolding.marketValue * 0.1)}`, portfolioMove: `−${(primaryHolding.householdWeightPct * 0.1).toFixed(1)}%` },
      { name: "35% company drawdown", holdingMove: `−${moneyShort(primaryHolding.marketValue * 0.35)}`, portfolioMove: `−${(primaryHolding.householdWeightPct * 0.35).toFixed(1)}%` },
      { name: "Reduce to 12% policy target", holdingMove: `Release ${moneyShort(Math.max(0, primaryHolding.marketValue - financialAssets * 0.12))}`, portfolioMove: "Diversified" },
    ],
    research: { status: "Positive · monitored", reviewed: "Aug 18, 2026", summary: "Long-term quality remains intact, while household risk is elevated by a concentrated appreciated position." },
  }] : [];

  return {
    household: {
      id, advisorId: ADVISOR_ID, name, initials: initials(name), relationshipType: "Primary relationship", location, asOf: AS_OF, riskProfile,
      ytdChangeAmount: round(financialAssets * returnPct / 100 * 0.18, 1000), ytdReturnPct: returnPct, netFlowsAmount: round(financialAssets * ((seed % 7) - 2) / 100, 1000),
      members, entitySummary: `${surname} family entities`, serviceModel: seed % 4 === 0 ? "Private Wealth · advisory" : "Wealth Management · advisory", lastPlanningReview: `Jul ${8 + seed % 18}, 2026`,
    },
    accounts, accountAllocations, positions, householdAllocationSnapshots, householdHoldingSnapshots: holdingSnapshots, nonFinancialAssets, liabilities, goals, insights, concentrationPolicies,
    histories: [{ id: `${id}-investable-wealth-history`, householdId: id, metric: "investable-wealth-usd-millions", points: buildHistory(seed, financialAssets / 1_000_000) }],
  };
}

function enrichedMorrisonDataset() {
  const base = MORRISON_WEALTH_DATASET;
  return {
    ...base,
    households: base.households.map((household) => ({ ...household, initials: "MH", members: ["Daniel Morrison", "Evelyn Morrison"], entitySummary: "Morrison Family Trust · two 529 plans", serviceModel: "Private Wealth · advisory", lastPlanningReview: "Jul 9, 2026", netFlowsAmount: 260000 })),
    insights: base.insights.map((insight) => insight.id === "capital-call" ? { ...insight, details: { eyebrow: "UPCOMING OBLIGATION", summary: "Funding is due Sep 8. Available cash fully covers the obligation without selling investments.", rows: [["Funding source", "Joint brokerage cash"], ["Cash available", "$410K"], ["Remaining after funding", "$285K"], ["Status", "Funding source identified"]] } } : insight.id === "changes" ? { ...insight, details: { eyebrow: "FOLLOWED INVESTMENTS", summary: "Research and shelf activity tied to investments already followed in this workspace.", rows: [["UPS Core Municipal Portfolio", "Research review completed · Aug 18"], ["Vanguard S&P 500 ETF", "Data refreshed · Aug 21"], ["Tax-Aware Direct Index SMA", "Shelf terms updated · Aug 19"]] } } : insight),
    concentrationPolicies: base.concentrationPolicies.map((policy) => ({ ...policy, modeledRiskContributionPct: 31 })),
  };
}

const base = enrichedMorrisonDataset();
const generated = Array.from({ length: GENERATED_HOUSEHOLDS }, (_, index) => generatedHousehold(index));

export const ADVISOR_BOOK_DATASET = deepFreeze({
  schemaVersion: 1,
  advisors: base.advisors,
  households: [...base.households, ...generated.map((item) => item.household)],
  accounts: [...base.accounts, ...generated.flatMap((item) => item.accounts)],
  accountAllocations: [...base.accountAllocations, ...generated.flatMap((item) => item.accountAllocations)],
  positions: [...base.positions, ...generated.flatMap((item) => item.positions)],
  householdAllocationSnapshots: [...base.householdAllocationSnapshots, ...generated.flatMap((item) => item.householdAllocationSnapshots)],
  householdHoldingSnapshots: [...base.householdHoldingSnapshots, ...generated.flatMap((item) => item.householdHoldingSnapshots)],
  nonFinancialAssets: [...base.nonFinancialAssets, ...generated.flatMap((item) => item.nonFinancialAssets)],
  liabilities: [...base.liabilities, ...generated.flatMap((item) => item.liabilities)],
  goals: [...base.goals, ...generated.flatMap((item) => item.goals)],
  insights: [...base.insights, ...generated.flatMap((item) => item.insights)],
  concentrationPolicies: [...base.concentrationPolicies, ...generated.flatMap((item) => item.concentrationPolicies)],
  histories: [...base.histories, ...generated.flatMap((item) => item.histories)],
});

export const DEFAULT_ADVISOR_ID = ADVISOR_ID;
