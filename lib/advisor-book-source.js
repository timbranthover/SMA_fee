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
  const weightTotal = weights.reduce((sum, item) => sum + item, 0);
  let used = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - used;
    const value = round(total * weight / weightTotal, 1000);
    used += value;
    return value;
  });
}

function initials(name) {
  return name.split(/[\s-]+/).filter((part) => !["Household", "Family"].includes(part)).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function mixedIndex(seed, salt, length) {
  const mixed = Math.imul((seed + 17) ^ Math.imul(salt + 31, 0x45d9f3b), 0x27d4eb2d) >>> 0;
  return mixed % length;
}

function pick(items, seed, salt = 0) {
  return items[mixedIndex(seed, salt, items.length)];
}

function selectDistinct(items, seed, count, salt = 0, excludedKeys = new Set(), keyOf = (item) => item) {
  const result = [];
  const seen = new Set(excludedKeys);
  const start = mixedIndex(seed, salt, items.length);
  for (let offset = 0; offset < items.length && result.length < count; offset += 1) {
    const item = items[(start + offset) % items.length];
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

const SURNAMES = [
  "Chen", "Alvarez", "Thompson", "Patel", "Brooks", "Kim", "Rossi", "Nguyen", "Cohen", "Martinez", "O'Neill", "Shah", "Rivera", "Sullivan", "Singh", "Garcia",
  "Nakamura", "Williams", "Johnson", "Lee", "Anderson", "Brown", "Wilson", "Moore", "Taylor", "Jackson", "White", "Harris", "Martin", "Clark", "Lewis", "Walker",
  "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Perez",
  "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell",
  "Murphy", "Bailey", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "Watson", "Bennett", "Wood", "Barnes", "Ross",
  "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Russell",
  "Griffin", "Diaz", "Hayes", "Myers", "Ford", "Hamilton", "Graham", "Wallace", "West", "Jordan", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison", "Gibson",
  "McDonald", "Cruz", "Marshall", "Ortiz", "Gomez", "Murray", "Freeman", "Wells", "Webb", "Simpson", "Stevens", "Tucker", "Porter", "Hunter", "Hicks", "Crawford",
  "Henry", "Boyd", "Mason", "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reyes", "Burns", "Gordon", "Robertson", "Schmidt", "Weber", "Fischer", "Meyer",
  "Hoffmann", "Dubois", "Laurent", "Moreau", "Bernard", "Lefevre", "Romano", "Conti", "Greco", "Costa", "Silva", "Pereira", "Santos", "Oliveira", "Kowalski", "Nowak",
  "Zielinski", "Papadopoulos", "Demetriou", "Haddad", "Mansour", "Farah", "Rahman", "Khan", "Iqbal", "Desai", "Mehta", "Rao", "Iyer", "Nair", "Kapoor", "Malhotra",
  "Choi", "Park", "Kwon", "Tanaka", "Sato", "Suzuki", "Yamamoto", "Li", "Zhang", "Wang", "Liu", "Huang", "Lin",
];

const FIRST_NAMES = [
  "James", "Sophia", "Daniel", "Maya", "Michael", "Olivia", "David", "Emma", "Alexander", "Isabella", "Jonathan", "Ava", "Christopher", "Grace", "Andrew", "Natalie",
  "Marcus", "Elena", "Julian", "Priya", "Thomas", "Camille", "Samuel", "Nora", "Benjamin", "Zoe", "Henry", "Leila", "Peter", "Amelia", "Nicholas", "Claire",
  "Ethan", "Sofia", "Lucas", "Vivian", "Adrian", "Naomi", "Gabriel", "Lena", "Maxwell", "Julia", "Isaac", "Caroline", "Victor", "Hannah", "Owen", "Margot",
  "Anthony", "Rachel", "George", "Meera", "Ryan", "Catherine", "Charles", "Diana", "Eric", "Alicia", "Robert", "Monica", "William", "Anika", "Noah", "Sara",
  "Leo", "Jasmine", "Arthur", "Rebecca", "Miles", "Tara", "Ian", "Joanna", "Adam", "Lila", "Edward", "Mina", "Jack", "Annelise", "Simon", "Rina",
];

const LOCATIONS = [
  "New York", "Greenwich", "Boston", "Chicago", "Miami", "San Francisco", "Los Angeles", "Austin", "Seattle", "Palm Beach", "Denver", "Washington, DC",
  "Scarsdale", "Rye", "Westport", "Short Hills", "Princeton", "Philadelphia", "Bethesda", "Charlotte", "Atlanta", "Nashville", "Dallas", "Houston",
  "Boca Raton", "Naples", "San Diego", "Scottsdale", "Park City", "Aspen", "Portland", "Minneapolis",
];

const RISK_PROFILES = ["Capital preservation", "Conservative", "Moderate", "Moderate growth", "Balanced growth", "Growth"];
const RELATIONSHIP_TYPES = [
  "Primary relationship", "Family relationship", "Multigenerational relationship", "Executive relationship",
  "Founder relationship", "Retired executive relationship", "Entrepreneur relationship", "Professional practice relationship",
];
const SERVICE_MODELS = ["Wealth Management · advisory", "Private Wealth · advisory", "Advisory + brokerage", "Private Wealth · integrated advisory"];

const ACCOUNT_TEMPLATES = [
  { key: "joint-brokerage", name: "Joint brokerage", registration: "Taxable", program: "Advisory", custodyType: "custodied", purpose: "Primary taxable portfolio", taxTreatment: "Taxable · joint tenants", profile: "growth" },
  { key: "individual-brokerage", name: "Individual brokerage", registration: "Taxable", program: "Advisory", custodyType: "custodied", purpose: "Flexible long-term investing", taxTreatment: "Taxable · individual", profile: "growth" },
  { key: "revocable-trust", name: "Revocable trust", registration: "Trust", program: "Advisory", custodyType: "custodied", purpose: "Estate and family wealth", taxTreatment: "Taxable trust", profile: "balanced" },
  { key: "family-trust", name: "Family trust", registration: "Trust", program: "Advisory", custodyType: "custodied", purpose: "Intergenerational wealth", taxTreatment: "Taxable trust", profile: "balanced" },
  { key: "traditional-ira", name: "Traditional IRA", registration: "Retirement", program: "Advisory", custodyType: "custodied", purpose: "Retirement income", taxTreatment: "Tax deferred", profile: "retirement" },
  { key: "roth-ira", name: "Roth IRA", registration: "Retirement", program: "Advisory", custodyType: "custodied", purpose: "Long-term tax-free growth", taxTreatment: "Tax free", profile: "growth" },
  { key: "inherited-ira", name: "Inherited IRA", registration: "Retirement", program: "Advisory", custodyType: "custodied", purpose: "Inherited retirement assets", taxTreatment: "Tax deferred · inherited", profile: "balanced" },
  { key: "sep-ira", name: "SEP IRA", registration: "Retirement", program: "Advisory", custodyType: "custodied", purpose: "Owner retirement savings", taxTreatment: "Tax deferred", profile: "growth" },
  { key: "401k", name: "Employer 401(k)", registration: "Held away", program: "Connected external", custodyType: "held-away", purpose: "Retirement income", taxTreatment: "Tax deferred", profile: "retirement" },
  { key: "403b", name: "Employer 403(b)", registration: "Held away", program: "Connected external", custodyType: "held-away", purpose: "Retirement income", taxTreatment: "Tax deferred", profile: "retirement" },
  { key: "executive-stock", name: "Executive stock plan", registration: "Held away", program: "Connected external", custodyType: "held-away", purpose: "Employer equity exposure", taxTreatment: "Mixed employer equity", profile: "growth" },
  { key: "cash-management", name: "Cash management", registration: "Taxable", program: "Advisory", custodyType: "custodied", purpose: "Liquidity reserve", taxTreatment: "Taxable", profile: "cash", liquidity: true },
  { key: "private-bank-cash", name: "Private bank cash account", registration: "Taxable", program: "Banking", custodyType: "custodied", purpose: "Near-term spending and reserves", taxTreatment: "Taxable", profile: "cash", liquidity: true },
  { key: "education-529", name: "Education 529", registration: "529", program: "Advisory", custodyType: "custodied", purpose: "Education funding", taxTreatment: "Tax advantaged", profile: "balanced" },
  { key: "utma", name: "Custodial account", registration: "UTMA", program: "Advisory", custodyType: "custodied", purpose: "Minor beneficiary assets", taxTreatment: "Taxable custodial", profile: "growth" },
  { key: "private-investments", name: "Private investments", registration: "Alternative", program: "Advisory", custodyType: "custodied", purpose: "Long-term alternatives", taxTreatment: "Mixed", profile: "alternatives" },
  { key: "external-alternatives", name: "External alternatives", registration: "Held away", program: "Connected external", custodyType: "held-away", purpose: "Private-market exposure", taxTreatment: "Mixed", profile: "alternatives" },
  { key: "donor-advised", name: "Donor-advised fund", registration: "Charitable", program: "Advisory", custodyType: "custodied", purpose: "Charitable giving", taxTreatment: "Tax advantaged", profile: "balanced" },
  { key: "foundation", name: "Family foundation", registration: "Charitable", program: "Advisory", custodyType: "custodied", purpose: "Structured philanthropy", taxTreatment: "Tax advantaged", profile: "balanced" },
  { key: "partnership", name: "Family partnership account", registration: "Partnership", program: "Advisory", custodyType: "custodied", purpose: "Family investment entity", taxTreatment: "Pass-through entity", profile: "balanced" },
];

const PRIMARY_ACCOUNT_KEYS = new Set(["joint-brokerage", "individual-brokerage", "revocable-trust", "family-trust"]);

const SINGLE_STOCKS = [
  ["AAPL", "Apple Inc.", "apple"], ["MSFT", "Microsoft Corporation", "microsoft"], ["NVDA", "NVIDIA Corporation", "nvidia"], ["JPM", "JPMorgan Chase & Co.", null],
  ["AMZN", "Amazon.com, Inc.", null], ["GOOGL", "Alphabet Inc.", null], ["META", "Meta Platforms, Inc.", null], ["BRK.B", "Berkshire Hathaway Inc.", null],
  ["AVGO", "Broadcom Inc.", null], ["COST", "Costco Wholesale Corporation", null], ["LLY", "Eli Lilly and Company", null], ["XOM", "Exxon Mobil Corporation", null],
  ["WMT", "Walmart Inc.", null], ["CRM", "Salesforce, Inc.", null], ["GS", "Goldman Sachs Group, Inc.", null], ["HD", "Home Depot, Inc.", null],
  ["PEP", "PepsiCo, Inc.", null], ["ORCL", "Oracle Corporation", null], ["UNH", "UnitedHealth Group Incorporated", null], ["CAT", "Caterpillar Inc.", null],
  ["GE", "GE Aerospace", null], ["IBM", "International Business Machines Corporation", null], ["ABBV", "AbbVie Inc.", null], ["KO", "Coca-Cola Company", null],
  ["MCD", "McDonald's Corporation", null], ["NEE", "NextEra Energy, Inc.", "nextera"], ["LIN", "Linde plc", null], ["CVX", "Chevron Corporation", null],
  ["BAC", "Bank of America Corporation", null], ["DIS", "Walt Disney Company", null], ["V", "Visa Inc.", null], ["MA", "Mastercard Incorporated", null],
];

const DIVERSIFIERS = [
  ["VOO", "Vanguard S&P 500 ETF", "vanguard"], ["VTI", "Vanguard Total Stock Market ETF", "vanguard"], ["IVV", "iShares Core S&P 500 ETF", null],
  ["QQQ", "Invesco QQQ Trust", null], ["SCHD", "Schwab US Dividend Equity ETF", "schwab"], ["VXUS", "Vanguard Total International Stock ETF", "vanguard"],
  ["BND", "Vanguard Total Bond Market ETF", "vanguard"], ["AGG", "iShares Core US Aggregate Bond ETF", null], ["MUB", "iShares National Muni Bond ETF", null],
  ["IWM", "iShares Russell 2000 ETF", null], ["QUAL", "iShares MSCI USA Quality Factor ETF", null], ["USMV", "iShares MSCI USA Min Vol Factor ETF", null],
  ["—", "UPS Core Municipal Portfolio", null], ["—", "US Treasury ladder", null], ["—", "Tax-Managed US Large Cap SMA", null],
  ["—", "Global Equity Core SMA", null], ["—", "Intermediate Municipal Bond SMA", "nuveen"], ["—", "Private Credit Portfolio", "blackstone"],
];

const HOLDINGS = [...SINGLE_STOCKS, ...DIVERSIFIERS];

const ALLOCATION_LABELS = [
  ["US equity", "navy"], ["International equity", "blue"], ["Fixed income", "teal"], ["Alternatives", "amber"], ["Cash", "gray"], ["Other", "slate"],
];

const RISK_MIXES = {
  "Capital preservation": [18, 8, 52, 7, 15],
  Conservative: [27, 10, 42, 8, 13],
  Moderate: [38, 13, 29, 10, 10],
  "Moderate growth": [48, 14, 20, 10, 8],
  "Balanced growth": [45, 14, 23, 10, 8],
  Growth: [58, 17, 11, 9, 5],
};

const GOAL_TEMPLATES = [
  { key: "retirement", name: "Retirement income", timings: ["2034", "2037", "2040", "2043"], targetPct: [0.45, 0.72], owner: "Joint" },
  { key: "legacy", name: "Legacy & estate", timings: ["Ongoing", "2035+", "Long term"], targetPct: [0.28, 0.55], owner: "Family" },
  { key: "gifting", name: "Family gifting", timings: ["Annual", "2027–2030", "Ongoing"], targetPct: [0.02, 0.06], owner: "Joint" },
  { key: "education", name: "Education funding", timings: ["2029–2033", "2031–2035", "2034–2038"], targetPct: [0.035, 0.09], owner: "Beneficiaries" },
  { key: "second-home", name: "Second home", timings: ["2027", "2028", "2029", "2030"], targetPct: [0.08, 0.18], owner: "Joint" },
  { key: "philanthropy", name: "Philanthropic giving", timings: ["Annual", "Ongoing", "2026–2030"], targetPct: [0.015, 0.05], owner: "Family" },
  { key: "business-transition", name: "Business transition", timings: ["2028", "2030", "2032"], targetPct: [0.12, 0.28], owner: "Joint" },
  { key: "healthcare", name: "Healthcare reserve", timings: ["Long term", "2035+", "Ongoing"], targetPct: [0.04, 0.1], owner: "Joint" },
  { key: "family-support", name: "Family support", timings: ["Annual", "2027–2031", "Ongoing"], targetPct: [0.025, 0.07], owner: "Family" },
  { key: "renovation", name: "Home renovation", timings: ["2027", "2028", "2029"], targetPct: [0.035, 0.08], owner: "Joint" },
  { key: "grandchildren", name: "Grandchildren education", timings: ["2033–2040", "2035–2042"], targetPct: [0.025, 0.07], owner: "Beneficiaries" },
  { key: "liquidity", name: "Strategic liquidity reserve", timings: ["Ongoing", "12–24 months"], targetPct: [0.04, 0.12], owner: "Joint" },
  { key: "vacation-home", name: "Vacation property", timings: ["2028", "2029", "2031"], targetPct: [0.08, 0.17], owner: "Joint" },
  { key: "foundation", name: "Family foundation funding", timings: ["2027–2032", "Ongoing"], targetPct: [0.035, 0.1], owner: "Family" },
];

const NON_FINANCIAL_TEMPLATES = [
  ["Primary residence", 0.11, 0.28], ["Vacation property", 0.05, 0.16], ["Business interest", 0.08, 0.34], ["Real estate partnership", 0.04, 0.12], ["Art & collectibles", 0.015, 0.055],
];

const LIABILITY_TEMPLATES = [
  ["Primary mortgage", 0.025, 0.10], ["Securities-backed line", 0.01, 0.055], ["Vacation-home mortgage", 0.015, 0.07], ["Business loan", 0.015, 0.08], ["Home equity line", 0.005, 0.035],
];

const OBLIGATION_TEMPLATES = [
  { key: "capital-call", label: "private-fund capital call", timing: "Due within 30 days", min: 75_000, step: 25_000, maxSteps: 9 },
  { key: "estimated-tax", label: "estimated tax payment", timing: "Due next month", min: 60_000, step: 20_000, maxSteps: 8 },
  { key: "property-closing", label: "property closing funding", timing: "Closing within 45 days", min: 150_000, step: 50_000, maxSteps: 9 },
  { key: "tuition", label: "education payment", timing: "Due this semester", min: 40_000, step: 15_000, maxSteps: 7 },
  { key: "charitable-pledge", label: "charitable pledge", timing: "Scheduled this quarter", min: 50_000, step: 25_000, maxSteps: 7 },
  { key: "insurance-premium", label: "insurance premium", timing: "Annual premium due soon", min: 35_000, step: 15_000, maxSteps: 7 },
  { key: "trust-distribution", label: "trust distribution", timing: "Distribution scheduled this quarter", min: 80_000, step: 30_000, maxSteps: 8 },
  { key: "renovation", label: "renovation payment", timing: "Contractor payment due within 30 days", min: 65_000, step: 25_000, maxSteps: 8 },
  { key: "business-commitment", label: "business investment commitment", timing: "Funding requested this quarter", min: 100_000, step: 40_000, maxSteps: 8 },
  { key: "family-gift", label: "family gifting transfer", timing: "Planned before year-end", min: 50_000, step: 25_000, maxSteps: 8 },
];

function familyLabel(name) {
  return name.replace(/ (?:Household|Family)$/, "");
}

function householdName(index) {
  const primary = SURNAMES[index];
  if (index % 10 === 7) {
    const secondary = SURNAMES[(index + 47) % SURNAMES.length];
    return `${primary}-${secondary} Household`;
  }
  if (index % 13 === 4) return `${primary} Family`;
  return `${primary} Household`;
}

function accountName(template, family, seed, accountIndex) {
  if (template.key === "revocable-trust") return `${family} Revocable Trust`;
  if (template.key === "family-trust") return `${family} Family Trust`;
  if (template.key === "education-529") return accountIndex % 2 ? "Education 529 · beneficiary 2" : "Education 529 · beneficiary 1";
  if (template.key === "utma") return `Custodial account · ${pick(["child 1", "child 2", "grandchild"], seed, accountIndex + 40)}`;
  if (template.key === "partnership") return `${family} Family Partnership`;
  if (template.key === "foundation") return `${family} Family Foundation`;
  return template.name;
}

function accountMix(profile, seed, accountIndex) {
  const perturb = (salt, spread = 5) => mixedIndex(seed + accountIndex, salt, spread * 2 + 1) - spread;
  const raw = profile === "cash"
    ? [4, 1, 9, 0, 84, 2]
    : profile === "retirement"
      ? [43 + perturb(1, 5), 17 + perturb(2, 3), 25 + perturb(3, 4), 8, 3, 4]
      : profile === "alternatives"
        ? [22 + perturb(4, 4), 10, 10, 46 + perturb(5, 5), 5, 7]
        : profile === "growth"
          ? [58 + perturb(6, 6), 18 + perturb(7, 4), 9, 7, 3, 5]
          : [42 + perturb(8, 5), 14 + perturb(9, 3), 24 + perturb(10, 4), 9, 5, 6];
  const total = raw.reduce((sum, value) => sum + Math.max(0, value), 0);
  let used = 0;
  return raw.map((value, index) => {
    if (index === raw.length - 1) return Math.max(0, 100 - used);
    const weight = Math.max(0, Math.round(Math.max(0, value) / total * 100));
    used += weight;
    return weight;
  });
}

function allocationLabel(profile) {
  if (profile === "cash") return "Liquidity";
  if (profile === "alternatives") return "Alternatives";
  if (profile === "retirement") return "Retirement";
  if (profile === "growth") return "Growth";
  return "Balanced";
}

function buildHistory(seed, endingMillions) {
  const points = [];
  const endYear = 2026;
  const endMonth = 7;
  const slope = 0.64 + mixedIndex(seed, 4, 11) / 100;
  const volatility = 0.012 + mixedIndex(seed, 8, 10) / 1000;
  const shockCenter = 0.31 + mixedIndex(seed, 12, 30) / 100;
  for (let offset = 60; offset >= 0; offset -= 1) {
    const monthIndex = endYear * 12 + endMonth - offset;
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const progress = (60 - offset) / 60;
    const trend = endingMillions * (slope + (1 - slope) * progress);
    const cycle = Math.sin((seed * 0.37 + offset) * 0.31) * endingMillions * volatility;
    const shock = Math.exp(-Math.pow((progress - shockCenter) / 0.085, 2)) * endingMillions * (0.015 + mixedIndex(seed, 15, 18) / 1000);
    points.push({ time: `${year}-${String(month + 1).padStart(2, "0")}-21`, value: Number((trend + cycle - shock).toFixed(3)) });
  }
  points[points.length - 1].value = Number(endingMillions.toFixed(3));
  return points;
}

function buildAccountTemplates(seed, count) {
  const primaryPool = ACCOUNT_TEMPLATES.filter((template) => PRIMARY_ACCOUNT_KEYS.has(template.key));
  const first = pick(primaryPool, seed, 21);
  return [first, ...selectDistinct(ACCOUNT_TEMPLATES, seed, count - 1, 27, new Set([first.key]), (template) => template.key)];
}

function holdingInstrumentId(holding, householdId, ordinal) {
  return holding[0] === "—" ? `${householdId.toUpperCase()}-MODEL-${ordinal + 1}` : holding[0];
}

function householdAllocation(riskProfile, cashPct, seed) {
  const base = RISK_MIXES[riskProfile];
  const cashWeight = clamp(Math.round(cashPct), 2, 18);
  const nonCashRaw = [
    Math.max(5, base[0] + (mixedIndex(seed, 51, 7) - 3)),
    Math.max(4, base[1] + (mixedIndex(seed, 52, 5) - 2)),
    Math.max(5, base[2] + (mixedIndex(seed, 53, 7) - 3)),
    Math.max(2, base[3] + (mixedIndex(seed, 54, 5) - 2)),
    Math.max(2, base[4] + (mixedIndex(seed, 55, 5) - 2)),
  ];
  const remaining = 100 - cashWeight;
  const nonCashTotal = nonCashRaw.reduce((sum, value) => sum + value, 0);
  let used = 0;
  const scaled = nonCashRaw.map((value, index) => {
    if (index === nonCashRaw.length - 1) return remaining - used;
    const weight = Math.round(value / nonCashTotal * remaining);
    used += weight;
    return weight;
  });
  return [scaled[0], scaled[1], scaled[2], scaled[3], cashWeight, scaled[4]];
}

function concentrationTarget(riskProfile) {
  if (riskProfile === "Capital preservation" || riskProfile === "Conservative") return 8;
  if (riskProfile === "Growth") return 15;
  return riskProfile === "Moderate growth" || riskProfile === "Balanced growth" ? 12 : 10;
}

function generatedHousehold(index) {
  const seed = index + 11;
  const id = `household-${String(index + 1).padStart(3, "0")}`;
  const name = householdName(index);
  const family = familyLabel(name);
  const tierBases = [1_800_000, 3_200_000, 5_500_000, 8_500_000, 12_500_000, 18_000_000, 28_000_000, 42_000_000];
  const tier = mixedIndex(seed, 61, tierBases.length);
  let financialAssets = round(tierBases[tier] * (0.82 + mixedIndex(seed, 62, 62) / 100), 10_000);
  if (seed % 23 === 0) financialAssets = round(financialAssets * 1.7, 10_000);

  const accountCount = 4 + mixedIndex(seed, 63, 7);
  const accountWeights = Array.from({ length: accountCount }, (_, accountIndex) => Math.max(3, 38 - accountIndex * 4 + mixedIndex(seed + accountIndex, 64, 8)));
  const accountValues = allocationParts(financialAssets, accountWeights);
  const location = pick(LOCATIONS, seed, 65);
  const riskProfile = pick(RISK_PROFILES, seed, 66);
  const relationshipType = pick(RELATIONSHIP_TYPES, seed, 67);
  const returnPct = Number((2.8 + mixedIndex(seed, 68, 124) / 10).toFixed(1));
  const memberOne = pick(FIRST_NAMES, seed, 69);
  let memberTwo = pick(FIRST_NAMES, seed, 70);
  if (memberTwo === memberOne) memberTwo = pick(FIRST_NAMES, seed + 9, 71);
  const members = [`${memberOne} ${family}`, `${memberTwo} ${family}`];

  const accounts = [];
  const accountAllocations = [];
  const positions = [];
  const selectedTemplates = buildAccountTemplates(seed, accountCount);

  accountValues.forEach((marketValue, accountIndex) => {
    const template = selectedTemplates[accountIndex];
    const accountId = `${id}-account-${accountIndex + 1}`;
    const cashRate = template.liquidity ? 0.68 + mixedIndex(seed + accountIndex, 72, 18) / 100 : 0.008 + mixedIndex(seed + accountIndex, 73, 66) / 1000;
    const cashBalance = Math.min(marketValue, round(marketValue * cashRate, 1000));
    const accountReturn = Number((returnPct + (mixedIndex(seed + accountIndex, 74, 25) - 12) / 10).toFixed(1));
    const isTaxable = ["Taxable", "Trust", "Partnership", "UTMA"].includes(template.registration);
    const feedAge = template.custodyType === "held-away" ? mixedIndex(seed + accountIndex, 75, 4) : 0;
    const reconciled = template.custodyType === "held-away"
      ? [["Aug 21 · Daily feed", "held-away-aggregation"], ["Aug 20 · Daily feed", "held-away-aggregation"], ["Aug 19 · Daily feed", "held-away-aggregation"], ["Aug 18 · Weekly feed", "held-away-aggregation"]][feedAge]
      : ["Aug 21 · 9:42 AM ET", "portfolio-accounting"];

    accounts.push({
      id: accountId,
      householdId: id,
      name: accountName(template, family, seed, accountIndex),
      registration: template.registration,
      currency: "USD",
      marketValue,
      allocationLabel: allocationLabel(template.profile),
      ytdReturnPct: template.liquidity ? 3.8 : accountReturn,
      purpose: template.purpose,
      taxTreatment: template.taxTreatment,
      program: template.program,
      custodyType: template.custodyType,
      cashBalance,
      unrealizedGain: isTaxable ? round(marketValue * (0.045 + mixedIndex(seed + accountIndex, 76, 220) / 1000), 1000) : 0,
      lastReconciled: reconciled[0],
      sourceSystem: reconciled[1],
    });

    const mix = accountMix(template.profile, seed, accountIndex);
    mix.forEach((weightPct, mixIndex) => {
      if (!weightPct) return;
      accountAllocations.push({
        id: `${accountId}-allocation-${mixIndex}`,
        accountId,
        label: ALLOCATION_LABELS[mixIndex][0],
        weightPct,
        tone: ALLOCATION_LABELS[mixIndex][1],
      });
    });
  });

  const concentration = seed % 4 === 0;
  const concentrationOrdinal = Math.floor(seed / 4);
  const primaryHolding = concentration ? SINGLE_STOCKS[(concentrationOrdinal * 11 + 3) % SINGLE_STOCKS.length] : pick(HOLDINGS, seed, 79);
  const otherHoldings = selectDistinct(HOLDINGS, seed, 6, 80, new Set([primaryHolding[0]]), (holding) => `${holding[0]}:${holding[1]}`);
  const selectedHoldings = [primaryHolding, ...otherHoldings];
  const firstWeight = concentration ? 17 + mixedIndex(seed, 81, 12) : 6 + mixedIndex(seed, 82, 8);
  const holdingWeights = [firstWeight, 7 + mixedIndex(seed, 83, 6), 5 + mixedIndex(seed, 84, 5), 3.8 + mixedIndex(seed, 85, 9) / 10, 3 + mixedIndex(seed, 86, 8) / 10, 2.4 + mixedIndex(seed, 87, 7) / 10, 1.8 + mixedIndex(seed, 88, 6) / 10];
  const holdingSnapshots = selectedHoldings.map((holding, holdingIndex) => {
    const weight = Number(holdingWeights[holdingIndex].toFixed(1));
    return {
      id: `${id}-holding-${holdingIndex + 1}`,
      householdId: id,
      asOf: AS_OF,
      instrumentId: holdingInstrumentId(holding, id, holdingIndex),
      symbol: holding[0],
      name: holding[1],
      marketValue: round(financialAssets * weight / 100, 1000),
      householdWeightPct: weight,
      ytdReturnPct: Number((returnPct + (mixedIndex(seed + holdingIndex, 89, 81) - 30) / 10).toFixed(1)),
      brandKey: holding[2],
    };
  });

  const generalPositionHoldings = holdingSnapshots.slice(concentration ? 1 : 0);
  accounts.forEach((account, accountIndex) => {
    const template = selectedTemplates[accountIndex];
    if (template.liquidity) return;
    const selected = selectDistinct(generalPositionHoldings, seed + accountIndex * 5, Math.min(3, generalPositionHoldings.length), 90 + accountIndex, new Set(), (holding) => holding.instrumentId);
    const accountPositionWeights = [0.19 + mixedIndex(seed + accountIndex, 91, 8) / 100, 0.12 + mixedIndex(seed + accountIndex, 92, 6) / 100, 0.07 + mixedIndex(seed + accountIndex, 93, 5) / 100];
    selected.forEach((holding, holdingIndex) => {
      const marketValue = round(account.marketValue * accountPositionWeights[holdingIndex], 1000);
      if (marketValue <= 0) return;
      const taxable = ["Taxable", "Trust", "Partnership", "UTMA"].includes(account.registration);
      positions.push({
        id: `${account.id}-position-${holdingIndex + 1}`,
        householdId: id,
        accountId: account.id,
        instrumentId: holding.instrumentId,
        symbol: holding.symbol,
        name: holding.name,
        marketValue,
        accountWeightPct: pct(marketValue, account.marketValue),
        unrealizedGain: taxable ? round(marketValue * (0.06 + mixedIndex(seed + holdingIndex + accountIndex, 94, 280) / 1000), 1000) : 0,
        brandKey: holding.brandKey,
      });
    });
  });

  if (concentration) {
    const taxableAccounts = accounts.filter((account) => ["Taxable", "Trust", "Partnership", "UTMA"].includes(account.registration));
    const nonLiquidityAccounts = accounts.filter((account, accountIndex) => !selectedTemplates[accountIndex].liquidity);
    const eligible = [...taxableAccounts, ...nonLiquidityAccounts.filter((account) => !taxableAccounts.some((taxable) => taxable.id === account.id))].slice(0, 4);
    const eligibleTotal = eligible.reduce((sum, account) => sum + account.marketValue, 0);
    let used = 0;
    eligible.forEach((account, positionIndex) => {
      const marketValue = positionIndex === eligible.length - 1
        ? primaryHolding === null ? 0 : holdingSnapshots[0].marketValue - used
        : round(holdingSnapshots[0].marketValue * account.marketValue / eligibleTotal, 1000);
      used += marketValue;
      if (marketValue <= 0) return;
      const taxable = ["Taxable", "Trust", "Partnership", "UTMA"].includes(account.registration);
      positions.push({
        id: `${id}-concentration-${positionIndex + 1}`,
        householdId: id,
        accountId: account.id,
        instrumentId: holdingSnapshots[0].instrumentId,
        symbol: holdingSnapshots[0].symbol,
        name: holdingSnapshots[0].name,
        marketValue,
        accountWeightPct: pct(marketValue, account.marketValue),
        unrealizedGain: taxable ? round(marketValue * (0.16 + mixedIndex(seed + positionIndex, 95, 260) / 1000), 1000) : 0,
        brandKey: holdingSnapshots[0].brandKey,
      });
    });
  }

  const cash = accounts.reduce((sum, account) => sum + account.cashBalance, 0);
  const cashPct = pct(cash, financialAssets);
  const allocationWeights = householdAllocation(riskProfile, cashPct, seed);
  let allocationUsed = 0;
  let marketValueUsed = 0;
  const householdAllocationSnapshots = allocationWeights.map((weightPct, allocationIndex) => {
    allocationUsed += weightPct;
    const marketValue = allocationIndex === allocationWeights.length - 1 ? financialAssets - marketValueUsed : round(financialAssets * weightPct / 100, 1000);
    marketValueUsed += marketValue;
    return {
      id: `${id}-allocation-${allocationIndex}`,
      householdId: id,
      asOf: AS_OF,
      label: ALLOCATION_LABELS[allocationIndex][0],
      weightPct,
      marketValue,
      tone: ALLOCATION_LABELS[allocationIndex][1],
    };
  });
  if (allocationUsed !== 100) throw new Error(`${id} household allocation must total 100`);

  const goalCount = 3 + mixedIndex(seed, 96, 4);
  const coreGoal = pick(GOAL_TEMPLATES.slice(0, 2), seed, 97);
  const goalTemplates = [coreGoal, ...selectDistinct(GOAL_TEMPLATES, seed, goalCount - 1, 98, new Set([coreGoal.key]), (goal) => goal.key)];
  const goals = goalTemplates.map((template, goalIndex) => {
    const targetPct = template.targetPct[0] + mixedIndex(seed + goalIndex, 99, 1001) / 1000 * (template.targetPct[1] - template.targetPct[0]);
    const targetAmount = Math.max(25_000, round(financialAssets * targetPct, 10_000));
    let ratio = 0.58 + mixedIndex(seed + goalIndex, 100, 47) / 100;
    if ((seed + goalIndex) % 11 === 0) ratio -= 0.18;
    ratio = clamp(ratio, 0.42, 1.08);
    const fundedAmount = round(targetAmount * Math.min(1, ratio), 1000);
    const progress = Math.round(fundedAmount / targetAmount * 100);
    const status = progress >= 100 ? "Funded" : progress >= 76 ? "On track" : "Review";
    return {
      id: `${id}-goal-${goalIndex + 1}`,
      householdId: id,
      name: template.name,
      timing: pick(template.timings, seed + goalIndex, 101),
      status,
      tone: status === "Review" ? "watch" : "good",
      currency: "USD",
      targetAmount,
      fundedAmount,
      confidencePct: clamp(progress + mixedIndex(seed + goalIndex, 102, 15) - 3, 55, 97),
      annualFundingAmount: status === "Funded" ? 0 : round(targetAmount * (0.018 + mixedIndex(seed + goalIndex, 103, 42) / 1000), 1000),
      nextReview: pick(["Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026", "Jan 2027", "Feb 2027"], seed + goalIndex, 104),
      owner: template.owner === "Joint" ? "Joint" : template.owner === "Family" ? family : template.owner,
      action: status === "Review" ? "Review funding source, timing and tradeoffs at the next planning meeting." : "Maintain the current funding and allocation path.",
    };
  });

  const nonFinancialCount = 1 + mixedIndex(seed, 105, 3);
  const nonFinancialAssets = selectDistinct(NON_FINANCIAL_TEMPLATES, seed, nonFinancialCount, 106, new Set(), (item) => item[0]).map(([category, minPct, maxPct], assetIndex) => ({
    id: `${id}-non-financial-${assetIndex + 1}`,
    householdId: id,
    category,
    currency: "USD",
    marketValue: round(financialAssets * (minPct + mixedIndex(seed + assetIndex, 107, 1001) / 1000 * (maxPct - minPct)), 10_000),
  }));

  const liabilityCount = mixedIndex(seed, 108, 4);
  const liabilities = selectDistinct(LIABILITY_TEMPLATES, seed, liabilityCount, 109, new Set(), (item) => item[0]).map(([category, minPct, maxPct], liabilityIndex) => ({
    id: `${id}-liability-${liabilityIndex + 1}`,
    householdId: id,
    category,
    currency: "USD",
    balance: round(financialAssets * (minPct + mixedIndex(seed + liabilityIndex, 110, 1001) / 1000 * (maxPct - minPct)), 10_000),
  }));

  const watchGoals = goals.filter((goal) => goal.tone === "watch");
  const insights = [];
  const primarySnapshot = holdingSnapshots[0];

  if (concentration) {
    const concentrationPositions = positions.filter((position) => position.instrumentId === primarySnapshot.instrumentId);
    const concentrationTitle = [
      `${primarySnapshot.symbol} concentration reached ${primarySnapshot.householdWeightPct.toFixed(1)}%`,
      `${primarySnapshot.symbol} remains above household policy`,
      `${moneyShort(primarySnapshot.marketValue)} concentrated in ${primarySnapshot.symbol}`,
      `${primarySnapshot.symbol} exposure is ${primarySnapshot.householdWeightPct.toFixed(1)}% of financial assets`,
    ][mixedIndex(seed, 111, 4)];
    insights.push({
      id: `${id}-concentration`,
      kind: "concentration",
      householdId: id,
      severity: "Priority",
      tone: "red",
      title: concentrationTitle,
      detail: `${moneyShort(primarySnapshot.marketValue)} across ${concentrationPositions.length || 1} ${concentrationPositions.length === 1 ? "account" : "accounts"}`,
      actionLabel: "Review",
      actionMetadata: { type: "concentration" },
    });
  }

  if (cashPct >= 9.5) {
    const cashTitle = [
      `${moneyShort(cash)} deployable cash above policy`,
      `Household cash reserve is ${cashPct.toFixed(1)}%`,
      `${moneyShort(cash)} liquidity available after reserves`,
      `Cash balance increased to ${moneyShort(cash)}`,
    ][mixedIndex(seed, 112, 4)];
    insights.push({
      id: `${id}-cash`,
      kind: "liquidity",
      householdId: id,
      severity: "Opportunity",
      tone: "green",
      title: cashTitle,
      detail: `${cashPct.toFixed(1)}% cash across ${accounts.filter((account) => account.cashBalance > 0).length} accounts`,
      actionLabel: "Explore",
      actionMetadata: {
        type: "investment-search",
        searchIntent: {
          source: "FROM LIQUIDITY REVIEW",
          title: "Explore cash alternatives",
          tags: [`${moneyShort(cash)} available`, riskProfile, "Daily liquidity"],
          category: "Fixed Income",
          query: pick(["short duration cash management", "high quality short duration", "tax aware short duration"], seed, 113),
          flags: [],
          risks: ["Conservative"],
        },
      },
    });
  }

  if (watchGoals.length) {
    const goal = watchGoals[0];
    insights.push({
      id: `${id}-goal-review`,
      kind: "goal",
      householdId: id,
      severity: "Planning",
      tone: "amber",
      title: `${goal.name} needs review`,
      detail: `${Math.round(goal.fundedAmount / goal.targetAmount * 100)}% funded · ${goal.nextReview}`,
      actionLabel: "Review",
      actionMetadata: { type: "goal", goalId: goal.id },
    });
  }

  if (seed % 5 === 0) {
    const obligation = pick(OBLIGATION_TEMPLATES, seed, 114);
    const amount = round(obligation.min + mixedIndex(seed, 115, obligation.maxSteps) * obligation.step, 5000);
    insights.push({
      id: `${id}-${obligation.key}`,
      kind: "obligation",
      householdId: id,
      severity: "Upcoming",
      tone: "amber",
      title: `${moneyShort(amount)} ${obligation.label}`,
      detail: `${obligation.timing} · funding source identified`,
      actionLabel: "Review",
      actionMetadata: { type: "detail" },
      details: {
        eyebrow: "UPCOMING OBLIGATION",
        summary: `Available household liquidity is being reviewed against the upcoming ${obligation.label}.`,
        rows: [["Funding source", accounts[0].name], ["Cash available", moneyShort(cash)], ["Amount", moneyShort(amount)], ["Timing", obligation.timing]],
      },
    });
  }

  if (seed % 6 === 0) {
    const followed = holdingSnapshots.slice(1, 4);
    const researchTitle = [
      `Research updated on ${followed[0].symbol === "—" ? followed[0].name : followed[0].symbol}`,
      `${followed[0].name} review completed`,
      "Two followed strategies refreshed",
      "Research and shelf data changed",
    ][mixedIndex(seed, 116, 4)];
    insights.push({
      id: `${id}-research-change`,
      kind: "research",
      householdId: id,
      severity: "Research",
      tone: "slate",
      title: researchTitle,
      detail: "Research and shelf updates since last review",
      actionLabel: "View",
      actionMetadata: { type: "detail" },
      details: {
        eyebrow: "FOLLOWED INVESTMENTS",
        summary: "Research and shelf activity tied to investments followed in this relationship.",
        rows: [[followed[0].name, "Research review completed"], [followed[1].name, "Data refreshed"], [followed[2].name, "Terms reviewed"]],
      },
    });
  }

  const heldAwayAccounts = accounts.filter((account) => account.custodyType === "held-away");
  if (heldAwayAccounts.length && seed % 9 === 0) {
    const account = heldAwayAccounts[0];
    insights.push({
      id: `${id}-external-review`,
      kind: "account-review",
      householdId: id,
      severity: "Review",
      tone: "slate",
      title: `${account.name} connection due for review`,
      detail: `${moneyShort(account.marketValue)} held away · ${account.lastReconciled}`,
      actionLabel: "View",
      actionMetadata: { type: "detail" },
      details: {
        eyebrow: "EXTERNAL ACCOUNT",
        summary: "Connected held-away data remains part of the household view and is due for a source review.",
        rows: [["Account", account.name], ["Value", moneyShort(account.marketValue)], ["Last reconciled", account.lastReconciled], ["Source", "Connected external"]],
      },
    });
  }

  if (seed % 10 === 3) {
    const planningTopic = pick(["Estate plan review due this quarter", "Beneficiary review scheduled", "Family governance review upcoming", "Annual gifting plan ready for review"], seed, 117);
    insights.push({
      id: `${id}-planning-review`,
      kind: "planning",
      householdId: id,
      severity: "Planning",
      tone: "blue",
      title: planningTopic,
      detail: `Last planning review · ${pick(["Jun", "Jul", "Aug"], seed, 118)} 2026`,
      actionLabel: "View",
      actionMetadata: { type: "detail" },
    });
  }

  if (!insights.length) {
    insights.push({
      id: `${id}-planning-current`,
      kind: "planning",
      householdId: id,
      severity: "Current",
      tone: "blue",
      title: pick(["Household plan remains on track", "No material exceptions since review", "Relationship remains within current plan", "Portfolio and planning data are current"], seed, 119),
      detail: "No material exception requires advisor action today",
      actionLabel: "View",
      actionMetadata: { type: "detail" },
    });
  }

  const targetWeight = concentrationTarget(riskProfile);
  const concentrationPolicies = concentration ? [{
    id: `${id}-concentration-policy`,
    householdId: id,
    instrumentId: primarySnapshot.instrumentId,
    isPrimary: true,
    targetWeightPct: targetWeight,
    modeledRiskContributionPct: clamp(Math.round(primarySnapshot.householdWeightPct * (1.08 + mixedIndex(seed, 120, 22) / 100)), 16, 42),
    scenarios: [
      { name: "10% single-stock decline", holdingMove: `−${moneyShort(primarySnapshot.marketValue * 0.1)}`, portfolioMove: `−${(primarySnapshot.householdWeightPct * 0.1).toFixed(1)}%` },
      { name: "35% company drawdown", holdingMove: `−${moneyShort(primarySnapshot.marketValue * 0.35)}`, portfolioMove: `−${(primarySnapshot.householdWeightPct * 0.35).toFixed(1)}%` },
      { name: `Reduce to ${targetWeight}% policy target`, holdingMove: `Release ${moneyShort(Math.max(0, primarySnapshot.marketValue - financialAssets * targetWeight / 100))}`, portfolioMove: "Diversified" },
    ],
    research: {
      status: pick(["Reviewed · monitored", "Current · monitored", "Research current"], seed, 121),
      reviewed: pick(["Aug 14, 2026", "Aug 18, 2026", "Aug 20, 2026"], seed, 122),
      summary: "Security-level research remains current while household risk is elevated by the size of the position.",
    },
    searchIntent: {
      source: "FROM CONCENTRATION REVIEW",
      title: "Explore diversification options",
      tags: [name, "Tax-aware implementation", "Reduce concentrated exposure"],
      category: "SMAs",
      query: "",
      flags: ["Tax-Aware", "Direct Indexing"],
      risks: /conservative|preservation/i.test(riskProfile) ? ["Conservative"] : ["Moderate"],
    },
  }] : [];

  const entitySummary = pick([
    `${family} revocable trust · retirement accounts`,
    `${family} family trust · charitable account`,
    `${family} family entities · external retirement plan`,
    `${family} trust structure · education accounts`,
    `${family} investment entities · private investments`,
    `${family} family partnership · charitable giving`,
  ], seed, 123);

  const serviceModel = financialAssets >= 25_000_000 ? "Private Wealth · integrated advisory" : pick(SERVICE_MODELS, seed, 124);
  const lastPlanningReview = `${pick(["May", "Jun", "Jul", "Aug"], seed, 125)} ${8 + mixedIndex(seed, 126, 20)}, 2026`;

  return {
    household: {
      id,
      advisorId: ADVISOR_ID,
      name,
      initials: initials(name),
      relationshipType,
      location,
      asOf: AS_OF,
      riskProfile,
      ytdChangeAmount: round(financialAssets * returnPct / 100 * (0.12 + mixedIndex(seed, 127, 15) / 100), 1000),
      ytdReturnPct: returnPct,
      netFlowsAmount: round(financialAssets * (mixedIndex(seed, 128, 13) - 4) / 100, 1000),
      members,
      entitySummary,
      serviceModel,
      lastPlanningReview,
    },
    accounts,
    accountAllocations,
    positions,
    householdAllocationSnapshots,
    householdHoldingSnapshots: holdingSnapshots,
    nonFinancialAssets,
    liabilities,
    goals,
    insights,
    concentrationPolicies,
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
  advisors: base.advisors.map((advisor) => ({ ...advisor, initials: advisor.initials || "A4" })),
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
