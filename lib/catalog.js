import { CATEGORY_COUNTS, CATEGORY_ORDER, CATALOG_VERSION, FLAG_DEFINITIONS, RISKS, SORTS, STATUSES, UNIVERSE_SIZE } from "./shared-config.js";
import { resolveBrandKey } from "./brand-logos.js";
export { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_DEFINITIONS, UNIVERSE_SIZE } from "./shared-config.js";

const base = (item) => {
  const record = {
    status: "Available",
    liquidity: "Daily",
    inception: "2014",
    asOf: "Aug 21, 2026",
    identifier: item.symbol || item.id,
    ...item,
  };
  return { ...record, brandKey: resolveBrandKey(record) };
};

export const CURATED = [
  base({ id: "eq-aapl", category: "Equities", type: "Common stock", name: "Apple Inc.", symbol: "AAPL", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "Moderate", minimum: 0, fee: null, perf1: 18.4, perf3: 21.7, aum: "$4.6T market cap", flags: ["CIO House View", "Research Updated"], description: "Global consumer technology company with an integrated hardware, software and services ecosystem.", benchmark: "S&P 500" }),
  base({ id: "eq-msft", category: "Equities", type: "Common stock", name: "Microsoft Corporation", symbol: "MSFT", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "Moderate", minimum: 0, fee: null, perf1: 23.1, perf3: 19.8, aum: "$3.9T market cap", flags: ["CIO House View", "Sustainable"], description: "Global software, cloud infrastructure and productivity platform company.", benchmark: "S&P 500" }),
  base({ id: "eq-nvda", category: "Equities", type: "Common stock", name: "NVIDIA Corporation", symbol: "NVDA", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "High", minimum: 0, fee: null, perf1: 42.7, perf3: 74.2, aum: "$5.2T market cap", flags: ["CIO House View", "Research Updated"], description: "Accelerated computing company serving data center, gaming and professional visualization markets.", benchmark: "S&P 500" }),
  base({ id: "eq-jpm", category: "Equities", type: "Common stock", name: "JPMorgan Chase & Co.", symbol: "JPM", manager: "Financials · NYSE", assetClass: "US Large Cap Equity", objective: "Core / Income", risk: "Moderate", minimum: 0, fee: null, perf1: 15.5, perf3: 24.9, aum: "$940B market cap", flags: ["Research Updated"], description: "Diversified global financial services firm across consumer, commercial and investment banking.", benchmark: "S&P 500" }),
  base({ id: "eq-nee", category: "Equities", type: "Common stock", name: "NextEra Energy, Inc.", symbol: "NEE", manager: "Utilities · NYSE", assetClass: "US Large Cap Equity", objective: "Income", risk: "Moderate", minimum: 0, fee: null, perf1: 9.2, perf3: 3.8, aum: "$176B market cap", flags: ["Sustainable"], description: "Electric power and energy infrastructure company with significant renewable generation exposure.", benchmark: "S&P 500" }),

  base({ id: "mf-vfiax", category: "Mutual Funds", type: "Mutual fund · Admiral", name: "Vanguard 500 Index Fund Admiral Shares", symbol: "VFIAX", manager: "Vanguard", assetClass: "US Large Blend", objective: "Core equity", risk: "Moderate", minimum: 3000, fee: 0.04, perf1: 17.8, perf3: 19.3, aum: "$1.5T", flags: ["Research Updated"], description: "Passively managed exposure designed to track the investment performance of the S&P 500 Index.", benchmark: "S&P 500", inception: "2000" }),
  base({ id: "mf-fcntx", category: "Mutual Funds", type: "Mutual fund", name: "Fidelity Contrafund", symbol: "FCNTX", manager: "Fidelity Investments", assetClass: "US Large Growth", objective: "Capital appreciation", risk: "Moderate", minimum: 0, fee: 0.68, perf1: 21.1, perf3: 25.0, aum: "$170B", flags: ["Research Updated"], description: "Actively managed large-cap growth strategy focused on companies believed to have underappreciated value.", benchmark: "Russell 1000 Growth", inception: "1967" }),
  base({ id: "mf-pimix", category: "Mutual Funds", type: "Mutual fund · Institutional", name: "PIMCO Income Fund Institutional", symbol: "PIMIX", manager: "PIMCO", assetClass: "Multisector Bond", objective: "Income", risk: "Moderate", minimum: 1000000, fee: 0.51, perf1: 7.2, perf3: 6.4, aum: "$186B", flags: ["CIO House View"], description: "Flexible global multisector fixed income strategy seeking current income with prudent long-term capital appreciation.", benchmark: "Bloomberg US Aggregate", inception: "2007" }),
  base({ id: "mf-parnassus", category: "Mutual Funds", type: "Mutual fund", name: "Parnassus Core Equity Fund Investor", symbol: "PRBLX", manager: "Parnassus Investments", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 2000, fee: 0.82, perf1: 13.4, perf3: 14.9, aum: "$31B", flags: ["Sustainable"], description: "Concentrated core equity portfolio integrating environmental, social and governance research.", benchmark: "S&P 500", inception: "1992" }),

  base({ id: "etf-ivv", category: "ETFs", type: "ETF", name: "iShares Core S&P 500 ETF", symbol: "IVV", manager: "BlackRock", assetClass: "US Large Blend", objective: "Core equity", risk: "Moderate", minimum: 0, fee: 0.03, perf1: 17.7, perf3: 19.2, aum: "$715B", flags: ["CIO House View", "Research Updated"], description: "Low-cost exposure to large-cap US equities represented by the S&P 500 Index.", benchmark: "S&P 500", inception: "2000" }),
  base({ id: "etf-mub", category: "ETFs", type: "ETF", name: "iShares National Muni Bond ETF", symbol: "MUB", manager: "BlackRock", assetClass: "Municipal Bond", objective: "Tax-exempt income", risk: "Conservative", minimum: 0, fee: 0.05, perf1: 4.8, perf3: 2.9, aum: "$46B", flags: ["Tax-Aware", "CIO House View"], description: "Broad investment-grade US municipal bond exposure designed to provide federally tax-exempt income.", benchmark: "ICE AMT-Free US National Muni", inception: "2007" }),
  base({ id: "etf-susl", category: "ETFs", type: "ETF", name: "iShares ESG MSCI USA Leaders ETF", symbol: "SUSL", manager: "BlackRock", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 0, fee: 0.10, perf1: 16.5, perf3: 18.0, aum: "$5.1B", flags: ["Sustainable"], description: "US equity exposure emphasizing companies with favorable environmental, social and governance characteristics.", benchmark: "MSCI USA Extended ESG Leaders", inception: "2019" }),
  base({ id: "etf-schd", category: "ETFs", type: "ETF", name: "Schwab US Dividend Equity ETF", symbol: "SCHD", manager: "Charles Schwab Investment Management", assetClass: "US Large Value", objective: "Dividend income", risk: "Moderate", minimum: 0, fee: 0.06, perf1: 12.1, perf3: 10.8, aum: "$76B", flags: ["Research Updated"], description: "Rules-based portfolio of US companies selected for dividend quality and financial strength.", benchmark: "Dow Jones US Dividend 100", inception: "2011" }),

  base({ id: "sma-northstar", category: "SMAs", type: "Separately managed account", name: "US Equity Focus Growth", symbol: "NX1A", manager: "Northstar Capital Management", assetClass: "US Large Growth", objective: "Capital appreciation", risk: "Moderate", minimum: 100000, fee: 0.41, perf1: 22.8, perf3: 20.1, aum: "$4.8B strategy assets", flags: ["Model Enabled", "SMA Select", "Research Updated"], description: "High-conviction US equity strategy emphasizing durable growth, balance-sheet quality and long-term compounding.", benchmark: "Russell 1000 Growth", inception: "2008", liquidity: "Daily" }),
  base({ id: "sma-aperio", category: "SMAs", type: "Separately managed account", name: "Tax-Managed US Large Cap Index", symbol: "APLC", manager: "Aperio Group", assetClass: "US Large Blend", objective: "Tax-aware index exposure", risk: "Moderate", minimum: 250000, fee: 0.35, perf1: 17.1, perf3: 18.5, aum: "$18.6B strategy assets", flags: ["Tax-Aware", "Direct Indexing", "Sustainable"], description: "Customizable direct-indexing strategy seeking benchmark-like exposure with ongoing tax-loss harvesting.", benchmark: "S&P 500", inception: "2004", liquidity: "Daily" }),
  base({ id: "sma-nuveen-muni", category: "SMAs", type: "Separately managed account", name: "Intermediate Municipal Bond", symbol: "NUIM", manager: "Nuveen Asset Management", assetClass: "Municipal Bond", objective: "Tax-exempt income", risk: "Conservative", minimum: 250000, fee: 0.28, perf1: 5.2, perf3: 3.4, aum: "$12.2B strategy assets", flags: ["Tax-Aware", "SMA Select", "CIO House View"], description: "Investment-grade municipal portfolio focused on income, capital preservation and security-level credit research.", benchmark: "Bloomberg 1-15 Year Municipal", inception: "1998", liquidity: "Daily" }),
  base({ id: "sma-ups-climate", category: "SMAs", type: "Separately managed account", name: "Climate Aware US Equity", symbol: "UPCA", manager: "UPS Asset Management", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 100000, fee: 0.32, perf1: 16.8, perf3: 17.6, aum: "$2.9B strategy assets", flags: ["Sustainable", "Model Enabled", "New to Shelf"], description: "Systematic US equity strategy integrating climate-transition signals while maintaining broad market characteristics.", benchmark: "Russell 1000", inception: "2022", liquidity: "Daily" }),

  base({ id: "fi-treasury", category: "Fixed Income", type: "US Treasury", name: "United States Treasury Note 3.875% 08/15/2034", symbol: "91282CMB4", manager: "United States Treasury", assetClass: "US Government", objective: "Income / capital preservation", risk: "Conservative", minimum: 1000, fee: null, perf1: 4.0, perf3: null, aum: "$58.4B outstanding", flags: ["CIO House View"], description: "Intermediate US Treasury security backed by the full faith and credit of the United States.", benchmark: "10-Year US Treasury", inception: "2024", liquidity: "Intraday" }),
  base({ id: "fi-nyc-muni", category: "Fixed Income", type: "Municipal bond", name: "NYC Transitional Finance Authority 5.00% 11/01/2042", symbol: "64971WXX8", manager: "New York City TFA", assetClass: "Municipal Bond", objective: "Tax-exempt income", risk: "Conservative", minimum: 5000, fee: null, perf1: 4.6, perf3: null, aum: "$214M issue", flags: ["Tax-Aware", "CIO House View"], description: "Illustrative New York municipal revenue obligation with federal and potential state tax advantages for eligible residents.", benchmark: "Bloomberg Municipal Bond Index", inception: "2022", liquidity: "Secondary market" }),
  base({ id: "fi-msft", category: "Fixed Income", type: "Corporate bond", name: "Microsoft Corp. 3.95% 08/08/2050", symbol: "594918CE2", manager: "Microsoft Corporation", assetClass: "Investment Grade Corporate", objective: "Income", risk: "Conservative", minimum: 2000, fee: null, perf1: 5.1, perf3: null, aum: "$3.5B issue", flags: ["Research Updated"], description: "Long-dated senior unsecured corporate obligation of Microsoft Corporation.", benchmark: "Bloomberg US Corporate", inception: "2020", liquidity: "Secondary market" }),
  base({ id: "fi-jpm", category: "Fixed Income", type: "Corporate bond", name: "JPMorgan Chase 4.60% 05/15/2030", symbol: "46647PEA8", manager: "JPMorgan Chase & Co.", assetClass: "Investment Grade Corporate", objective: "Income", risk: "Moderate", minimum: 2000, fee: null, perf1: 4.9, perf3: null, aum: "$2.0B issue", flags: ["Research Updated"], description: "Senior unsecured bank holding company obligation with intermediate maturity.", benchmark: "Bloomberg US Corporate", inception: "2025", liquidity: "Secondary market" }),

  base({ id: "alt-bcred", category: "Alternatives", type: "Private credit", name: "Blackstone Private Credit Fund", symbol: "BCRED", manager: "Blackstone Credit & Insurance", assetClass: "Private Credit", objective: "Current income", risk: "High", minimum: 25000, fee: 1.25, perf1: 9.8, perf3: 10.1, aum: "$75B", flags: ["CIO House View", "Limited Capacity"], description: "Non-traded business development company focused primarily on senior secured and floating-rate private credit.", benchmark: "Cliffwater Direct Lending Index", inception: "2021", liquidity: "Quarterly repurchase offers", status: "Limited" }),
  base({ id: "alt-infra", category: "Alternatives", type: "Private infrastructure", name: "Global Infrastructure Opportunities IV", symbol: "GIO4", manager: "Illustrative Global Partners", assetClass: "Private Infrastructure", objective: "Growth and income", risk: "High", minimum: 250000, fee: 1.50, perf1: 12.4, perf3: null, aum: "$8.4B target", flags: ["Sustainable", "New to Shelf"], description: "Illustrative closed-end infrastructure fund targeting digital, transport and energy-transition assets globally.", benchmark: "Private Infrastructure Composite", inception: "2026", liquidity: "10-year closed-end", status: "New" }),
  base({ id: "alt-hedge", category: "Alternatives", type: "Hedge fund", name: "Global Relative Value Opportunities", symbol: "GRVO", manager: "Illustrative Alternatives Management", assetClass: "Hedge Funds", objective: "Diversifying return", risk: "High", minimum: 1000000, fee: 1.75, perf1: 8.7, perf3: 7.9, aum: "$3.2B", flags: ["CIO House View"], description: "Illustrative multi-strategy relative-value fund allocating across rates, credit, equity and volatility opportunities.", benchmark: "SOFR + 4%", inception: "2016", liquidity: "Quarterly · 90-day notice" }),

  base({ id: "str-spx-buffer", category: "Structured", type: "Buffered return note", name: "S&P 500 15% Buffered Return Note", symbol: "SPX26B", manager: "UPS AG", assetClass: "Structured Investments", objective: "Buffered growth", risk: "High", minimum: 1000, fee: 0.75, perf1: null, perf3: null, aum: "$42M offering", flags: ["CIO House View", "New to Shelf"], description: "Illustrative 24-month note linked to the S&P 500 with a 15% downside buffer and capped upside participation.", benchmark: "S&P 500", inception: "2026", liquidity: "Issuer-dependent secondary market", status: "New" }),
  base({ id: "str-ndx-income", category: "Structured", type: "Contingent income note", name: "Nasdaq-100 Contingent Income Auto-Callable", symbol: "NDXCI", manager: "UPS AG", assetClass: "Structured Investments", objective: "Enhanced income", risk: "High", minimum: 10000, fee: 1.00, perf1: null, perf3: null, aum: "$31M offering", flags: ["Limited Capacity"], description: "Illustrative callable note offering contingent monthly income subject to index performance and issuer credit risk.", benchmark: "Nasdaq-100", inception: "2026", liquidity: "Issuer-dependent secondary market", status: "Limited" }),

  base({ id: "mos-covered", category: "Managed Options", type: "Managed options strategy", name: "US Equity Covered Call Overlay", symbol: "CCOV", manager: "UPS Portfolio Advisory Group", assetClass: "Options Overlay", objective: "Enhanced income", risk: "Moderate", minimum: 500000, fee: 0.45, perf1: 11.9, perf3: 10.6, aum: "$6.8B program assets", flags: ["CIO House View", "Tax-Aware"], description: "Systematic call-writing overlay seeking incremental income on a diversified US equity portfolio.", benchmark: "Cboe S&P 500 BuyWrite", inception: "2012", liquidity: "Daily" }),
  base({ id: "mos-buffer", category: "Managed Options", type: "Managed options strategy", name: "Dynamic Equity Buffer Strategy", symbol: "DBUF", manager: "UPS Portfolio Advisory Group", assetClass: "Options Overlay", objective: "Downside management", risk: "Moderate", minimum: 1000000, fee: 0.55, perf1: 12.6, perf3: 11.4, aum: "$2.1B program assets", flags: ["Model Enabled"], description: "Rules-based index option strategy seeking defined downside mitigation with partial upside participation.", benchmark: "S&P 500", inception: "2019", liquidity: "Daily" }),

  base({ id: "ann-fixed", category: "Annuities", type: "Fixed annuity", name: "Secure Term Choice 5-Year", symbol: "STC5", manager: "Illustrative Life Insurance Co.", assetClass: "Annuity", objective: "Guaranteed accumulation", risk: "Conservative", minimum: 10000, fee: 0, perf1: 4.55, perf3: null, aum: "$11B carrier assets", flags: ["Research Updated"], description: "Illustrative fixed deferred annuity with a five-year guaranteed interest period, subject to carrier claims-paying ability.", benchmark: "5-Year Treasury", inception: "2026", liquidity: "Annual free-withdrawal limit" }),
  base({ id: "ann-rila", category: "Annuities", type: "Registered index-linked annuity", name: "Market Link Select RILA", symbol: "MLSR", manager: "Illustrative Life Insurance Co.", assetClass: "Annuity", objective: "Buffered market growth", risk: "Moderate", minimum: 25000, fee: 1.10, perf1: null, perf3: null, aum: "$18B carrier assets", flags: ["New to Shelf"], description: "Illustrative RILA offering index-linked growth potential with selected downside buffer options.", benchmark: "S&P 500", inception: "2026", liquidity: "Surrender schedule applies", status: "New" }),

  base({ id: "pm-gold", category: "Precious Metals", type: "Allocated physical metal", name: "Allocated Gold Bullion — 1 oz", symbol: "XAU-1OZ", manager: "UPS Precious Metals Desk", assetClass: "Gold", objective: "Diversification", risk: "Moderate", minimum: 5000, fee: 0.40, perf1: 18.9, perf3: 14.1, aum: "Physical inventory", flags: ["CIO House View"], description: "Illustrative allocated physical gold position with institutional custody and secondary liquidity.", benchmark: "LBMA Gold Price", inception: "2005", liquidity: "Business-day dealing" }),
  base({ id: "pm-silver", category: "Precious Metals", type: "Allocated physical metal", name: "Allocated Silver Bullion — 100 oz", symbol: "XAG-100", manager: "UPS Precious Metals Desk", assetClass: "Silver", objective: "Diversification", risk: "High", minimum: 5000, fee: 0.55, perf1: 11.2, perf3: 8.6, aum: "Physical inventory", flags: [], description: "Illustrative allocated physical silver position with institutional custody and secondary liquidity.", benchmark: "LBMA Silver Price", inception: "2005", liquidity: "Business-day dealing" }),
];

const pools = {
  Equities: {
    types: ["Common stock", "ADR", "REIT", "Preferred stock"],
    names: ["Apex Digital Systems", "Northstar Health", "Monument Financial", "Cascade Energy", "Harbor Consumer Brands", "Vertex Industrial"],
    managers: ["Information Technology · NASDAQ", "Health Care · NYSE", "Financials · NYSE", "Industrials · NASDAQ"],
    assets: ["US Large Cap Equity", "US Mid Cap Equity", "International Equity", "US Small Cap Equity"],
    minimums: [0], fees: [null], risks: ["Moderate", "High"], objectives: ["Growth", "Core equity", "Income"],
  },
  "Mutual Funds": {
    types: ["Mutual fund · Institutional", "Mutual fund · Investor", "Money market fund"],
    names: ["Strategic Core Equity Fund", "Global Income Opportunities Fund", "Short Duration Municipal Fund", "Emerging Markets Leaders Fund"],
    managers: ["Capital Group", "T. Rowe Price", "J.P. Morgan Asset Management", "MFS Investment Management"],
    assets: ["US Large Blend", "Global Equity", "Core Plus Bond", "Municipal Bond"],
    minimums: [0, 2500, 10000, 100000], fees: [0.12, 0.35, 0.58, 0.79], risks: ["Conservative", "Moderate", "High"], objectives: ["Core equity", "Income", "Capital appreciation"],
  },
  ETFs: {
    types: ["ETF", "Active ETF", "ETP"],
    names: ["US Quality Leaders ETF", "Short Treasury ETF", "Global Infrastructure ETF", "Tax-Aware Municipal ETF"],
    managers: ["BlackRock", "Vanguard", "State Street Global Advisors", "J.P. Morgan Asset Management"],
    assets: ["US Large Blend", "Short Government", "Global Equity", "Municipal Bond"],
    minimums: [0], fees: [0.03, 0.08, 0.19, 0.35], risks: ["Conservative", "Moderate", "High"], objectives: ["Core equity", "Income", "Diversification"],
  },
  SMAs: {
    types: ["Separately managed account"],
    names: ["US Quality Core", "Tax-Managed Large Cap", "Intermediate Municipal", "Global Dividend Growth", "Small Cap Opportunities"],
    managers: ["AllianceBernstein", "BlackRock", "Nuveen Asset Management", "UPS Asset Management", "Neuberger Berman"],
    assets: ["US Large Blend", "Municipal Bond", "Global Equity", "US Small Cap Equity"],
    minimums: [100000, 250000, 500000, 1000000], fees: [0.25, 0.32, 0.45, 0.65], risks: ["Conservative", "Moderate", "High"], objectives: ["Core equity", "Tax-exempt income", "Capital appreciation"],
  },
  "Fixed Income": {
    types: ["US Treasury", "Municipal bond", "Corporate bond", "Agency bond", "Certificate of deposit"],
    names: ["US Treasury Note", "General Obligation Revenue Bond", "Senior Unsecured Corporate Note", "Federal Agency Note", "Brokered Certificate of Deposit"],
    managers: ["United States Treasury", "Municipal Issuer", "Investment Grade Issuer", "Federal Agency", "US Depository Institution"],
    assets: ["US Government", "Municipal Bond", "Investment Grade Corporate", "Agency", "Cash & Equivalents"],
    minimums: [1000, 2000, 5000, 10000], fees: [null], risks: ["Conservative", "Moderate"], objectives: ["Income", "Capital preservation", "Tax-exempt income"],
  },
  Alternatives: {
    types: ["Private credit", "Private equity", "Hedge fund", "Private infrastructure", "Private real estate"],
    names: ["Private Credit Opportunities", "Growth Equity Partners", "Global Macro Opportunities", "Infrastructure Transition Fund", "Real Estate Income Partners"],
    managers: ["Illustrative Global Partners", "Alternative Credit Management", "Private Markets Group", "Global Infrastructure Partners"],
    assets: ["Private Credit", "Private Equity", "Hedge Funds", "Private Infrastructure", "Private Real Estate"],
    minimums: [25000, 100000, 250000, 1000000], fees: [1.0, 1.25, 1.5, 1.75], risks: ["High"], objectives: ["Diversifying return", "Growth and income", "Current income"],
  },
  Structured: {
    types: ["Buffered return note", "Contingent income note", "Market-linked note", "Auto-callable note"],
    names: ["S&P 500 Buffered Return Note", "Nasdaq-100 Contingent Income Note", "Russell 2000 Market-Linked Note", "Global Equity Auto-Callable"],
    managers: ["UPS AG", "Global Bank Issuer", "US Bank Issuer"],
    assets: ["Structured Investments"],
    minimums: [1000, 10000, 25000], fees: [0.5, 0.75, 1.0], risks: ["High"], objectives: ["Buffered growth", "Enhanced income", "Market participation"],
  },
  "Managed Options": {
    types: ["Managed options strategy"],
    names: ["US Equity Covered Call Overlay", "Dynamic Equity Buffer", "Index Put Protection", "Tax-Aware Option Income"],
    managers: ["UPS Portfolio Advisory Group", "Cboe Vest", "Gateway Investment Advisers"],
    assets: ["Options Overlay"],
    minimums: [250000, 500000, 1000000], fees: [0.35, 0.45, 0.65], risks: ["Moderate", "High"], objectives: ["Enhanced income", "Downside management"],
  },
  Annuities: {
    types: ["Fixed annuity", "Fixed indexed annuity", "Registered index-linked annuity", "Variable annuity"],
    names: ["Secure Term Choice", "Index Growth Select", "Market Link Select", "Lifetime Income Builder"],
    managers: ["Illustrative Life Insurance Co.", "National Insurance Carrier", "Premier Life & Annuity"],
    assets: ["Annuity"],
    minimums: [5000, 10000, 25000], fees: [0, 0.75, 1.1], risks: ["Conservative", "Moderate"], objectives: ["Guaranteed accumulation", "Retirement income", "Buffered market growth"],
  },
  "Precious Metals": {
    types: ["Allocated physical metal", "Unallocated metal account"],
    names: ["Allocated Gold Bullion", "Allocated Silver Bullion", "Platinum Bullion Account", "Palladium Bullion Account"],
    managers: ["UPS Precious Metals Desk"],
    assets: ["Gold", "Silver", "Platinum", "Palladium"],
    minimums: [5000, 10000, 25000], fees: [0.35, 0.45, 0.55], risks: ["Moderate", "High"], objectives: ["Diversification", "Inflation sensitivity"],
  },
};

const allFlagNames = Object.keys(FLAG_DEFINITIONS);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function hash(input) {
  let result = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function slugCategory(category) {
  return category.toLowerCase().replaceAll(" ", "-");
}

function categoryFromSlug(slug) {
  return CATEGORY_ORDER.find((category) => category !== "All" && slugCategory(category) === slug) || null;
}

function abbreviate(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

export function parseNaturalLanguage(query) {
  const q = query.toLowerCase();
  const interpreted = [];
  const filters = {};
  if (/municipal|muni/.test(q)) { filters.category = "Fixed Income"; interpreted.push("Municipal bonds"); }
  else if (/\bsmas?\b|separately managed/.test(q)) { filters.category = "SMAs"; interpreted.push("SMAs"); }
  else if (/\betfs?\b/.test(q)) { filters.category = "ETFs"; interpreted.push("ETFs"); }
  else if (/mutual fund|\bfund\b/.test(q)) { filters.category = "Mutual Funds"; interpreted.push("Mutual funds"); }
  else if (/fixed income|\bbonds?\b/.test(q)) { filters.category = "Fixed Income"; interpreted.push("Fixed income"); }
  else if (/private credit|private equity|hedge|alternative/.test(q)) { filters.category = "Alternatives"; interpreted.push("Alternatives"); }
  else if (/structured|buffered note|contingent/.test(q)) { filters.category = "Structured"; interpreted.push("Structured solutions"); }
  else if (/managed option|covered call|options strategy/.test(q)) { filters.category = "Managed Options"; interpreted.push("Managed options"); }
  else if (/annuit(y|ies)/.test(q)) { filters.category = "Annuities"; interpreted.push("Annuities"); }
  else if (/precious metal|\bgold\b|\bsilver\b/.test(q)) { filters.category = "Precious Metals"; interpreted.push("Precious metals"); }
  else if (/stock|equity|equities/.test(q)) { filters.category = "Equities"; interpreted.push("Equities"); }

  const flags = [];
  if (/sustainab|impact|esg/.test(q)) { flags.push("Sustainable"); interpreted.push("Sustainable"); }
  if (/tax[- ]aware|tax efficient|tax managed|tax-exempt/.test(q)) { flags.push("Tax-Aware"); interpreted.push("Tax-aware"); }
  if (/direct index/.test(q)) { flags.push("Direct Indexing"); interpreted.push("Direct indexing"); }
  if (/model (delivery|enabled)/.test(q)) { flags.push("Model Enabled"); interpreted.push("Model enabled"); }
  if (/cio|house view/.test(q)) { flags.push("CIO House View"); interpreted.push("CIO house view"); }
  if (flags.length) filters.flags = flags;

  if (/conservative|low risk/.test(q)) { filters.risks = ["Conservative"]; interpreted.push("Conservative risk"); }
  else if (/moderate/.test(q)) { filters.risks = ["Moderate"]; interpreted.push("Moderate risk"); }
  else if (/aggressive|high risk/.test(q)) { filters.risks = ["High"]; interpreted.push("High risk"); }

  const bps = q.match(/(?:under|below|less than)\s+(\d+)\s*bps?/);
  if (bps) { filters.maxFee = Number(bps[1]) / 100; interpreted.push(`Fee ≤ ${bps[1]} bps`); }
  const percent = q.match(/(?:under|below|less than)\s+(\d+(?:\.\d+)?)\s*%/);
  if (percent && !bps) { filters.maxFee = Number(percent[1]); interpreted.push(`Fee ≤ ${percent[1]}%`); }
  if (/new york|\bny\b/.test(q)) { filters.location = "New York"; interpreted.push("New York"); }
  return { filters, interpreted };
}

const QUERY_STOP_WORDS = new Set([
  "with", "under", "below", "less", "than", "client", "moderate", "conservative", "aggressive", "high", "low", "risk", "new", "york",
  "income", "investment", "investments", "looking", "need", "solution", "solutions", "aligned", "house", "view", "cio", "sustainable", "impact", "esg",
  "tax", "aware", "efficient", "managed", "direct", "indexing", "sma", "smas", "separately", "account", "etf", "etfs", "mutual", "fund", "funds",
  "fixed", "bond", "bonds", "municipal", "muni", "equity", "equities", "stock", "stocks", "alternative", "alternatives", "structured", "annuity",
  "annuities", "precious", "metal", "metals", "managed", "options", "bps", "building", "blocks", "the", "and", "for", "from", "that", "this",
]);

function queryTokens(query) {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length > 1 && !QUERY_STOP_WORDS.has(token) && !/^\d+(?:\.\d+)?$/.test(token));
}

function matches(item, options) {
  if (options.category && options.category !== "All" && item.category !== options.category) return false;
  if (options.risks?.length && !options.risks.includes(item.risk)) return false;
  if (options.statuses?.length && !options.statuses.includes(item.status)) return false;
  if (options.flags?.length && !options.flags.every((flag) => item.flags.includes(flag))) return false;
  if (Number.isFinite(options.maxMinimum) && item.minimum > options.maxMinimum) return false;
  if (Number.isFinite(options.maxFee) && item.fee !== null && item.fee > options.maxFee) return false;
  if (options.tokens.length && !options.tokens.some((token) => item._search.includes(token))) return false;
  return true;
}

function makeSynthetic(category, index) {
  const pool = pools[category];
  const seed = hash(`${category}-${index}`);
  const type = pick(pool.types, seed, 1);
  let name = pick(pool.names, seed, 2);
  if (category === "Fixed Income") {
    const coupon = (2.75 + (seed % 275) / 100).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    const year = 2027 + (seed % 28);
    name = `${name} ${coupon}% ${String((seed % 12) + 1).padStart(2, "0")}/15/${year}`;
  } else {
    name = `${name} ${String.fromCharCode(65 + (seed % 18))}`;
  }
  const applicableFlags = allFlagNames.filter((flag) => {
    if (["Direct Indexing", "SMA Select"].includes(flag)) return category === "SMAs";
    if (flag === "Model Enabled") return ["SMAs", "Managed Options"].includes(category);
    if (flag === "Tax-Aware") return ["Mutual Funds", "ETFs", "SMAs", "Fixed Income", "Managed Options"].includes(category);
    return true;
  });
  const flags = [];
  if (seed % 5 === 0) flags.push(pick(applicableFlags, seed, 4));
  if (seed % 7 === 0) flags.push("Research Updated");
  if (seed % 11 === 0) flags.push("CIO House View");
  if (seed % 13 === 0) flags.push("Sustainable");
  if (category === "SMAs" && seed % 3 === 0) flags.push("Tax-Aware");
  if (category === "SMAs" && seed % 6 === 0) flags.push("Direct Indexing");
  if (category === "SMAs" && seed % 4 === 0) flags.push("SMA Select");
  if ((category === "SMAs" || category === "Managed Options") && seed % 5 === 0) flags.push("Model Enabled");
  let risk = pick(pool.risks, seed, 5);
  const status = seed % 17 === 0 ? "Limited" : seed % 23 === 0 ? "New" : "Available";
  if (status === "New" && !flags.includes("New to Shelf")) flags.push("New to Shelf");
  if (status === "Limited" && !flags.includes("Limited Capacity")) flags.push("Limited Capacity");
  const minimum = pick(pool.minimums, seed, 6);
  const fee = pick(pool.fees, seed, 7);
  const perf3 = category === "Structured" || category === "Annuities" || category === "Fixed Income" ? null : Math.round(((seed % 2100) / 100 - 2.5) * 10) / 10;
  const symbolPrefix = category.replace(/[^A-Z]/g, "").slice(0, 2) || category.slice(0, 2).toUpperCase();
  const id = `syn-${slugCategory(category)}-${index}`;
  const manager = pick(pool.managers, seed, 8);
  let assetClass = pick(pool.assets, seed, 9);
  let objective = pick(pool.objectives, seed, 10);
  if (category === "SMAs" && flags.includes("Direct Indexing")) {
    name = `Tax-Managed Large Cap ${String.fromCharCode(65 + (seed % 18))}`;
    assetClass = "US Large Blend";
    objective = "Tax-aware index exposure";
    risk = "Moderate";
  } else if (category === "SMAs" && name.includes("Municipal")) {
    assetClass = "Municipal Bond";
    objective = "Tax-exempt income";
    risk = "Conservative";
  } else if (category === "SMAs" && name.includes("Small Cap")) {
    assetClass = "US Small Cap Equity";
    objective = "Capital appreciation";
  } else if (category === "SMAs") {
    assetClass = name.includes("Global") ? "Global Equity" : "US Large Blend";
    objective = name.includes("Dividend") ? "Income" : "Core equity";
  }
  return base({
    id,
    category,
    type,
    name,
    symbol: `${symbolPrefix}${String(seed % 9999).padStart(4, "0")}`,
    manager,
    assetClass,
    objective,
    risk,
    minimum,
    fee,
    perf1: Math.round(((seed % 1650) / 100 + 1.5) * 10) / 10,
    perf3,
    aum: category === "Equities" ? `${money.format(2 + (seed % 900))}B market cap` : `${money.format(50 + (seed % 9900))}M`,
    flags: [...new Set(flags)],
    status,
    description: `Illustrative ${objective.toLowerCase()} solution in ${assetClass.toLowerCase()}, managed by ${manager}. Designed to demonstrate realistic shelf data and governed product metadata.`,
    benchmark: pick(["S&P 500", "Russell 1000", "Bloomberg US Aggregate", "Custom Strategy Benchmark"], seed, 11),
    inception: String(1995 + (seed % 31)),
    liquidity: category === "Alternatives" ? "Quarterly or less frequent" : category === "Fixed Income" ? "Secondary market" : "Daily",
    identifier: `${symbolPrefix}${String(seed).slice(0, 8)}`,
  });
}

function optionsFromInput(input = {}) {
  const fail = (message) => { throw new RangeError(message); };
  if (typeof input.q === "string" && input.q.length > 160) fail("Search query must be 160 characters or fewer");
  if (input.category && !CATEGORY_ORDER.includes(input.category)) fail("Unknown investment category");
  if (input.sort && !SORTS.includes(input.sort)) fail("Unknown sort option");
  for (const flag of input.flags || []) if (!allFlagNames.includes(flag)) fail(`Unknown flag: ${flag}`);
  for (const risk of input.risks || []) if (!RISKS.includes(risk)) fail(`Unknown risk: ${risk}`);
  for (const status of input.statuses || []) if (!STATUSES.includes(status)) fail(`Unknown status: ${status}`);
  if (input.cursor !== undefined && (!Number.isInteger(Number(input.cursor)) || Number(input.cursor) < 0)) fail("Cursor must be a non-negative integer");
  if (input.pageSize !== undefined && (!Number.isInteger(Number(input.pageSize)) || Number(input.pageSize) < 1 || Number(input.pageSize) > 25)) fail("Page size must be between 1 and 25");
  if (input.maxMinimum !== undefined && (!Number.isFinite(input.maxMinimum) || input.maxMinimum < 0)) fail("Maximum minimum must be a non-negative number");
  if (input.maxFee !== undefined && (!Number.isFinite(input.maxFee) || input.maxFee < 0 || input.maxFee > 10)) fail("Maximum fee must be between 0 and 10");
  const parsed = parseNaturalLanguage(input.q || "");
  const mergeArray = (direct, inferred) => direct?.length ? direct : inferred;
  return {
    q: input.q?.trim() || "",
    category: input.category && input.category !== "All" ? input.category : parsed.filters.category || "All",
    flags: mergeArray(input.flags, parsed.filters.flags) || [],
    risks: mergeArray(input.risks, parsed.filters.risks) || [],
    statuses: input.statuses || [],
    maxMinimum: Number.isFinite(input.maxMinimum) ? input.maxMinimum : undefined,
    maxFee: Number.isFinite(input.maxFee) ? input.maxFee : parsed.filters.maxFee,
    location: input.location || parsed.filters.location,
    sort: input.sort || "relevance",
    cursor: Math.max(0, Number(input.cursor) || 0),
    pageSize: Math.min(25, Math.max(1, Number(input.pageSize) || 25)),
    interpreted: parsed.interpreted,
    tokens: queryTokens(input.q || ""),
  };
}

let searchIndex;

function searchable(item, ordinal) {
  return {
    ...item,
    _ordinal: ordinal,
    _search: [item.name, item.symbol, item.identifier, item.manager, item.type, item.assetClass, item.objective, ...item.flags].join(" ").toLowerCase(),
  };
}

export function getSearchIndex() {
  if (searchIndex) return searchIndex;
  const records = CURATED.map((item, ordinal) => searchable(item, ordinal));
  for (const category of CATEGORY_ORDER.slice(1)) {
    const curatedCount = CURATED.filter((item) => item.category === category).length;
    const target = CATEGORY_COUNTS[category] - curatedCount;
    for (let index = 0; index < target; index += 1) records.push(searchable(makeSynthetic(category, index), records.length));
  }
  searchIndex = records;
  return searchIndex;
}

function relevanceScore(item, options) {
  if (!options.tokens.length) return 0;
  const q = options.q.toLowerCase();
  if (item.symbol.toLowerCase() === q || item.identifier.toLowerCase() === q) return 1000;
  if (item.name.toLowerCase() === q) return 900;
  if (item.name.toLowerCase().startsWith(q)) return 700;
  return options.tokens.reduce((score, token) => score + (item.name.toLowerCase().includes(token) ? 40 : item.symbol.toLowerCase().includes(token) ? 35 : 10), 0);
}

function sortItems(items, options) {
  const stable = (difference, a, b) => difference || a._ordinal - b._ordinal;
  if (options.sort === "fee") return items.sort((a, b) => stable((a.fee ?? Infinity) - (b.fee ?? Infinity), a, b));
  if (options.sort === "performance") return items.sort((a, b) => stable((b.perf3 ?? -Infinity) - (a.perf3 ?? -Infinity), a, b));
  if (options.sort === "minimum") return items.sort((a, b) => stable(a.minimum - b.minimum, a, b));
  if (options.tokens.length) return items.sort((a, b) => stable(relevanceScore(b, options) - relevanceScore(a, options), a, b));
  return items;
}

function buildFacets(items) {
  const facets = {
    categories: Object.fromEntries(CATEGORY_ORDER.slice(1).map((name) => [name, 0])),
    flags: Object.fromEntries(allFlagNames.map((name) => [name, 0])),
    risks: Object.fromEntries(RISKS.map((name) => [name, 0])),
    statuses: Object.fromEntries(STATUSES.map((name) => [name, 0])),
  };
  for (const item of items) {
    facets.categories[item.category] += 1;
    facets.risks[item.risk] += 1;
    facets.statuses[item.status] += 1;
    for (const flag of item.flags) facets.flags[flag] += 1;
  }
  return facets;
}

function publicItem(item) {
  const { _ordinal, _search, ...result } = item;
  return result;
}

export function searchCatalog(input = {}) {
  const started = performance.now();
  const options = optionsFromInput(input);
  const matched = getSearchIndex().filter((item) => matches(item, options));
  const facets = buildFacets(matched);
  sortItems(matched, options);
  const start = Math.min(options.cursor, matched.length);
  const items = matched.slice(start, start + options.pageSize).map(publicItem);
  const elapsed = Math.max(1, Math.round(performance.now() - started));
  return {
    universe: UNIVERSE_SIZE,
    catalogVersion: CATALOG_VERSION,
    total: matched.length,
    tookMs: elapsed,
    cursor: start,
    nextCursor: start + items.length < matched.length ? start + items.length : null,
    previousCursor: start > 0 ? Math.max(0, start - options.pageSize) : null,
    pageSize: options.pageSize,
    items,
    facets,
    interpreted: options.interpreted,
    appliedCategory: options.category,
  };
}

export function getInvestmentDetail(id) {
  let item = CURATED.find((record) => record.id === id);
  if (!item && id.startsWith("syn-")) {
    const parts = id.split("-");
    const indexPosition = parts.findIndex((part) => /^\d+$/.test(part));
    const slug = parts.slice(1, indexPosition).join("-");
    const category = categoryFromSlug(slug);
    const index = Number(parts[indexPosition]);
    const curatedCount = category ? CURATED.filter((record) => record.category === category).length : 0;
    const valid = category && Number.isInteger(index) && index >= 0 && index < CATEGORY_COUNTS[category] - curatedCount;
    item = valid ? makeSynthetic(category, index) : null;
  }
  if (!item) return null;
  const seed = hash(item.id);
  const performanceSeries = Array.from({ length: 18 }, (_, index) => 100 + index * 1.15 + Math.sin((seed % 8) + index / 2) * 3.2 + (seed % 17) / 5);
  return {
    ...item,
    performanceSeries,
    details: {
      "Asset class": item.assetClass,
      Objective: item.objective,
      Benchmark: item.benchmark,
      Liquidity: item.liquidity,
      Inception: item.inception,
      Identifier: item.identifier,
      "Shelf status": item.status,
      "Data effective": item.asOf,
    },
    flagDetails: item.flags.map((flag) => ({ name: flag, ...FLAG_DEFINITIONS[flag], effective: "Aug 2026" })),
    documents: [
      { name: "Product profile", meta: `PDF · Updated ${item.asOf}` },
      { name: "Performance and risk", meta: "PDF · Monthly" },
      { name: "Fees and important disclosures", meta: "PDF · Current" },
    ],
  };
}

export function formatMoney(value) {
  if (value === 0) return "$0";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 ? 1 : 0)}K`;
  return money.format(value);
}

export function monogram(item) {
  return item.symbol?.slice(0, 3) || abbreviate(item.name);
}
