export const HOUSEHOLD = Object.freeze({
  id: "household-morrison",
  name: "Morrison Household",
  advisor: "Advisor 042",
  asOf: "Aug 21, 2026 · 9:42 AM ET",
  netWorth: 12420000,
  financialAssets: 11980000,
  nonFinancialAssets: 1080000,
  liabilities: 640000,
  investableCash: 740000,
  ytdChange: 184000,
  ytdReturn: 8.7,
  riskProfile: "Moderate growth",
  goalsOnTrack: 4,
  goalsTotal: 5,
});

export const WEALTH_ALLOCATION = Object.freeze([
  { label: "US equity", value: 44, amount: 5271000, tone: "navy" },
  { label: "International equity", value: 14, amount: 1677000, tone: "blue" },
  { label: "Fixed income", value: 18, amount: 2156000, tone: "teal" },
  { label: "Alternatives", value: 12, amount: 1438000, tone: "amber" },
  { label: "Cash", value: 6, amount: 740000, tone: "gray" },
  { label: "Other", value: 6, amount: 698000, tone: "slate" },
]);

export const HOUSEHOLD_ACCOUNTS = Object.freeze([
  { name: "Joint brokerage", registration: "Taxable", value: 6480000, allocation: "71% equity", change: 9.8 },
  { name: "Morrison Family Trust", registration: "Trust", value: 2610000, allocation: "Balanced", change: 7.2 },
  { name: "Traditional IRA", registration: "Retirement", value: 1320000, allocation: "Growth", change: 8.4 },
  { name: "Employer 401(k)", registration: "Held away", value: 640000, allocation: "Target date", change: 8.1 },
  { name: "Education accounts", registration: "529 · 2 accounts", value: 210000, allocation: "Age based", change: 5.5 },
  { name: "External investments", registration: "Held away", value: 720000, allocation: "Mixed", change: 6.4 },
]);

export const HOUSEHOLD_HOLDINGS = Object.freeze([
  { symbol: "AAPL", name: "Apple Inc.", value: 2803000, weight: 23.4, change: 12.8, brandKey: "apple" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", value: 1138000, weight: 9.5, change: 10.6, brandKey: "vanguard" },
  { symbol: "MSFT", name: "Microsoft Corporation", value: 695000, weight: 5.8, change: 14.2, brandKey: "microsoft" },
  { symbol: "NVDA", name: "NVIDIA Corporation", value: 587000, weight: 4.9, change: 19.7, brandKey: "nvidia" },
  { symbol: "—", name: "UPS Core Municipal Portfolio", value: 563000, weight: 4.7, change: 3.1, brandKey: null },
]);

export const HOUSEHOLD_GOALS = Object.freeze([
  { name: "Retirement income", timing: "2038", status: "On track", progress: 88, tone: "good" },
  { name: "Family gifting", timing: "Annual", status: "On track", progress: 76, tone: "good" },
  { name: "Education funding", timing: "2032–2035", status: "Funded", progress: 100, tone: "good" },
  { name: "Second home", timing: "2027", status: "Review", progress: 61, tone: "watch" },
]);

export const HOUSEHOLD_INSIGHTS = Object.freeze([
  {
    id: "concentration",
    severity: "Priority",
    tone: "red",
    title: "Apple concentration increased to 23.4%",
    detail: "$2.80M across two taxable accounts",
    action: "Review",
  },
  {
    id: "cash",
    severity: "Opportunity",
    tone: "green",
    title: "$740K available for investment",
    detail: "6.2% cash versus a 4% policy target",
    action: "Explore",
  },
  {
    id: "muni",
    severity: "Allocation",
    tone: "blue",
    title: "Municipal bonds below policy range",
    detail: "6.1% current versus 10% target",
    action: "Explore",
  },
  {
    id: "capital-call",
    severity: "Upcoming",
    tone: "amber",
    title: "$125K private-credit capital call",
    detail: "Due Sep 8 · funding source identified",
    action: "Review",
  },
  {
    id: "changes",
    severity: "Research",
    tone: "slate",
    title: "Three followed investments changed",
    detail: "Two research reviews · one shelf update",
    action: "View",
  },
]);

export const CONCENTRATION_REVIEW = Object.freeze({
  holding: HOUSEHOLD_HOLDINGS[0],
  targetWeight: 12,
  unrealizedGain: 1910000,
  costBasis: 893000,
  accounts: [
    { name: "Joint brokerage", value: 2180000, weight: 33.6, gain: 1510000 },
    { name: "Morrison Family Trust", value: 623000, weight: 23.9, gain: 400000 },
  ],
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
});

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function wealthHistory() {
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

export const WEALTH_HISTORY = Object.freeze(wealthHistory());
