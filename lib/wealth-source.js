function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function buildMorrisonWealthHistory() {
  const start = new Date("2021-08-20T00:00:00Z");
  const end = new Date("2026-08-21T00:00:00Z");
  const points = [];
  let index = 0;
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const progress = (cursor - start) / (end - start);
    const trend = 8.36 + progress * 3.62;
    const cycle = Math.sin(index * 0.19) * 0.19 + Math.sin(index * 0.051 + 1.7) * 0.12;
    const drawdown = Math.exp(-Math.pow((progress - 0.61) / 0.055, 2)) * 0.62;
    points.push({ time: isoDate(cursor), value: Number((trend + cycle - drawdown).toFixed(3)) });
    index += 1;
  }
  if (points.at(-1)?.time === "2026-08-21") points[points.length - 1] = { time: "2026-08-21", value: 11.98 };
  else points.push({ time: "2026-08-21", value: 11.98 });
  return points;
}

const HOUSEHOLD_ID = "household-morrison";
const ADVISOR_ID = "advisor-042";
const AS_OF = "Aug 21, 2026 · 9:42 AM ET";

export const MORRISON_WEALTH_DATASET = deepFreeze({
  schemaVersion: 1,
  advisors: [
    { id: ADVISOR_ID, displayName: "Advisor 042", workspaceLabel: "Demo workspace" },
  ],
  households: [
    {
      id: HOUSEHOLD_ID,
      advisorId: ADVISOR_ID,
      name: "Morrison Household",
      relationshipType: "Primary relationship",
      location: "New York",
      asOf: AS_OF,
      riskProfile: "Moderate growth",
      ytdChangeAmount: 184000,
      ytdReturnPct: 8.7,
    },
  ],
  accounts: [
    {
      id: "joint-brokerage", householdId: HOUSEHOLD_ID, name: "Joint brokerage", registration: "Taxable", currency: "USD",
      marketValue: 6480000, allocationLabel: "71% equity", ytdReturnPct: 9.8, purpose: "Primary taxable portfolio",
      taxTreatment: "Taxable · joint tenants", program: "Advisory", custodyType: "custodied", cashBalance: 410000,
      unrealizedGain: 2320000, lastReconciled: "Aug 21 · 9:42 AM ET", sourceSystem: "portfolio-accounting",
    },
    {
      id: "family-trust", householdId: HOUSEHOLD_ID, name: "Morrison Family Trust", registration: "Trust", currency: "USD",
      marketValue: 2610000, allocationLabel: "Balanced", ytdReturnPct: 7.2, purpose: "Intergenerational wealth",
      taxTreatment: "Taxable trust", program: "Advisory", custodyType: "custodied", cashBalance: 96000,
      unrealizedGain: 681000, lastReconciled: "Aug 21 · 9:42 AM ET", sourceSystem: "portfolio-accounting",
    },
    {
      id: "traditional-ira", householdId: HOUSEHOLD_ID, name: "Traditional IRA", registration: "Retirement", currency: "USD",
      marketValue: 1320000, allocationLabel: "Growth", ytdReturnPct: 8.4, purpose: "Retirement income",
      taxTreatment: "Tax deferred", program: "Advisory", custodyType: "custodied", cashBalance: 52000,
      unrealizedGain: 0, lastReconciled: "Aug 21 · 9:42 AM ET", sourceSystem: "portfolio-accounting",
    },
    {
      id: "employer-401k", householdId: HOUSEHOLD_ID, name: "Employer 401(k)", registration: "Held away", currency: "USD",
      marketValue: 640000, allocationLabel: "Target date", ytdReturnPct: 8.1, purpose: "Retirement income",
      taxTreatment: "Tax deferred", program: "Connected external", custodyType: "held-away", cashBalance: 16000,
      unrealizedGain: 0, lastReconciled: "Aug 20 · Daily feed", sourceSystem: "held-away-aggregation",
    },
    {
      id: "education-accounts", householdId: HOUSEHOLD_ID, name: "Education accounts", registration: "529 · 2 accounts", currency: "USD",
      marketValue: 210000, allocationLabel: "Age based", ytdReturnPct: 5.5, purpose: "Education funding",
      taxTreatment: "Tax advantaged", program: "Advisory", custodyType: "custodied", cashBalance: 7000,
      unrealizedGain: 0, lastReconciled: "Aug 21 · 9:42 AM ET", sourceSystem: "portfolio-accounting",
    },
    {
      id: "external-investments", householdId: HOUSEHOLD_ID, name: "External investments", registration: "Held away", currency: "USD",
      marketValue: 720000, allocationLabel: "Mixed", ytdReturnPct: 6.4, purpose: "Full-balance-sheet visibility",
      taxTreatment: "Mixed registrations", program: "Connected external", custodyType: "held-away", cashBalance: 159000,
      unrealizedGain: 0, lastReconciled: "Aug 20 · Daily feed", sourceSystem: "held-away-aggregation",
    },
  ],
  accountAllocations: [
    { id: "joint-brokerage-us-equity", accountId: "joint-brokerage", label: "US equity", weightPct: 58, tone: "navy" },
    { id: "joint-brokerage-intl-equity", accountId: "joint-brokerage", label: "International equity", weightPct: 13, tone: "blue" },
    { id: "joint-brokerage-fixed-income", accountId: "joint-brokerage", label: "Fixed income", weightPct: 14, tone: "teal" },
    { id: "joint-brokerage-alternatives", accountId: "joint-brokerage", label: "Alternatives", weightPct: 9, tone: "amber" },
    { id: "joint-brokerage-cash", accountId: "joint-brokerage", label: "Cash", weightPct: 6, tone: "gray" },

    { id: "family-trust-us-equity", accountId: "family-trust", label: "US equity", weightPct: 43, tone: "navy" },
    { id: "family-trust-intl-equity", accountId: "family-trust", label: "International equity", weightPct: 16, tone: "blue" },
    { id: "family-trust-fixed-income", accountId: "family-trust", label: "Fixed income", weightPct: 25, tone: "teal" },
    { id: "family-trust-alternatives", accountId: "family-trust", label: "Alternatives", weightPct: 12, tone: "amber" },
    { id: "family-trust-cash", accountId: "family-trust", label: "Cash", weightPct: 4, tone: "gray" },

    { id: "traditional-ira-us-equity", accountId: "traditional-ira", label: "US equity", weightPct: 61, tone: "navy" },
    { id: "traditional-ira-intl-equity", accountId: "traditional-ira", label: "International equity", weightPct: 20, tone: "blue" },
    { id: "traditional-ira-fixed-income", accountId: "traditional-ira", label: "Fixed income", weightPct: 14, tone: "teal" },
    { id: "traditional-ira-cash", accountId: "traditional-ira", label: "Cash", weightPct: 5, tone: "gray" },

    { id: "employer-401k-us-equity", accountId: "employer-401k", label: "US equity", weightPct: 54, tone: "navy" },
    { id: "employer-401k-intl-equity", accountId: "employer-401k", label: "International equity", weightPct: 23, tone: "blue" },
    { id: "employer-401k-fixed-income", accountId: "employer-401k", label: "Fixed income", weightPct: 20, tone: "teal" },
    { id: "employer-401k-cash", accountId: "employer-401k", label: "Cash", weightPct: 3, tone: "gray" },

    { id: "education-accounts-us-equity", accountId: "education-accounts", label: "US equity", weightPct: 42, tone: "navy" },
    { id: "education-accounts-intl-equity", accountId: "education-accounts", label: "International equity", weightPct: 18, tone: "blue" },
    { id: "education-accounts-fixed-income", accountId: "education-accounts", label: "Fixed income", weightPct: 35, tone: "teal" },
    { id: "education-accounts-cash", accountId: "education-accounts", label: "Cash", weightPct: 5, tone: "gray" },

    { id: "external-investments-us-equity", accountId: "external-investments", label: "US equity", weightPct: 38, tone: "navy" },
    { id: "external-investments-intl-equity", accountId: "external-investments", label: "International equity", weightPct: 9, tone: "blue" },
    { id: "external-investments-fixed-income", accountId: "external-investments", label: "Fixed income", weightPct: 19, tone: "teal" },
    { id: "external-investments-alternatives", accountId: "external-investments", label: "Alternatives", weightPct: 12, tone: "amber" },
    { id: "external-investments-cash", accountId: "external-investments", label: "Cash", weightPct: 22, tone: "gray" },
  ],
  positions: [
    { id: "joint-brokerage-aapl", householdId: HOUSEHOLD_ID, accountId: "joint-brokerage", instrumentId: "AAPL", symbol: "AAPL", name: "Apple Inc.", marketValue: 2180000, accountWeightPct: 33.6, unrealizedGain: 1510000, brandKey: "apple" },
    { id: "joint-brokerage-voo", householdId: HOUSEHOLD_ID, accountId: "joint-brokerage", instrumentId: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", marketValue: 871000, accountWeightPct: 13.4, unrealizedGain: 0, brandKey: "vanguard" },
    { id: "joint-brokerage-msft", householdId: HOUSEHOLD_ID, accountId: "joint-brokerage", instrumentId: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", marketValue: 454000, accountWeightPct: 7, unrealizedGain: 0, brandKey: "microsoft" },

    { id: "family-trust-aapl", householdId: HOUSEHOLD_ID, accountId: "family-trust", instrumentId: "AAPL", symbol: "AAPL", name: "Apple Inc.", marketValue: 623000, accountWeightPct: 23.9, unrealizedGain: 400000, brandKey: "apple" },
    { id: "family-trust-voo", householdId: HOUSEHOLD_ID, accountId: "family-trust", instrumentId: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", marketValue: 267000, accountWeightPct: 10.2, unrealizedGain: 0, brandKey: "vanguard" },
    { id: "family-trust-muni", householdId: HOUSEHOLD_ID, accountId: "family-trust", instrumentId: "UPS-MUNI-CORE", symbol: "—", name: "UPS Core Municipal Portfolio", marketValue: 251000, accountWeightPct: 9.6, unrealizedGain: 0, brandKey: null },

    { id: "traditional-ira-voo", householdId: HOUSEHOLD_ID, accountId: "traditional-ira", instrumentId: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", marketValue: 391000, accountWeightPct: 29.6, unrealizedGain: 0, brandKey: "vanguard" },
    { id: "traditional-ira-nvda", householdId: HOUSEHOLD_ID, accountId: "traditional-ira", instrumentId: "NVDA", symbol: "NVDA", name: "NVIDIA Corporation", marketValue: 184000, accountWeightPct: 13.9, unrealizedGain: 0, brandKey: "nvidia" },
    { id: "traditional-ira-msft", householdId: HOUSEHOLD_ID, accountId: "traditional-ira", instrumentId: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", marketValue: 151000, accountWeightPct: 11.4, unrealizedGain: 0, brandKey: "microsoft" },
  ],
  householdAllocationSnapshots: [
    { id: "morrison-us-equity", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "US equity", weightPct: 44, marketValue: 5271000, tone: "navy" },
    { id: "morrison-intl-equity", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "International equity", weightPct: 14, marketValue: 1677000, tone: "blue" },
    { id: "morrison-fixed-income", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "Fixed income", weightPct: 18, marketValue: 2156000, tone: "teal" },
    { id: "morrison-alternatives", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "Alternatives", weightPct: 12, marketValue: 1438000, tone: "amber" },
    { id: "morrison-cash", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "Cash", weightPct: 6, marketValue: 740000, tone: "gray" },
    { id: "morrison-other", householdId: HOUSEHOLD_ID, asOf: AS_OF, label: "Other", weightPct: 6, marketValue: 698000, tone: "slate" },
  ],
  householdHoldingSnapshots: [
    { id: "morrison-aapl", householdId: HOUSEHOLD_ID, asOf: AS_OF, instrumentId: "AAPL", symbol: "AAPL", name: "Apple Inc.", marketValue: 2803000, householdWeightPct: 23.4, ytdReturnPct: 12.8, brandKey: "apple" },
    { id: "morrison-voo", householdId: HOUSEHOLD_ID, asOf: AS_OF, instrumentId: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", marketValue: 1138000, householdWeightPct: 9.5, ytdReturnPct: 10.6, brandKey: "vanguard" },
    { id: "morrison-msft", householdId: HOUSEHOLD_ID, asOf: AS_OF, instrumentId: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", marketValue: 695000, householdWeightPct: 5.8, ytdReturnPct: 14.2, brandKey: "microsoft" },
    { id: "morrison-nvda", householdId: HOUSEHOLD_ID, asOf: AS_OF, instrumentId: "NVDA", symbol: "NVDA", name: "NVIDIA Corporation", marketValue: 587000, householdWeightPct: 4.9, ytdReturnPct: 19.7, brandKey: "nvidia" },
    { id: "morrison-muni", householdId: HOUSEHOLD_ID, asOf: AS_OF, instrumentId: "UPS-MUNI-CORE", symbol: "—", name: "UPS Core Municipal Portfolio", marketValue: 563000, householdWeightPct: 4.7, ytdReturnPct: 3.1, brandKey: null },
  ],
  nonFinancialAssets: [
    { id: "morrison-non-financial-assets", householdId: HOUSEHOLD_ID, category: "Non-financial assets", currency: "USD", marketValue: 1080000 },
  ],
  liabilities: [
    { id: "morrison-liabilities", householdId: HOUSEHOLD_ID, category: "Liabilities", currency: "USD", balance: 640000 },
  ],
  goals: [
    { id: "retirement-income", householdId: HOUSEHOLD_ID, name: "Retirement income", timing: "2038", status: "On track", tone: "good", currency: "USD", targetAmount: 8500000, fundedAmount: 7480000, confidencePct: 87, annualFundingAmount: 180000, nextReview: "Dec 2026", owner: "Joint", action: "Maintain current savings and allocation path." },
    { id: "family-gifting", householdId: HOUSEHOLD_ID, name: "Family gifting", timing: "Annual", status: "On track", tone: "good", currency: "USD", targetAmount: 250000, fundedAmount: 190000, confidencePct: 91, annualFundingAmount: 60000, nextReview: "Nov 2026", owner: "Joint", action: "Complete the remaining annual exclusion gifts." },
    { id: "education-funding", householdId: HOUSEHOLD_ID, name: "Education funding", timing: "2032–2035", status: "Funded", tone: "good", currency: "USD", targetAmount: 420000, fundedAmount: 420000, confidencePct: 96, annualFundingAmount: 0, nextReview: "Jan 2027", owner: "Two beneficiaries", action: "Review age-based allocation at the annual planning meeting." },
    { id: "legacy-estate", householdId: HOUSEHOLD_ID, name: "Legacy & estate", timing: "Ongoing", status: "On track", tone: "good", currency: "USD", targetAmount: 5000000, fundedAmount: 4100000, confidencePct: 90, annualFundingAmount: 0, nextReview: "Oct 2026", owner: "Family trust", action: "Confirm beneficiary and trustee details remain current." },
    { id: "second-home", householdId: HOUSEHOLD_ID, name: "Second home", timing: "2027", status: "Review", tone: "watch", currency: "USD", targetAmount: 1250000, fundedAmount: 762500, confidencePct: 68, annualFundingAmount: 240000, nextReview: "Sep 2026", owner: "Joint", action: "Decide whether to fund the remaining $488K from cash or taxable assets." },
  ],
  insights: [
    { id: "concentration", kind: "concentration", householdId: HOUSEHOLD_ID, severity: "Priority", tone: "red", title: "Apple concentration increased to 23.4%", detail: "$2.80M across two taxable accounts", actionLabel: "Review", actionMetadata: { type: "concentration" } },
    { id: "cash", kind: "liquidity", householdId: HOUSEHOLD_ID, severity: "Opportunity", tone: "green", title: "$740K available for investment", detail: "6.2% cash versus a 4% policy target", actionLabel: "Explore", actionMetadata: { type: "investment-search", searchIntent: { source: "FROM LIQUIDITY REVIEW", title: "Explore cash alternatives", tags: ["$740K available", "Moderate growth", "Daily liquidity"], category: "Fixed Income", query: "short duration cash management", flags: [], risks: ["Conservative"] } } },
    { id: "muni", kind: "allocation", householdId: HOUSEHOLD_ID, severity: "Allocation", tone: "blue", title: "Municipal bonds below policy range", detail: "6.1% current versus 10% target", actionLabel: "Explore", actionMetadata: { type: "investment-search", searchIntent: { source: "FROM ALLOCATION REVIEW", title: "Restore municipal allocation", tags: ["New York", "Tax aware", "Fee under 0.50%"], category: "Fixed Income", query: "New York municipal income under 50 bps", flags: ["Tax-Aware"], risks: ["Conservative"] } } },
    { id: "capital-call", kind: "obligation", householdId: HOUSEHOLD_ID, severity: "Upcoming", tone: "amber", title: "$125K private-credit capital call", detail: "Due Sep 8 · funding source identified", actionLabel: "Review", actionMetadata: { type: "detail" } },
    { id: "changes", kind: "research", householdId: HOUSEHOLD_ID, severity: "Research", tone: "slate", title: "Three followed investments changed", detail: "Two research reviews · one shelf update", actionLabel: "View", actionMetadata: { type: "detail" } },
  ],
  concentrationPolicies: [
    {
      id: "morrison-aapl-policy", householdId: HOUSEHOLD_ID, instrumentId: "AAPL", isPrimary: true, targetWeightPct: 12,
      scenarios: [
        { name: "10% single-stock decline", holdingMove: "−$280K", portfolioMove: "−2.3%" },
        { name: "35% company drawdown", holdingMove: "−$981K", portfolioMove: "−8.2%" },
        { name: "Reduce to 12% policy target", holdingMove: "Release $1.37M", portfolioMove: "Diversified" },
      ],
      research: {
        status: "Positive · monitored",
        reviewed: "Aug 18, 2026",
        summary: "Long-term quality remains intact, but household risk is dominated by one highly appreciated taxable position.",
      },
      searchIntent: { source: "FROM CONCENTRATION REVIEW", title: "Explore diversification options", tags: ["Morrison Household", "Tax-aware implementation", "Reduce concentrated exposure"], category: "SMAs", query: "", flags: ["Tax-Aware", "Direct Indexing"], risks: ["Moderate"] },
    },
  ],
  histories: [
    { id: "morrison-investable-wealth-history", householdId: HOUSEHOLD_ID, metric: "investable-wealth-usd-millions", points: buildMorrisonWealthHistory() },
  ],
});
