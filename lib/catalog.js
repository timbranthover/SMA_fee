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
  record.brandKey = resolveBrandKey(record);
  return record;
};

export const CURATED = [
  base({ id: "eq-aapl", category: "Equities", type: "Common stock", name: "Apple Inc.", symbol: "AAPL", identifier: "037833100", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "Moderate", minimum: 0, fee: null, perf1: 18.4, perf3: 21.7, aum: "$4.6T market cap", flags: ["CIO House View", "Research Updated"], description: "Global consumer technology company with an integrated hardware, software and services ecosystem.", benchmark: "S&P 500" }),
  base({ id: "eq-msft", category: "Equities", type: "Common stock", name: "Microsoft Corporation", symbol: "MSFT", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "Moderate", minimum: 0, fee: null, perf1: 23.1, perf3: 19.8, aum: "$3.9T market cap", flags: ["CIO House View", "Sustainable"], description: "Global software, cloud infrastructure and productivity platform company.", benchmark: "S&P 500" }),
  base({ id: "eq-nvda", category: "Equities", type: "Common stock", name: "NVIDIA Corporation", symbol: "NVDA", manager: "Information Technology · NASDAQ", assetClass: "US Large Cap Equity", objective: "Growth", risk: "High", minimum: 0, fee: null, perf1: 42.7, perf3: 74.2, aum: "$5.2T market cap", flags: ["CIO House View", "Research Updated"], description: "Accelerated computing company serving data center, gaming and professional visualization markets.", benchmark: "S&P 500" }),
  base({ id: "eq-jpm", category: "Equities", type: "Common stock", name: "JPMorgan Chase & Co.", symbol: "JPM", manager: "Financials · NYSE", assetClass: "US Large Cap Equity", objective: "Core / Income", risk: "Moderate", minimum: 0, fee: null, perf1: 15.5, perf3: 24.9, aum: "$940B market cap", flags: ["Research Updated"], description: "Diversified global financial services firm across consumer, commercial and investment banking.", benchmark: "S&P 500" }),
  base({ id: "eq-nee", category: "Equities", type: "Common stock", name: "NextEra Energy, Inc.", symbol: "NEE", manager: "Utilities · NYSE", assetClass: "US Large Cap Equity", objective: "Income", risk: "Moderate", minimum: 0, fee: null, perf1: 9.2, perf3: 3.8, aum: "$176B market cap", flags: ["Sustainable"], description: "Electric power and energy infrastructure company with significant renewable generation exposure.", benchmark: "S&P 500" }),

  base({ id: "mf-vfiax", category: "Mutual Funds", type: "Mutual fund · Admiral", name: "Vanguard 500 Index Fund Admiral Shares", symbol: "VFIAX", manager: "Vanguard", assetClass: "US Large Blend", objective: "Core equity", risk: "Moderate", minimum: 3000, fee: 0.04, perf1: 17.8, perf3: 19.3, aum: "$1.5T", flags: ["CIO Select", "Research Updated"], description: "Passively managed exposure designed to track the investment performance of the S&P 500 Index.", benchmark: "S&P 500", inception: "2000" }),
  base({ id: "mf-fcntx", category: "Mutual Funds", type: "Mutual fund", name: "Fidelity Contrafund", symbol: "FCNTX", manager: "Fidelity Investments", assetClass: "US Large Growth", objective: "Capital appreciation", risk: "Moderate", minimum: 0, fee: 0.68, perf1: 21.1, perf3: 25.0, aum: "$170B", flags: ["Research Updated"], description: "Actively managed large-cap growth strategy focused on companies believed to have underappreciated value.", benchmark: "Russell 1000 Growth", inception: "1967" }),
  base({ id: "mf-pimix", category: "Mutual Funds", type: "Mutual fund · Institutional", name: "PIMCO Income Fund Institutional", symbol: "PIMIX", manager: "PIMCO", assetClass: "Multisector Bond", objective: "Income", risk: "Moderate", minimum: 1000000, fee: 0.51, perf1: 7.2, perf3: 6.4, aum: "$186B", flags: ["CIO House View"], description: "Flexible global multisector fixed income strategy seeking current income with prudent long-term capital appreciation.", benchmark: "Bloomberg US Aggregate", inception: "2007" }),
  base({ id: "mf-parnassus", category: "Mutual Funds", type: "Mutual fund", name: "Parnassus Core Equity Fund Investor", symbol: "PRBLX", manager: "Parnassus Investments", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 2000, fee: 0.82, perf1: 13.4, perf3: 14.9, aum: "$31B", flags: ["Sustainable"], description: "Concentrated core equity portfolio integrating environmental, social and governance research.", benchmark: "S&P 500", inception: "1992" }),

  base({ id: "etf-ivv", category: "ETFs", type: "ETF", name: "iShares Core S&P 500 ETF", symbol: "IVV", manager: "BlackRock", assetClass: "US Large Blend", objective: "Core equity", risk: "Moderate", minimum: 0, fee: 0.03, perf1: 17.7, perf3: 19.2, aum: "$715B", flags: ["CIO House View", "CIO Select", "Research Updated"], description: "Low-cost exposure to large-cap US equities represented by the S&P 500 Index.", benchmark: "S&P 500", inception: "2000" }),
  base({ id: "etf-mub", category: "ETFs", type: "ETF", name: "iShares National Muni Bond ETF", symbol: "MUB", manager: "BlackRock", assetClass: "Municipal Bond", objective: "Tax-exempt income", risk: "Conservative", minimum: 0, fee: 0.05, perf1: 4.8, perf3: 2.9, aum: "$46B", flags: ["Tax-Aware", "CIO House View"], description: "Broad investment-grade US municipal bond exposure designed to provide federally tax-exempt income.", benchmark: "ICE AMT-Free US National Muni", inception: "2007" }),
  base({ id: "etf-susl", category: "ETFs", type: "ETF", name: "iShares ESG MSCI USA Leaders ETF", symbol: "SUSL", manager: "BlackRock", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 0, fee: 0.10, perf1: 16.5, perf3: 18.0, aum: "$5.1B", flags: ["Sustainable"], description: "US equity exposure emphasizing companies with favorable environmental, social and governance characteristics.", benchmark: "MSCI USA Extended ESG Leaders", inception: "2019" }),
  base({ id: "etf-schd", category: "ETFs", type: "ETF", name: "Schwab US Dividend Equity ETF", symbol: "SCHD", manager: "Charles Schwab Investment Management", assetClass: "US Large Value", objective: "Dividend income", risk: "Moderate", minimum: 0, fee: 0.06, perf1: 12.1, perf3: 10.8, aum: "$76B", flags: ["Research Updated"], description: "Rules-based portfolio of US companies selected for dividend quality and financial strength.", benchmark: "Dow Jones US Dividend 100", inception: "2011" }),

  base({ id: "sma-northstar", category: "SMAs", type: "Separately managed account", name: "US Equity Focus Growth", symbol: "NX1A", manager: "Northstar Capital Management", assetClass: "US Large Growth", objective: "Capital appreciation", risk: "Moderate", minimum: 100000, fee: 0.41, perf1: 22.8, perf3: 20.1, aum: "$4.8B strategy assets", flags: ["Model Delivered", "CIO Select", "Research Updated"], description: "High-conviction US equity strategy emphasizing durable growth, balance-sheet quality and long-term compounding.", benchmark: "Russell 1000 Growth", inception: "2008", liquidity: "Daily" }),
  base({ id: "sma-aperio", category: "SMAs", type: "Separately managed account", name: "Tax-Managed US Large Cap Index", symbol: "APLC", manager: "Aperio Group", assetClass: "US Large Blend", objective: "Tax-aware index exposure", risk: "Moderate", minimum: 250000, fee: 0.35, perf1: 17.1, perf3: 18.5, aum: "$18.6B strategy assets", flags: ["Tax-Aware", "Direct Indexing", "Sustainable"], description: "Customizable direct-indexing strategy seeking benchmark-like exposure with ongoing tax-loss harvesting.", benchmark: "S&P 500", inception: "2004", liquidity: "Daily" }),
  base({ id: "sma-nuveen-muni", category: "SMAs", type: "Separately managed account", name: "Intermediate Municipal Bond", symbol: "NUIM", manager: "Nuveen Asset Management", assetClass: "Municipal Bond", objective: "Tax-exempt income", risk: "Conservative", minimum: 250000, fee: 0.28, perf1: 5.2, perf3: 3.4, aum: "$12.2B strategy assets", flags: ["Tax-Aware", "CIO Select", "CIO House View"], description: "Investment-grade municipal portfolio focused on income, capital preservation and security-level credit research.", benchmark: "Bloomberg 1-15 Year Municipal", inception: "1998", liquidity: "Daily" }),
  base({ id: "sma-ups-climate", category: "SMAs", type: "Separately managed account", name: "Climate Aware US Equity", symbol: "UPCA", manager: "UPS Asset Management", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 100000, fee: 0.32, perf1: 16.8, perf3: 17.6, aum: "$2.9B strategy assets", flags: ["Sustainable", "Model Delivered", "New to Shelf"], description: "Systematic US equity strategy integrating climate-transition signals while maintaining broad market characteristics.", benchmark: "Russell 1000", inception: "2022", liquidity: "Daily" }),

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
  base({ id: "mos-buffer", category: "Managed Options", type: "Managed options strategy", name: "Dynamic Equity Buffer Strategy", symbol: "DBUF", manager: "UPS Portfolio Advisory Group", assetClass: "Options Overlay", objective: "Downside management", risk: "Moderate", minimum: 1000000, fee: 0.55, perf1: 12.6, perf3: 11.4, aum: "$2.1B program assets", flags: ["Model Delivered"], description: "Rules-based index option strategy seeking defined downside mitigation with partial upside participation.", benchmark: "S&P 500", inception: "2019", liquidity: "Daily" }),

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
const normalizedTextCache = new Map();
const curatedOrdinalById = new Map(CURATED.map((item, index) => [item.id, index]));
const curatedByCategory = new Map(CATEGORY_ORDER.slice(1).map((category) => [category, CURATED.filter((item) => item.category === category)]));
const syntheticOffsetByCategory = new Map();
let syntheticOffset = CURATED.length;
for (const category of CATEGORY_ORDER.slice(1)) {
  syntheticOffsetByCategory.set(category, syntheticOffset);
  syntheticOffset += CATEGORY_COUNTS[category] - curatedByCategory.get(category).length;
}

const DEFAULT_FACETS = Object.freeze({
  categories: Object.freeze({ ...Object.fromEntries(CATEGORY_ORDER.slice(1).map((name) => [name, CATEGORY_COUNTS[name]])) }),
  flags: Object.freeze({
    "CIO House View": 14842,
    Sustainable: 13160,
    "CIO Select": 1443,
    "Model Delivered": 257,
    "Tax-Aware": 3587,
    "Direct Indexing": 163,
    "New to Shelf": 8549,
    "Limited Capacity": 10734,
    "Research Updated": 26704,
  }),
  risks: Object.freeze({ Conservative: 49009, Moderate: 60743, High: 20676 }),
  statuses: Object.freeze({ Available: 117349, New: 5376, Limited: 7703 }),
});

const CATEGORY_FACET_COUNTS = Object.freeze({
  Equities: { flags: [2060, 1753, 0, 0, 0, 0, 899, 1344, 7044], risks: [0, 11294, 11290], statuses: [20341, 899, 1344] },
  "Mutual Funds": { flags: [399, 341, 903, 0, 108, 0, 225, 269, 589], risks: [1103, 1124, 1111], statuses: [3016, 136, 186] },
  ETFs: { flags: [141, 104, 306, 0, 34, 0, 75, 87, 193], risks: [383, 362, 372], statuses: [1008, 48, 61] },
  SMAs: { flags: [93, 85, 234, 172, 288, 163, 55, 73, 137], risks: [347, 397, 116], statuses: [774, 36, 50] },
  "Fixed Income": { flags: [11310, 10200, 0, 0, 3142, 0, 6910, 8421, 15996], risks: [46786, 46785, 0], statuses: [84157, 3884, 5530] },
  Alternatives: { flags: [41, 34, 0, 0, 0, 0, 19, 31, 150], risks: [0, 0, 498], statuses: [448, 19, 31] },
  Structured: { flags: [632, 521, 0, 0, 0, 0, 299, 408, 2164], risks: [0, 0, 6900], statuses: [6193, 299, 408] },
  "Managed Options": { flags: [54, 38, 0, 85, 15, 0, 33, 34, 73], risks: [0, 211, 209], statuses: [373, 21, 26] },
  Annuities: { flags: [75, 61, 0, 0, 0, 0, 24, 41, 250], risks: [390, 390, 0], statuses: [715, 24, 41] },
  "Precious Metals": { flags: [37, 23, 0, 0, 0, 0, 10, 26, 108], risks: [0, 180, 180], statuses: [324, 10, 26] },
});

function categoryFacets(category) {
  const counts = CATEGORY_FACET_COUNTS[category];
  return {
    categories: Object.fromEntries(CATEGORY_ORDER.slice(1).map((name) => [name, name === category ? CATEGORY_COUNTS[name] : 0])),
    flags: Object.fromEntries(allFlagNames.map((name, index) => [name, counts.flags[index]])),
    risks: Object.fromEntries(RISKS.map((name, index) => [name, counts.risks[index]])),
    statuses: Object.fromEntries(STATUSES.map((name, index) => [name, counts.statuses[index]])),
  };
}

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
  if (/model (deliver(?:y|ed)|enabled)/.test(q)) { flags.push("Model Delivered"); interpreted.push("Model delivered"); }
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

const SEARCH_FIELDS = [
  { key: "symbol", label: "ticker", weight: 700 },
  { key: "identifier", label: "identifier", weight: 680 },
  { key: "name", label: "product name", weight: 520 },
  { key: "manager", label: "manager", weight: 430 },
  { key: "benchmark", label: "benchmark", weight: 250 },
  { key: "assetClass", label: "asset class", weight: 210 },
  { key: "objective", label: "objective", weight: 180 },
  { key: "type", label: "vehicle", weight: 150 },
  { key: "flags", label: "UPS designation", weight: 130 },
];

function normalizeSearchText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/s\s*(?:&|and)\s*p\s*[- ]?\s*500/g, "sp500")
    .replace(/nasdaq\s*[- ]?\s*100/g, "nasdaq100")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeRepeatedSearchText(value = "") {
  const key = String(value);
  if (!normalizedTextCache.has(key)) normalizedTextCache.set(key, normalizeSearchText(key));
  return normalizedTextCache.get(key);
}

const SYNTHETIC_SEARCH_WORDS = new Map();
for (const [category, pool] of Object.entries(pools)) {
  const words = new Set();
  for (const values of [pool.types, pool.names, pool.managers, pool.assets, pool.objectives]) {
    for (const value of values) normalizeSearchText(value).split(" ").filter(Boolean).forEach((word) => words.add(word));
  }
  for (const value of [...allFlagNames, "S&P 500", "Russell 1000", "Bloomberg US Aggregate", "Custom Strategy Benchmark"]) {
    normalizeSearchText(value).split(" ").filter(Boolean).forEach((word) => words.add(word));
  }
  SYNTHETIC_SEARCH_WORDS.set(category, words);
}

function normalizeIdentifier(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function identifierCandidate(value = "") {
  const raw = String(value).trim();
  const identifierShaped = /^[a-z0-9][a-z0-9.-]{1,17}$/i.test(raw) || /^\d[\d -]{5,20}$/.test(raw);
  return identifierShaped ? normalizeIdentifier(raw) : "";
}

function queryTokens(query) {
  return [...new Set(normalizeSearchText(query).split(/\s+/).filter((token) => token.length > 1 && !QUERY_STOP_WORDS.has(token) && (!/^\d+(?:\.\d+)?$/.test(token) || token.length >= 6)))];
}

function matchesFilters(item, options) {
  if (options.category && options.category !== "All" && item.category !== options.category) return false;
  if (options.risks?.length && !options.risks.includes(item.risk)) return false;
  if (options.statuses?.length && !options.statuses.includes(item.status)) return false;
  if (options.flags?.length && !options.flags.every((flag) => item.flags.includes(flag))) return false;
  if (Number.isFinite(options.maxMinimum) && item.minimum > options.maxMinimum) return false;
  if (Number.isFinite(options.maxFee) && item.fee !== null && item.fee > options.maxFee) return false;
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
    if (flag === "Direct Indexing") return category === "SMAs";
    if (flag === "CIO Select") return ["Mutual Funds", "ETFs", "SMAs"].includes(category);
    if (flag === "Model Delivered") return ["SMAs", "Managed Options"].includes(category);
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
  if (["Mutual Funds", "ETFs", "SMAs"].includes(category) && seed % 4 === 0) flags.push("CIO Select");
  if ((category === "SMAs" || category === "Managed Options") && seed % 5 === 0) flags.push("Model Delivered");
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
    normalizedQuery: normalizeSearchText(input.q || ""),
    identifierQuery: identifierCandidate(input.q || ""),
  };
}

const curatedByInstrumentKey = new Map();
for (const item of CURATED) {
  for (const [value, reason, score] of [[item.identifier, "Exact identifier match", 1500], [item.symbol, "Exact ticker match", 1450]]) {
    const key = normalizeIdentifier(value);
    if (!key) continue;
    const matches = curatedByInstrumentKey.get(key) || [];
    if (!matches.some((entry) => entry.item.id === item.id)) matches.push({ item, match: { score, matchReason: reason, matchMode: "strict" } });
    curatedByInstrumentKey.set(key, matches);
  }
}

const searchIndexes = new Map();
let searchIndex;
let curatedSearchRecords;

function searchable(item, ordinal, clone = false) {
  const record = clone ? { ...item } : item;
  record._ordinal = ordinal;
  record._searchFields = SEARCH_FIELDS.map(({ key }, index) => {
    const value = key === "flags" ? item.flags.join(" ") : item[key];
    return index < 2 ? normalizeSearchText(value) : normalizeRepeatedSearchText(value);
  });
  record._symbolKey = normalizeIdentifier(item.symbol);
  record._identifierKey = normalizeIdentifier(item.identifier);
  return record;
}

function getCategorySearchIndex(category) {
  if (searchIndexes.has(category)) return searchIndexes.get(category);
  const curated = curatedByCategory.get(category).map((item) => searchable(item, curatedOrdinalById.get(item.id), true));
  const records = [...curated];
  const target = CATEGORY_COUNTS[category] - curated.length;
  const categoryOffset = syntheticOffsetByCategory.get(category);
  for (let index = 0; index < target; index += 1) records.push(searchable(makeSynthetic(category, index), categoryOffset + index));
  searchIndexes.set(category, records);
  return records;
}

export function getSearchIndex(category = "All") {
  if (category !== "All") return getCategorySearchIndex(category);
  if (searchIndex) return searchIndex;
  const categoryRecords = new Map(CATEGORY_ORDER.slice(1).map((name) => [name, getCategorySearchIndex(name)]));
  const curatedRecords = CURATED.map((item) => categoryRecords.get(item.category).find((record) => record.id === item.id));
  const records = [...curatedRecords];
  for (const name of CATEGORY_ORDER.slice(1)) {
    const curatedCount = curatedByCategory.get(name).length;
    records.push(...categoryRecords.get(name).slice(curatedCount));
  }
  searchIndex = records;
  return searchIndex;
}

function getCuratedSearchRecords() {
  if (!curatedSearchRecords) curatedSearchRecords = CURATED.map((item, ordinal) => searchable(item, ordinal, true));
  return curatedSearchRecords;
}

function getCandidateSearchIndex(categories) {
  const records = [...getCuratedSearchRecords()];
  for (const category of categories) {
    const curatedCount = curatedByCategory.get(category).length;
    records.push(...getCategorySearchIndex(category).slice(curatedCount));
  }
  return records;
}

function fieldTokenMatch(item, token) {
  let best = null;
  for (let index = 0; index < SEARCH_FIELDS.length; index += 1) {
    const field = SEARCH_FIELDS[index];
    const text = item._searchFields[index];
    const wholeWord = (` ${text} `).includes(` ${token} `);
    const wordPrefix = token.length >= 3 && (` ${text}`).includes(` ${token}`);
    if (!wholeWord && !wordPrefix) continue;
    const score = field.weight + (wholeWord ? 90 : 45);
    if (!best || score > best.score) best = { field, score };
  }
  return best;
}

function exactQueryMatch(item, options) {
  const query = options.normalizedQuery;
  if (!query) return null;
  const [symbol, identifier, name, manager] = item._searchFields;
  const identifierLike = query.length >= 8 && /\d/.test(query);
  if (identifierLike && identifier === query) return { score: 1500, matchReason: "Exact identifier match", matchMode: "strict" };
  if (symbol === query) return { score: 1450, matchReason: "Exact ticker match", matchMode: "strict" };
  if (identifier === query) return { score: 1400, matchReason: "Exact identifier match", matchMode: "strict" };
  if (name === query) return { score: 1250, matchReason: "Exact product name match", matchMode: "strict" };
  if (manager === query) return { score: 1150, matchReason: "Exact manager match", matchMode: "strict" };
  return null;
}

function exactInstrumentMatch(item, options) {
  if (!options.identifierQuery) return null;
  if (item._identifierKey === options.identifierQuery) return { score: 1500, matchReason: "Exact identifier match", matchMode: "strict" };
  if (item._symbolKey === options.identifierQuery) return { score: 1450, matchReason: "Exact ticker match", matchMode: "strict" };
  return null;
}

function strictTextMatch(item, options) {
  if (!options.tokens.length) return { score: 0, matchReason: null, matchMode: "filters" };
  const exact = exactQueryMatch(item, options);
  if (exact) return exact;
  const tokenMatches = options.tokens.map((token) => fieldTokenMatch(item, token));
  if (tokenMatches.some((match) => !match)) return null;
  const labels = [...new Set(tokenMatches.map((match) => match.field.label))];
  let score = tokenMatches.reduce((total, match) => total + match.score, 0);
  for (let index = 2; index < SEARCH_FIELDS.length; index += 1) {
    const text = item._searchFields[index];
    if (text.startsWith(options.normalizedQuery)) score += SEARCH_FIELDS[index].weight + 180;
    else if ((` ${text} `).includes(` ${options.normalizedQuery} `)) score += SEARCH_FIELDS[index].weight + 100;
  }
  const matchReason = labels.length === 1 ? `Matched on ${labels[0]}` : `Matched on ${labels.slice(0, 2).join(" + ")}`;
  return { score, matchReason, matchMode: "strict" };
}

function withinOneEdit(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const differences = [];
    for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) differences.push(index);
    return differences.length === 1 || (differences.length === 2 && differences[1] === differences[0] + 1 && left[differences[0]] === right[differences[1]] && left[differences[1]] === right[differences[0]]);
  }
  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left];
  let shortIndex = 0;
  let longIndex = 0;
  let skipped = false;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) { shortIndex += 1; longIndex += 1; continue; }
    if (skipped) return false;
    skipped = true;
    longIndex += 1;
  }
  return true;
}

function fuzzyTextMatch(item, options) {
  if (!options.tokens.length || options.tokens.some((token) => token.length < 5)) return null;
  const fuzzyFields = [
    { text: item._searchFields[2], label: "product name", weight: 320 },
    { text: item._searchFields[3], label: "manager", weight: 260 },
  ];
  const tokenMatches = options.tokens.map((token) => {
    let best = null;
    for (const field of fuzzyFields) {
      const word = field.text.split(" ").find((candidate) => withinOneEdit(token, candidate));
      if (word && (!best || field.weight > best.weight)) best = field;
    }
    return best;
  });
  if (tokenMatches.some((match) => !match)) return null;
  const labels = [...new Set(tokenMatches.map((match) => match.label))];
  return { score: tokenMatches.reduce((total, match) => total + match.weight, 0), matchReason: `Close ${labels[0]} match`, matchMode: "fuzzy" };
}

function categoryCouldMatch(options, category) {
  const words = [...SYNTHETIC_SEARCH_WORDS.get(category)];
  const strict = options.tokens.every((token) => words.some((word) => word === token || (token.length >= 3 && word.startsWith(token))));
  if (strict) return true;
  if (options.tokens.some((token) => token.length < 5)) return false;
  return options.tokens.every((token) => words.some((word) => withinOneEdit(token, word)));
}

function syntheticCandidateCategories(options) {
  const allowed = options.category === "All" ? CATEGORY_ORDER.slice(1) : [options.category];
  if (!options.tokens.length) return [];
  if (options.identifierQuery && /\d/.test(options.identifierQuery)) return allowed;
  return allowed.filter((category) => categoryCouldMatch(options, category));
}

function sortItems(items, options, matchMetadata) {
  const stable = (difference, a, b) => difference || a._ordinal - b._ordinal;
  if (options.sort === "fee") return items.sort((a, b) => stable((a.fee ?? Infinity) - (b.fee ?? Infinity), a, b));
  if (options.sort === "performance") return items.sort((a, b) => stable((b.perf3 ?? -Infinity) - (a.perf3 ?? -Infinity), a, b));
  if (options.sort === "minimum") return items.sort((a, b) => stable(a.minimum - b.minimum, a, b));
  if (options.tokens.length) return items.sort((a, b) => stable(matchMetadata.get(b.id).score - matchMetadata.get(a.id).score, a, b));
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

function publicItem(item, match) {
  const result = {
    id: item.id,
    category: item.category,
    type: item.type,
    name: item.name,
    symbol: item.symbol,
    manager: item.manager,
    assetClass: item.assetClass,
    objective: item.objective,
    risk: item.risk,
    minimum: item.minimum,
    fee: item.fee,
    perf1: item.perf1,
    perf3: item.perf3,
    flags: item.flags,
    liquidity: item.liquidity,
    brandKey: item.brandKey,
  };
  return match?.matchReason ? { ...result, matchReason: match.matchReason, matchMode: match.matchMode } : result;
}

function isInitialShelf(options) {
  return options.category === "All"
    && !options.q
    && !options.flags.length
    && !options.risks.length
    && !options.statuses.length
    && options.maxMinimum === undefined
    && options.maxFee === undefined
    && options.sort === "relevance"
    && options.cursor === 0;
}

function isInitialCategoryShelf(options) {
  return options.category !== "All"
    && !options.q
    && !options.flags.length
    && !options.risks.length
    && !options.statuses.length
    && options.maxMinimum === undefined
    && options.maxFee === undefined
    && options.sort === "relevance"
    && options.cursor === 0;
}

function initialCategoryPage(category, pageSize) {
  const items = curatedByCategory.get(category).slice(0, pageSize);
  for (let index = 0; items.length < pageSize; index += 1) items.push(makeSynthetic(category, index));
  return items;
}

function searchResponse({ options, matched, matchMetadata = new Map(), facets, searchMode, started, total = matched.length, pageReady = false }) {
  const start = Math.min(options.cursor, total);
  const page = pageReady ? matched : matched.slice(start, start + options.pageSize);
  const items = page.map((item) => publicItem(item, matchMetadata.get(item.id)));
  const elapsed = Math.max(1, Math.round(performance.now() - started));
  return {
    universe: UNIVERSE_SIZE,
    catalogVersion: CATALOG_VERSION,
    total,
    tookMs: elapsed,
    cursor: start,
    nextCursor: start + items.length < total ? start + items.length : null,
    previousCursor: start > 0 ? Math.max(0, start - options.pageSize) : null,
    pageSize: options.pageSize,
    items,
    facets,
    interpreted: options.interpreted,
    appliedCategory: options.category,
    searchMode,
  };
}

export function searchCatalog(input = {}) {
  const started = performance.now();
  const options = optionsFromInput(input);

  if (options.identifierQuery && curatedByInstrumentKey.has(options.identifierQuery)) {
    const entries = curatedByInstrumentKey.get(options.identifierQuery);
    const matchMetadata = new Map(entries.map(({ item, match }) => [item.id, match]));
    const matched = entries.map(({ item }) => item).filter((item) => matchesFilters(item, options));
    return searchResponse({ options, matched, matchMetadata, facets: buildFacets(matched), searchMode: "strict", started });
  }

  if (isInitialShelf(options)) {
    const matched = CURATED.slice(0, options.pageSize);
    return searchResponse({ options, matched, facets: DEFAULT_FACETS, searchMode: "filters", started, total: UNIVERSE_SIZE, pageReady: true });
  }

  if (isInitialCategoryShelf(options)) {
    const matched = initialCategoryPage(options.category, options.pageSize);
    return searchResponse({ options, matched, facets: categoryFacets(options.category), searchMode: "filters", started, total: CATEGORY_COUNTS[options.category], pageReady: true });
  }

  const candidateCategories = syntheticCandidateCategories(options);
  if (options.tokens.length && !candidateCategories.length) {
    const filtered = getCuratedSearchRecords().filter((item) => matchesFilters(item, options));
    const matchMetadata = new Map();
    let searchMode = "strict";
    let matched = filtered.filter((item) => {
      const match = strictTextMatch(item, options);
      if (match) matchMetadata.set(item.id, match);
      return Boolean(match);
    });
    if (!matched.length) {
      searchMode = "fuzzy";
      matched = filtered.filter((item) => {
        const match = fuzzyTextMatch(item, options);
        if (match) matchMetadata.set(item.id, match);
        return Boolean(match);
      });
    }
    sortItems(matched, options, matchMetadata);
    return searchResponse({ options, matched, matchMetadata, facets: buildFacets(matched), searchMode, started });
  }

  if (!options.tokens.length && options.normalizedQuery && options.identifierQuery && !/\d/.test(options.identifierQuery)) {
    return searchResponse({ options, matched: [], facets: buildFacets([]), searchMode: "filters", started });
  }

  const source = options.category === "All" && options.tokens.length ? getCandidateSearchIndex(candidateCategories) : getSearchIndex(options.category);
  const filtered = source.filter((item) => matchesFilters(item, options));
  const matchMetadata = new Map();
  let matched = filtered;
  let searchMode = options.tokens.length ? "strict" : "filters";
  const exactInstruments = options.identifierQuery ? filtered.filter((item) => {
    const match = exactInstrumentMatch(item, options);
    if (match) matchMetadata.set(item.id, match);
    return Boolean(match);
  }) : [];
  if (exactInstruments.length) {
    matched = exactInstruments;
    searchMode = "strict";
  } else if (options.tokens.length) {
    matched = filtered.filter((item) => {
      const match = strictTextMatch(item, options);
      if (match) matchMetadata.set(item.id, match);
      return Boolean(match);
    });
    if (!matched.length) {
      searchMode = "fuzzy";
      matched = filtered.filter((item) => {
        const match = fuzzyTextMatch(item, options);
        if (match) matchMetadata.set(item.id, match);
        return Boolean(match);
      });
    }
  } else if (options.normalizedQuery && options.identifierQuery) matched = [];
  const facets = buildFacets(matched);
  sortItems(matched, options, matchMetadata);
  return searchResponse({ options, matched, matchMetadata, facets, searchMode, started });
}

function fixed(seed, offset, minimum, maximum, digits = 1) {
  const ratio = ((seed >>> (offset % 16)) % 1000) / 999;
  return (minimum + ratio * (maximum - minimum)).toFixed(digits);
}

function signedPercent(value) {
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function profileFor(item, seed, performanceSeries) {
  const oneYear = item.perf1 ?? Number(fixed(seed, 2, 2.5, 12.5));
  const threeYear = item.perf3 ?? Number(fixed(seed, 4, 2.0, 10.0));
  const fiveYear = Number((threeYear * 0.82 + Number(fixed(seed, 6, 0.2, 3.0))).toFixed(1));
  const benchmarkThree = Number((threeYear + Number(fixed(seed, 8, -1.1, 1.1))).toFixed(1));
  const benchmarkSeries = performanceSeries.map((value, index) => value - 1.4 + Math.sin(index / 2.8) * 1.7);
  const dayChange = Number(fixed(seed, 10, -1.8, 1.9, 2));
  const asOf = "Illustrative · Aug 26, 2026 · 4:00 PM ET";
  const commonPerformance = {
    title: "Performance & benchmark",
    subtitle: `Annualized total returns through ${item.asOf}`,
    series: performanceSeries,
    benchmarkSeries,
    rows: [
      { period: "1 year", investment: oneYear, benchmark: Number((oneYear + Number(fixed(seed, 1, -1.2, 1.0))).toFixed(1)) },
      { period: "3 years", investment: threeYear, benchmark: benchmarkThree },
      { period: "5 years", investment: fiveYear, benchmark: Number((fiveYear + Number(fixed(seed, 3, -0.9, 1.0))).toFixed(1)) },
      { period: "Since inception", investment: Number((fiveYear * 0.74).toFixed(1)), benchmark: Number((fiveYear * 0.77).toFixed(1)) },
    ],
  };
  const commonRisk = [
    { label: "Risk level", value: item.risk, context: "UPS product classification" },
    { label: "3Y volatility", value: `${fixed(seed, 7, 4.2, 18.8)}%`, context: "Annualized standard deviation" },
    { label: "Downside capture", value: `${fixed(seed, 9, 72, 108, 0)}%`, context: `Versus ${item.benchmark}` },
    { label: "Maximum drawdown", value: `-${fixed(seed, 11, 6.5, 24.0)}%`, context: "Illustrative trailing five years" },
  ];
  const commonOperations = [
    { label: "Liquidity", value: item.liquidity },
    { label: "Minimum", value: formatMoney(item.minimum) },
    { label: "Inception", value: item.inception },
    { label: "Shelf status", value: item.status },
    { label: "Identifier", value: item.identifier },
    { label: "Data effective", value: item.asOf },
  ];
  const research = {
    title: item.flags.includes("CIO House View") ? "Aligned with current CIO view" : "UPS research coverage",
    summary: item.flags.includes("CIO House View")
      ? `The strategy is aligned with a current UPS CIO view. Review the investment objective, implementation characteristics and portfolio role before use.`
      : `Research coverage focuses on the durability of the investment process, implementation quality, risk controls and role within a diversified portfolio.`,
    owner: item.flags.includes("CIO House View") ? "Chief Investment Office" : "Investment Solutions Research",
    reviewed: item.flags.includes("Research Updated") ? "Reviewed Aug 2026" : "Reviewed Jul 2026",
    bullets: [
      `Designed for ${item.objective.toLowerCase()} within ${item.assetClass.toLowerCase()}.`,
      `Primary comparison benchmark: ${item.benchmark}.`,
      `${item.status === "Available" ? "Currently available on the illustrative shelf." : `Current shelf status: ${item.status}.`}`,
    ],
  };

  if (item.category === "Equities") {
    const price = fixed(seed, 2, 42, 535, 2);
    const sector = item.manager.split("·")[0].trim();
    return {
      quote: { label: "Market price", value: `$${price}`, change: signedPercent(dayChange), changeTone: dayChange >= 0 ? "positive" : "negative", secondaryLabel: "Day range", secondaryValue: `$${fixed(seed, 3, Number(price) * 0.985, Number(price) * 1.012, 2)}–$${fixed(seed, 4, Number(price) * 1.013, Number(price) * 1.025, 2)}`, asOf },
      keyFacts: [
        { label: "Market capitalization", value: item.aum }, { label: "Sector", value: sector },
        { label: "P/E (forward)", value: `${fixed(seed, 5, 12, 34)}×` }, { label: "Dividend yield", value: `${fixed(seed, 6, 0.2, 3.1)}%` },
        { label: "Beta (3Y)", value: fixed(seed, 7, 0.65, 1.55, 2) }, { label: "52-week range", value: `$${fixed(seed, 8, Number(price) * 0.62, Number(price) * 0.82, 0)}–$${fixed(seed, 9, Number(price) * 1.02, Number(price) * 1.22, 0)}` },
      ],
      performance: commonPerformance,
      riskMetrics: commonRisk,
      composition: { title: "Fundamentals", subtitle: "Illustrative operating profile", breakdown: [
        { label: "Revenue growth", value: Number(fixed(seed, 1, 5, 24)) }, { label: "EPS growth", value: Number(fixed(seed, 2, 4, 28)) },
        { label: "Operating margin", value: Number(fixed(seed, 3, 12, 42)) }, { label: "Return on equity", value: Number(fixed(seed, 4, 10, 48)) },
      ], holdings: [] },
      fees: [{ label: "Management expense", value: "Not applicable" }, { label: "Trading availability", value: "Intraday" }, { label: "Typical settlement", value: "T+1" }],
      operations: [{ label: "Exchange", value: item.manager.includes("NASDAQ") ? "NASDAQ" : "NYSE" }, { label: "Security type", value: item.type }, ...commonOperations],
      research,
    };
  }

  if (["Mutual Funds", "ETFs"].includes(item.category)) {
    const isEtf = item.category === "ETFs";
    const nav = fixed(seed, 2, 18, 780, 2);
    const bondLike = /bond|income|government|municipal/i.test(`${item.assetClass} ${item.objective}`);
    const holdings = bondLike
      ? ["U.S. Treasury securities", "Investment-grade corporates", "Agency mortgage-backed securities", "Municipal obligations", "Cash and equivalents"]
      : ["Apple", "Microsoft", "NVIDIA", "Amazon", "Broadcom"];
    return {
      quote: { label: isEtf ? "Market price" : "NAV", value: `$${nav}`, change: signedPercent(dayChange), changeTone: dayChange >= 0 ? "positive" : "negative", secondaryLabel: isEtf ? "NAV / premium" : "YTD total return", secondaryValue: isEtf ? `$${fixed(seed, 3, Number(nav) * .998, Number(nav) * 1.002, 2)} / ${signedPercent(Number(fixed(seed, 4, -.12, .12, 2)))}` : `${fixed(seed, 4, 4, 18)}%`, asOf },
      keyFacts: [
        { label: "Net assets", value: item.aum }, { label: "Expense ratio", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` },
        { label: "Benchmark", value: item.benchmark }, { label: "Holdings", value: `${fixed(seed, 5, 42, 620, 0)}` },
        { label: "30-day SEC yield", value: `${fixed(seed, 6, bondLike ? 3.1 : .7, bondLike ? 5.9 : 2.2)}%` }, { label: "Distribution", value: bondLike ? "Monthly" : "Quarterly" },
      ],
      performance: commonPerformance,
      riskMetrics: [...commonRisk, { label: "Morningstar category", value: item.assetClass, context: "Illustrative classification" }],
      composition: { title: bondLike ? "Portfolio exposure" : "Holdings & exposure", subtitle: `Illustrative allocations as of ${item.asOf}`, breakdown: bondLike
        ? [{ label: "Government", value: 38 }, { label: "Corporate", value: 27 }, { label: "Securitized", value: 21 }, { label: "Municipal / other", value: 14 }]
        : [{ label: "Technology", value: 34 }, { label: "Financials", value: 15 }, { label: "Health care", value: 12 }, { label: "Other sectors", value: 39 }], holdings },
      fees: [{ label: "Management fee", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` }, { label: "12b-1 / distribution", value: item.type.includes("Institutional") || isEtf ? "0.00%" : "0.10%" }, { label: "Transaction fee", value: "None in prototype" }, { label: "Gross expense ratio", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` }],
      operations: [{ label: "Pricing", value: isEtf ? "Intraday market price" : "Once daily NAV" }, { label: "Share class", value: isEtf ? "Exchange-traded" : item.type.split("·")[1]?.trim() || "Investor" }, ...commonOperations],
      research,
    };
  }

  if (item.category === "SMAs") {
    return {
      quote: { label: "3Y composite return", value: `${threeYear.toFixed(1)}%`, change: `${(threeYear - benchmarkThree) >= 0 ? "+" : ""}${(threeYear - benchmarkThree).toFixed(1)}% vs benchmark`, changeTone: threeYear >= benchmarkThree ? "positive" : "negative", secondaryLabel: "Strategy assets", secondaryValue: item.aum, asOf: `Through ${item.asOf}` },
      keyFacts: [
        { label: "Minimum", value: formatMoney(item.minimum) }, { label: "Annual manager fee", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` },
        { label: "Benchmark", value: item.benchmark }, { label: "Tax management", value: item.flags.includes("Tax-Aware") ? "Available" : "Standard" },
        { label: "Customization", value: item.flags.includes("Direct Indexing") ? "Restrictions & tilts" : "Guideline-based" }, { label: "Model delivery", value: item.flags.includes("Model Delivered") ? "Delivered" : "Not delivered" },
      ],
      performance: commonPerformance,
      riskMetrics: commonRisk,
      composition: { title: "Strategy characteristics", subtitle: "Representative, not account-specific", breakdown: [
        { label: "Core exposure", value: 58 }, { label: "Active tilts", value: 22 }, { label: "Tax / customization", value: item.flags.includes("Tax-Aware") ? 14 : 6 }, { label: "Cash", value: 6 },
      ], holdings: ["Separately owned securities", "Custom restriction support", "Ongoing portfolio rebalancing", item.flags.includes("Tax-Aware") ? "Tax-loss harvesting" : "Standard tax treatment"] },
      fees: [{ label: "Manager fee", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` }, { label: "Platform fee", value: "Program dependent" }, { label: "Underlying vehicle expenses", value: "Security-level" }],
      operations: [{ label: "Funding", value: "Cash or eligible securities" }, { label: "Customization review", value: item.flags.includes("Direct Indexing") ? "Required at enrollment" : "By exception" }, { label: "Capacity", value: item.status === "Limited" ? "Limited" : "Open" }, ...commonOperations],
      research,
    };
  }

  if (item.category === "Fixed Income") {
    const price = fixed(seed, 2, 92.5, 104.8, 3);
    const yieldValue = fixed(seed, 3, 3.4, 6.1, 2);
    const coupon = item.name.match(/(\d+(?:\.\d+)?)%/)?.[1] || fixed(seed, 4, 2.8, 5.5, 3);
    const maturity = item.name.match(/\d{2}\/\d{2}\/(\d{4})/)?.[0] || `08/15/${2028 + (seed % 22)}`;
    return {
      quote: { label: "Clean price", value: `$${price}`, change: `${yieldValue}% yield to worst`, changeTone: "neutral", secondaryLabel: "Accrued interest", secondaryValue: `$${fixed(seed, 5, .18, 2.42, 2)}`, asOf: "Illustrative evaluated price · Aug 26, 2026" },
      keyFacts: [
        { label: "Coupon", value: `${coupon}%` }, { label: "Maturity", value: maturity }, { label: "Yield to maturity", value: `${fixed(seed, 6, Number(yieldValue), Number(yieldValue) + .35, 2)}%` },
        { label: "Duration", value: `${fixed(seed, 7, 1.2, 11.8)} years` }, { label: "Credit rating", value: item.type.includes("Treasury") ? "AA+ / Aaa" : item.assetClass.includes("Municipal") ? "AA" : "A" },
        { label: "Tax status", value: item.assetClass.includes("Municipal") ? "Federal tax-exempt" : "Taxable" },
      ],
      performance: { ...commonPerformance, title: "Yield & return history", subtitle: "Illustrative total-return comparison", rows: commonPerformance.rows.slice(0, 3) },
      riskMetrics: [{ label: "Interest-rate risk", value: `${fixed(seed, 7, 1.2, 11.8)} duration`, context: "Effective duration" }, { label: "Credit quality", value: item.type.includes("Treasury") ? "U.S. government" : "Investment grade", context: "Illustrative composite rating" }, { label: "Call status", value: seed % 2 ? "Non-callable" : "Callable", context: seed % 2 ? "—" : `First call ${2028 + seed % 5}` }, { label: "Price sensitivity", value: `${fixed(seed, 8, 1.0, 10.4)}%`, context: "Approx. move for +100 bps" }],
      composition: { title: "Cash-flow profile", subtitle: "Contractual payment schedule", breakdown: [{ label: "Principal", value: 72 }, { label: "Remaining coupons", value: 24 }, { label: "Accrued interest", value: 4 }], holdings: ["Semiannual coupon payments", `Maturity: ${maturity}`, seed % 2 ? "No embedded call" : "Callable prior to maturity"] },
      fees: [{ label: "Mark-up / mark-down", value: "Shown at transaction" }, { label: "Ongoing expense ratio", value: "Not applicable" }, { label: "Accrued interest", value: "Paid at settlement" }],
      operations: [{ label: "Settlement", value: "T+1" }, { label: "Minimum denomination", value: formatMoney(item.minimum) }, { label: "Market", value: "Secondary market" }, ...commonOperations],
      research,
    };
  }

  const categoryProfiles = {
    Alternatives: { quoteLabel: "Latest reported NAV", quoteValue: `$${fixed(seed, 2, 9.4, 18.8, 2)}`, change: `${oneYear.toFixed(1)}% trailing return`, facts: [["Strategy", item.assetClass], ["Liquidity", item.liquidity], ["Lockup", `${fixed(seed, 3, 1, 5, 0)} years`], ["Target size", item.aum], ["Minimum", formatMoney(item.minimum)], ["Vintage", item.inception]], composition: [["Senior / core", 46], ["Opportunistic", 29], ["Real assets", 17], ["Cash / other", 8]], holdings: ["Quarterly manager reporting", "Capital-call or subscription process", "Limited transferability"] },
    Structured: { quoteLabel: "Indicative value", quoteValue: `$${fixed(seed, 2, 94, 103, 2)}`, change: `${fixed(seed, 3, 6, 12)}% contingent coupon`, facts: [["Underlying", item.benchmark], ["Term", `${fixed(seed, 4, 12, 36, 0)} months`], ["Buffer / barrier", `${fixed(seed, 5, 10, 30, 0)}%`], ["Upside cap", `${fixed(seed, 6, 12, 32, 0)}%`], ["Minimum", formatMoney(item.minimum)], ["Issuer", item.manager]], composition: [["Protected range", 20], ["At-risk range", 55], ["Upside participation", 25]], holdings: ["Issuer credit exposure", "Path-dependent payoff", "Limited secondary liquidity"] },
    "Managed Options": { quoteLabel: "3Y composite return", quoteValue: `${threeYear.toFixed(1)}%`, change: `${(threeYear - benchmarkThree).toFixed(1)}% vs benchmark`, facts: [["Objective", item.objective], ["Underlying", item.benchmark], ["Minimum", formatMoney(item.minimum)], ["Annual fee", `${item.fee?.toFixed(2) || "—"}%`], ["Liquidity", item.liquidity], ["Manager", item.manager]], composition: [["Equity exposure", 68], ["Option overlay", 26], ["Cash collateral", 6]], holdings: ["Systematic option implementation", "Defined rebalance schedule", "Account-level tax considerations"] },
    Annuities: { quoteLabel: "Current crediting rate", quoteValue: `${fixed(seed, 2, 3.2, 6.0, 2)}%`, change: `${fixed(seed, 3, 3, 10, 0)}-year guarantee period`, facts: [["Carrier", item.manager], ["Contract type", item.type], ["Minimum", formatMoney(item.minimum)], ["Annual fee", `${item.fee?.toFixed(2) || "0.00"}%`], ["Surrender period", `${fixed(seed, 4, 5, 10, 0)} years`], ["Objective", item.objective]], composition: [["Guaranteed account", 50], ["Index-linked options", 35], ["Optional riders", 15]], holdings: ["Carrier claims-paying ability", "Surrender charges may apply", "Guarantees subject to contract terms"] },
    "Precious Metals": { quoteLabel: "Reference price", quoteValue: item.assetClass === "Gold" ? `$${fixed(seed, 2, 2350, 2850, 2)}` : `$${fixed(seed, 2, 24, 48, 2)}`, change: signedPercent(dayChange), facts: [["Metal", item.assetClass], ["Form", item.type], ["Minimum", formatMoney(item.minimum)], ["Custody fee", `${item.fee?.toFixed(2) || "—"}%`], ["Liquidity", item.liquidity], ["Pricing basis", `Reference ${item.benchmark}`]], composition: [["Metal value", 94], ["Custody / handling", 4], ["Cash / spread", 2]], holdings: ["Institutional custody", "Allocated or unallocated ownership terms", "Dealer spread applies"] },
  };
  const profile = categoryProfiles[item.category];
  return {
    quote: { label: profile.quoteLabel, value: profile.quoteValue, change: profile.change, changeTone: dayChange >= 0 ? "positive" : "neutral", secondaryLabel: "Data basis", secondaryValue: "Latest illustrative valuation", asOf: item.asOf },
    keyFacts: profile.facts.map(([label, value]) => ({ label, value })),
    performance: commonPerformance,
    riskMetrics: commonRisk,
    composition: { title: item.category === "Structured" ? "Payoff profile" : "Exposure & structure", subtitle: "Illustrative characteristics", breakdown: profile.composition.map(([label, value]) => ({ label, value })), holdings: profile.holdings },
    fees: [{ label: "Product fee", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` }, { label: "Additional expenses", value: "See offering documents" }, { label: "Transaction costs", value: "May apply" }],
    operations: commonOperations,
    research,
  };
}

export function getInvestmentDetail(id) {
  const requested = String(id || "").toLowerCase();
  let item = CURATED.find((record) => record.id.toLowerCase() === requested || record.symbol.toLowerCase() === requested);
  if (!item && requested.startsWith("syn-")) {
    const parts = requested.split("-");
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
  const profile = profileFor(item, seed, performanceSeries);
  return {
    ...item,
    canonicalSlug: item.id.startsWith("syn-") ? item.id : item.symbol,
    performanceSeries,
    profile,
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
      { name: item.category === "Equities" ? "Company research report" : "Product profile", meta: `PDF · Updated ${item.asOf}` },
      { name: item.category === "Fixed Income" ? "Security and credit details" : "Performance and risk", meta: "PDF · Monthly" },
      { name: "Fees and important disclosures", meta: "PDF · Current" },
      { name: ["Mutual Funds", "ETFs"].includes(item.category) ? "Prospectus and shareholder reports" : "Operational terms", meta: "PDF · Current" },
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
