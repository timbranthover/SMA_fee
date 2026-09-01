import { CATEGORY_COUNTS, CATEGORY_ORDER, CATALOG_VERSION, FLAG_DEFINITIONS, RISKS, STATUSES, UNIVERSE_SIZE } from "./shared-config.js";
import { resolveBrandKey } from "./brand-logos.js";
import { defaultSort, isSortAllowed, parseSort, SORTS } from "./sort-config.js";
import { isRangeAllowed, normalizeRanges, rangeDefinitions } from "./range-config.js";
import { EQUITY_REFERENCE_AS_OF, EQUITY_REFERENCE_SOURCE, EQUITY_UNIVERSE } from "./equity-universe.js";
import { ETF_REFERENCE_AS_OF, ETF_REFERENCE_SOURCES, ETF_UNIVERSE } from "./etf-universe.js";
export { CATEGORY_COUNTS, CATEGORY_ORDER, FLAG_DEFINITIONS, UNIVERSE_SIZE } from "./shared-config.js";
export { EQUITY_REFERENCE_AS_OF, EQUITY_REFERENCE_SOURCE } from "./equity-universe.js";
export { ETF_REFERENCE_AS_OF, ETF_REFERENCE_SOURCES } from "./etf-universe.js";

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
  base({ id: "sma-ups-climate", category: "SMAs", type: "Separately managed account", name: "Climate Aware US Equity", symbol: "UPCA", manager: "UPS Asset Management", assetClass: "US Large Blend", objective: "Sustainable core equity", risk: "Moderate", minimum: 100000, fee: 0.32, perf1: 16.8, perf3: 17.6, aum: "$2.9B strategy assets", flags: ["Sustainable", "Model Delivered", "New to Shelf"], description: "Systematic US equity strategy integrating climate-transition signals while maintaining broad market characteristics.", benchmark: "Russell 1000", inception: "2022", liquidity: "Daily", status: "New" }),

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
    names: ["Alder", "Alpine", "Beacon", "Blue Ridge", "Cedar", "Crescent", "Evergreen", "Fairview", "Granite", "Harbor", "Horizon", "Ironwood", "Juniper", "Lakeview", "Meridian", "Northfield", "Oakmont", "Parkside", "Pioneer", "Redwood", "Riverton", "Silverton", "Stonebridge", "Summit", "Terrace", "Trillium", "Union", "Valley Forge", "Westlake", "Willow", "Windward", "Woodland"],
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

const illustrativeEquityIndustries = Object.freeze([
  "Advanced Materials", "Aerospace", "Analytics", "Automation", "Bancorp", "Biologics", "Building Products", "Business Services",
  "Capital Markets", "Cloud Systems", "Consumer Brands", "Diagnostics", "Digital Commerce", "Energy Infrastructure", "Financial Technologies", "Food Systems",
  "Health Sciences", "Industrial Technologies", "Insurance", "Logistics", "Medical Devices", "Mobility", "Networks", "Payment Systems",
  "Precision Manufacturing", "Renewable Power", "Retail Group", "Semiconductors", "Software", "Specialty Chemicals", "Telecommunications", "Water Systems",
]);
const illustrativeEquitySuffixes = Object.freeze(["Co.", "Corporation", "Group", "Holdings", "Industries", "International", "Ltd.", "Partners", "PLC", "Systems", "Technologies", "Ventures", "Works", "AG", "N.V.", "S.A."]);

const allFlagNames = Object.keys(FLAG_DEFINITIONS);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const normalizedTextCache = new Map();
const curatedOrdinalById = new Map(CURATED.map((item, index) => [item.id, index]));
const curatedByCategory = new Map(CATEGORY_ORDER.slice(1).map((category) => [category, CURATED.filter((item) => item.category === category)]));
const curatedEtfTickers = new Set(curatedByCategory.get("ETFs").map((item) => item.symbol));
const etfReferenceTail = ETF_UNIVERSE.filter(([ticker]) => !curatedEtfTickers.has(ticker));
if (etfReferenceTail.length !== CATEGORY_COUNTS.ETFs - curatedEtfTickers.size) throw new Error("ETF reference universe must exactly cover the configured ETF shelf");
const etfReferenceIndexByTicker = new Map(etfReferenceTail.map(([ticker], index) => [normalizeIdentifier(ticker), index]));
const equityReferenceIndexByTicker = new Map(EQUITY_UNIVERSE.map(([ticker], index) => [normalizeIdentifier(ticker), index]));
const equityReferenceIndexByIdentifier = new Map(EQUITY_UNIVERSE.map(([, , , cik], index) => [normalizeIdentifier(String(cik).padStart(10, "0")), index]));
const syntheticOffsetByCategory = new Map();
let syntheticOffset = CURATED.length;
for (const category of CATEGORY_ORDER.slice(1)) {
  syntheticOffsetByCategory.set(category, syntheticOffset);
  syntheticOffset += CATEGORY_COUNTS[category] - curatedByCategory.get(category).length;
}

const DEFAULT_FACETS = Object.freeze({
  categories: Object.freeze({ ...Object.fromEntries(CATEGORY_ORDER.slice(1).map((name) => [name, CATEGORY_COUNTS[name]])) }),
  flags: Object.freeze({
    "CIO House View": 14848,
    Sustainable: 13171,
    "CIO Select": 1348,
    "Model Delivered": 257,
    "Tax-Aware": 3576,
    "Direct Indexing": 163,
    "New to Shelf": 8583,
    "Limited Capacity": 10797,
    "Research Updated": 26704,
  }),
  risks: Object.freeze({ Conservative: 49009, Moderate: 60743, High: 20676 }),
  statuses: Object.freeze({ Available: 117348, New: 5377, Limited: 7703 }),
});

const CATEGORY_FACET_COUNTS = Object.freeze({
  Equities: { flags: [2060, 1753, 0, 0, 0, 0, 899, 1344, 7044], risks: [0, 11294, 11290], statuses: [20341, 899, 1344] },
  "Mutual Funds": { flags: [410, 356, 835, 0, 99, 0, 246, 313, 583], risks: [1103, 1124, 1111], statuses: [3016, 136, 186] },
  ETFs: { flags: [136, 100, 279, 0, 32, 0, 88, 106, 199], risks: [383, 362, 372], statuses: [1008, 48, 61] },
  SMAs: { flags: [93, 85, 234, 172, 288, 163, 55, 73, 137], risks: [347, 397, 116], statuses: [773, 37, 50] },
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
for (const [ticker, name, exchange] of EQUITY_UNIVERSE) {
  for (const value of [ticker, name, exchange]) normalizeSearchText(value).split(" ").filter(Boolean).forEach((word) => SYNTHETIC_SEARCH_WORDS.get("Equities").add(word));
}
for (const [ticker, name, exchange, issuer] of ETF_UNIVERSE) {
  for (const value of [ticker, name, exchange, issuer]) normalizeSearchText(value).split(" ").filter(Boolean).forEach((word) => SYNTHETIC_SEARCH_WORDS.get("ETFs").add(word));
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

function matchesBaseFilters(item, options) {
  if (options.category && options.category !== "All" && item.category !== options.category) return false;
  if (options.risks?.length && !options.risks.includes(item.risk)) return false;
  if (options.statuses?.length && !options.statuses.includes(item.status)) return false;
  if (options.flags?.length && !options.flags.every((flag) => item.flags.includes(flag))) return false;
  return true;
}

function matchesRangeFilters(item, options) {
  for (const [field, bounds] of Object.entries(options.ranges || {})) {
    const value = marketMetricNumber(item, field);
    if (value === null || value === undefined || !Number.isFinite(value)) return false;
    if (Number.isFinite(bounds.min) && value < bounds.min) return false;
    if (Number.isFinite(bounds.max) && value > bounds.max) return false;
  }
  return true;
}

function referencedEquityType(name, symbol) {
  if (/\b(?:ADR|ADS|depositary)\b/i.test(name)) return "ADR";
  if (/\bREIT\b|realty (?:income|trust)|properties (?:trust|inc)/i.test(name)) return "REIT";
  if (/(?:-P[A-Z]?|\.P[A-Z]?)$/i.test(symbol) || /\bpreferred\b/i.test(name)) return "Preferred stock";
  return "Common stock";
}

function illustrativeEquityName(index) {
  const companies = pools.Equities.names;
  const company = companies[index % companies.length];
  const industry = illustrativeEquityIndustries[Math.floor(index / companies.length) % illustrativeEquityIndustries.length];
  const suffix = illustrativeEquitySuffixes[Math.floor(index / (companies.length * illustrativeEquityIndustries.length)) % illustrativeEquitySuffixes.length];
  return `${company} ${industry} ${suffix}`;
}

function makeSynthetic(category, index) {
  const pool = pools[category];
  const seed = hash(`${category}-${index}`);
  const equityReference = category === "Equities" ? EQUITY_UNIVERSE[index] : null;
  const etfReference = category === "ETFs" ? etfReferenceTail[index] : null;
  const [referenceTicker, referenceName, referenceExchange, referenceCik] = equityReference || [];
  const [etfTicker, etfName, etfExchange, etfIssuer] = etfReference || [];
  const longTailEquityIndex = Math.max(0, index - EQUITY_UNIVERSE.length);
  const type = equityReference ? referencedEquityType(referenceName, referenceTicker) : etfReference ? (/\bETN\b/i.test(etfName) ? "ETP" : /\bactive\b/i.test(etfName) ? "Active ETF" : "ETF") : pick(pool.types, seed, 1);
  let name = equityReference ? referenceName : etfReference ? etfName : category === "Equities" ? illustrativeEquityName(longTailEquityIndex) : pick(pool.names, seed, 2);
  if (category === "Fixed Income") {
    const coupon = (2.75 + (seed % 275) / 100).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    const year = 2027 + (seed % 28);
    name = `${name} ${coupon}% ${String((seed % 12) + 1).padStart(2, "0")}/15/${year}`;
  } else if (category !== "Equities" && !etfReference) {
    name = `${name} ${String.fromCharCode(65 + (seed % 18))}`;
  }
  const applicableFlags = allFlagNames.filter((flag) => {
    if (flag === "Direct Indexing") return category === "SMAs";
    if (flag === "CIO Select") return category === "SMAs";
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
  const generatedSymbol = category === "Equities" ? `EQ${String(longTailEquityIndex + 1).padStart(5, "0")}` : `${symbolPrefix}${String(seed % 9999).padStart(4, "0")}`;
  const symbol = referenceTicker || etfTicker || generatedSymbol;
  const id = equityReference ? `eq-sec-${index}` : etfReference ? `etf-listed-${index}` : `syn-${slugCategory(category)}-${index}`;
  const manager = equityReference ? `Public equity · ${referenceExchange}` : etfReference ? etfIssuer : pick(pool.managers, seed, 8);
  let assetClass = equityReference ? (referenceExchange === "OTC" ? "OTC Equity" : "Exchange-Listed Equity") : pick(pool.assets, seed, 9);
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
    symbol,
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
    description: equityReference
      ? `${referenceName} is included in the prototype public-equity universe using SEC issuer, ticker and exchange reference data. Market, performance, research and product-control fields remain illustrative.`
      : etfReference
        ? `${etfName} is included in the prototype ETF universe using current Nasdaq Trader ticker, fund-name and listing-exchange reference data. Classification, market, performance, fee, AUM, research and product-control fields remain illustrative.`
        : `Illustrative ${objective.toLowerCase()} solution in ${assetClass.toLowerCase()}, managed by ${manager}. Designed to demonstrate realistic shelf data and governed product metadata.`,
    benchmark: equityReference ? "Broad Equity Market" : pick(["S&P 500", "Russell 1000", "Bloomberg US Aggregate", "Custom Strategy Benchmark"], seed, 11),
    inception: String(1995 + (seed % 31)),
    liquidity: category === "Alternatives" ? "Quarterly or less frequent" : category === "Fixed Income" ? "Secondary market" : "Daily",
    identifier: equityReference ? String(referenceCik).padStart(10, "0") : etfReference ? etfTicker : `${symbolPrefix}${String(seed).slice(0, 8)}`,
    referenceSource: equityReference ? EQUITY_REFERENCE_SOURCE : etfReference ? ETF_REFERENCE_SOURCES.join(" · ") : null,
    referenceAsOf: equityReference ? EQUITY_REFERENCE_AS_OF : etfReference ? ETF_REFERENCE_AS_OF : null,
    primaryMarket: etfReference ? etfExchange : undefined,
  });
}

function optionsFromInput(input = {}) {
  const fail = (message) => { throw new RangeError(message); };
  if (typeof input.q === "string" && input.q.length > 160) fail("Search query must be 160 characters or fewer");
  if (input.category && !CATEGORY_ORDER.includes(input.category)) fail("Unknown investment category");
  for (const flag of input.flags || []) if (!allFlagNames.includes(flag)) fail(`Unknown flag: ${flag}`);
  for (const risk of input.risks || []) if (!RISKS.includes(risk)) fail(`Unknown risk: ${risk}`);
  for (const status of input.statuses || []) if (!STATUSES.includes(status)) fail(`Unknown status: ${status}`);
  if (input.cursor !== undefined && (!Number.isInteger(Number(input.cursor)) || Number(input.cursor) < 0)) fail("Cursor must be a non-negative integer");
  if (input.pageSize !== undefined && (!Number.isInteger(Number(input.pageSize)) || Number(input.pageSize) < 1 || Number(input.pageSize) > 25)) fail("Page size must be between 1 and 25");
  if (input.maxMinimum !== undefined && (!Number.isFinite(input.maxMinimum) || input.maxMinimum < 0)) fail("Maximum minimum must be a non-negative number");
  if (input.maxFee !== undefined && (!Number.isFinite(input.maxFee) || input.maxFee < 0 || input.maxFee > 10)) fail("Maximum fee must be between 0 and 10");
  const parsed = parseNaturalLanguage(input.q || "");
  const mergeArray = (direct, inferred) => direct?.length ? direct : inferred;
  const q = input.q?.trim() || "";
  const category = input.category && input.category !== "All" ? input.category : parsed.filters.category || "All";
  const rawRanges = input.ranges && typeof input.ranges === "object" && !Array.isArray(input.ranges) ? structuredClone(input.ranges) : {};
  if (Number.isFinite(input.maxMinimum) && rawRanges.minimum?.max === undefined) rawRanges.minimum = { ...(rawRanges.minimum || {}), max: input.maxMinimum };
  const feeMaximum = Number.isFinite(input.maxFee) ? input.maxFee : parsed.filters.maxFee;
  if (Number.isFinite(feeMaximum) && rawRanges.fee?.max === undefined) rawRanges.fee = { ...(rawRanges.fee || {}), max: feeMaximum };
  if (Object.keys(rawRanges).length > 4) fail("Choose no more than four numeric ranges");
  for (const [field, bounds] of Object.entries(rawRanges)) {
    if (!isRangeAllowed(field, category)) fail(`Range filter is not available for this investment category: ${field}`);
    if (!bounds || typeof bounds !== "object" || Array.isArray(bounds)) fail(`Invalid range filter: ${field}`);
    const minimum = bounds.min === undefined || bounds.min === null || bounds.min === "" ? undefined : Number(bounds.min);
    const maximum = bounds.max === undefined || bounds.max === null || bounds.max === "" ? undefined : Number(bounds.max);
    if ((minimum !== undefined && !Number.isFinite(minimum)) || (maximum !== undefined && !Number.isFinite(maximum))) fail(`Invalid range filter: ${field}`);
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) fail(`Range minimum exceeds maximum: ${field}`);
    if ([minimum, maximum].some((value) => value !== undefined && Math.abs(value) > 1_000_000_000)) fail(`Range is outside supported bounds: ${field}`);
    if (["minimum", "fee"].includes(field) && [minimum, maximum].some((value) => value !== undefined && value < 0)) fail(`Range must be non-negative: ${field}`);
  }
  const ranges = normalizeRanges(rawRanges, category);
  const sort = input.sort || defaultSort(Boolean(q));
  if (!SORTS.includes(sort)) fail("Unknown sort option");
  if (!isSortAllowed(sort, category, Boolean(q))) fail("Sort option is not available for this investment category");
  return {
    q,
    category,
    flags: mergeArray(input.flags, parsed.filters.flags) || [],
    risks: mergeArray(input.risks, parsed.filters.risks) || [],
    statuses: input.statuses || [],
    ranges,
    maxMinimum: ranges.minimum?.max,
    maxFee: ranges.fee?.max,
    location: input.location || parsed.filters.location,
    sort,
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

const nameCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function fixedIncomeRating(item) {
  if (item.type.includes("Treasury")) return { label: "AA+ / Aaa", quality: 3 };
  if (item.assetClass.includes("Municipal")) return { label: "AA", quality: 2 };
  return { label: "A", quality: 1 };
}

function marketMetricNumber(item, field) {
  const seed = hash(item.id);
  if (field === "minimum") return item.minimum;
  if (["fee", "expenseRatio", "managerFee", "annualFee", "custodyFee"].includes(field)) return item.fee;
  if (["perf1", "return1Y"].includes(field)) return item.perf1;
  if (field === "perf3") return item.perf3;
  if (field === "reportedReturn3Y") return item.perf3 ?? Number(fixed(seed, 4, 2, 10));
  if (field === "forwardPE") return Number(fixed(seed, 5, 12, 34));
  if (field === "dividendYield") return Number(fixed(seed, 6, .2, 3.1));
  if (field === "secYield") {
    const bondLike = /bond|income|government|municipal/i.test(`${item.assetClass} ${item.objective}`);
    return Number(fixed(seed, 6, bondLike ? 3.1 : .7, bondLike ? 5.9 : 2.2));
  }
  if (field === "yieldToWorst") return Number(fixed(seed, 3, 3.4, 6.1, 2));
  if (field === "creditRating") return fixedIncomeRating(item).quality;
  if (field === "contingentCoupon") return Number(fixed(seed, 3, 6, 12));
  if (field === "term") return Number(fixed(seed, 4, 12, 36, 0));
  if (field === "guaranteePeriod") return Number(fixed(seed, 3, 3, 10, 0));
  if (field === "trend") {
    if (item.category === "Structured") return Number(fixed(seed, 11, -3, 10, 1));
    if (item.category === "Annuities") return Number(fixed(seed, 2, 3.2, 6, 2));
    return item.perf1 ?? Number(fixed(seed, 12, 1.5, 11.5));
  }
  if (field === "primary") {
    if (["SMAs", "Managed Options"].includes(item.category)) return item.perf3 ?? Number(fixed(seed, 4, 2, 10));
    if (item.category === "Equities") return Number(fixed(seed, 2, 42, 535, 2));
    if (["Mutual Funds", "ETFs"].includes(item.category)) return Number(fixed(seed, 2, 18, 780, 2));
    if (item.category === "Fixed Income") return Number(fixed(seed, 2, 92.5, 104.8, 3));
    if (item.category === "Alternatives") return Number(fixed(seed, 2, 9.5, 42, 2));
    if (item.category === "Structured") return Number(fixed(seed, 2, 94, 103, 2));
    if (item.category === "Annuities") return Number(fixed(seed, 2, 3.2, 6, 2));
    if (item.category === "Precious Metals") return item.assetClass === "Gold" ? Number(fixed(seed, 2, 2350, 2850, 2)) : Number(fixed(seed, 2, 24, 48, 2));
  }
  return null;
}

function sortItems(items, options, matchMetadata) {
  const stable = (difference, a, b) => difference || a._ordinal - b._ordinal;
  if (options.sort === "relevance" && options.tokens.length) {
    return items.sort((a, b) => stable((matchMetadata.get(b.id)?.score || 0) - (matchMetadata.get(a.id)?.score || 0), a, b));
  }
  const parsed = parseSort(options.sort);
  if (!parsed) return items;
  return items.sort((a, b) => {
    const left = parsed.field === "name" ? a.name : marketMetricNumber(a, parsed.field);
    const right = parsed.field === "name" ? b.name : marketMetricNumber(b, parsed.field);
    if (left === null || left === undefined) return right === null || right === undefined ? stable(0, a, b) : 1;
    if (right === null || right === undefined) return -1;
    const difference = typeof left === "string" ? nameCollator.compare(left, right) : left - right;
    return stable(parsed.direction === "asc" ? difference : -difference, a, b);
  });
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

function categoricalFacetsFor(items, options) {
  const baseline = !options.q && !options.flags.length && !options.risks.length && !options.statuses.length && !options.location && !Object.keys(options.ranges).length;
  if (!baseline) return buildFacets(items);
  return options.category === "All" ? { ...DEFAULT_FACETS } : categoryFacets(options.category);
}

function rounded(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

const baselineRangeFacetCache = new Map();

function buildRangeFacets(items, category, ranges = {}) {
  const result = {};
  for (const definition of rangeDefinitions(category)) {
    const frequencies = new Map();
    let rawMinimum = Infinity;
    let rawMaximum = -Infinity;
    let valueCount = 0;
    for (const item of items) {
      const value = marketMetricNumber(item, definition.field);
      if (!Number.isFinite(value)) continue;
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
      rawMinimum = Math.min(rawMinimum, value);
      rawMaximum = Math.max(rawMaximum, value);
      valueCount += 1;
    }
    if (!valueCount) continue;
    const step = definition.step || 1;
    const minimum = rounded(Math.floor(rawMinimum / step) * step);
    let maximum = rounded(Math.ceil(rawMaximum / step) * step);
    if (maximum <= minimum) maximum = rounded(minimum + step);
    const binCount = 12;
    const span = maximum - minimum;
    const bins = Array(binCount).fill(0);
    for (const [value, count] of frequencies) {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor(((value - minimum) / span) * binCount)));
      bins[index] += count;
    }
    const orderedValues = [...frequencies.keys()].sort((left, right) => left - right);
    const midpoint = (valueCount - 1) / 2;
    let running = 0;
    let lowerMedian = orderedValues[0];
    let upperMedian = orderedValues[0];
    for (const value of orderedValues) {
      const next = running + frequencies.get(value);
      if (running <= Math.floor(midpoint) && Math.floor(midpoint) < next) lowerMedian = value;
      if (running <= Math.ceil(midpoint) && Math.ceil(midpoint) < next) { upperMedian = value; break; }
      running = next;
    }
    const median = (lowerMedian + upperMedian) / 2;
    result[definition.field] = {
      min: minimum,
      max: maximum,
      median: rounded(median),
      bins,
      valueCount,
      baseTotal: items.length,
      selected: ranges[definition.field] || null,
    };
  }
  return result;
}

function rangeFacetsFor(items, options) {
  const cacheable = !options.q && !options.flags.length && !options.risks.length && !options.statuses.length && !options.location;
  if (!cacheable) return buildRangeFacets(items, options.category, options.ranges);
  if (!baselineRangeFacetCache.has(options.category)) baselineRangeFacetCache.set(options.category, buildRangeFacets(items, options.category));
  const baseline = baselineRangeFacetCache.get(options.category);
  return Object.fromEntries(Object.entries(baseline).map(([field, facet]) => [field, { ...facet, selected: options.ranges[field] || null }]));
}

function publicItem(item, match) {
  const researchStatus = researchStatusFor(item, hash(item.id));
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
    researchStatus: { label: researchStatus.label, tone: researchStatus.tone },
  };
  return match?.matchReason ? { ...result, matchReason: match.matchReason, matchMode: match.matchMode } : result;
}

function trendPoints(item, seed, target = item.perf1 ?? Number(fixed(seed, 12, 1.5, 11.5))) {
  const amplitude = item.risk === "High" ? 3.2 : item.risk === "Conservative" ? 1.2 : 2.1;
  return Array.from({ length: 14 }, (_, index) => {
    const progress = index / 13;
    const wave = Math.sin((seed % 9) + index * .83) * amplitude * Math.sin(Math.PI * progress);
    return Number((100 + Number(target) * progress + wave).toFixed(2));
  });
}

function marketSnapshotFor(item) {
  const seed = hash(item.id);
  const dayChange = Number(fixed(seed, 10, -1.8, 1.9, 2));
  const annualReturn = item.perf1 ?? Number(fixed(seed, 12, 1.5, 11.5));
  const trend = (label = "1Y total return", target = annualReturn) => ({
    label,
    value: `${Number(target) >= 0 ? "+" : ""}${Number(target).toFixed(1)}%`,
    points: trendPoints(item, seed, target),
    tone: Number(target) >= 0 ? "positive" : "negative",
  });
  const primary = (label, value, change = signedPercent(dayChange), tone = dayChange >= 0 ? "positive" : "negative") => ({ label, value, change, tone });
  const field = (label, value) => ({ label, value });
  const asOf = "Aug 26 · 4:00 PM ET";

  if (item.category === "Equities") {
    return {
      primary: primary("Market price", `$${fixed(seed, 2, 42, 535, 2)}`),
      trend: trend(),
      metrics: { forwardPE: field("Forward P/E", `${fixed(seed, 5, 12, 34)}×`), dividendYield: field("Dividend yield", `${fixed(seed, 6, .2, 3.1)}%`) },
      featured: ["forwardPE", "dividendYield"],
      asOf,
    };
  }

  if (["Mutual Funds", "ETFs"].includes(item.category)) {
    const bondLike = /bond|income|government|municipal/i.test(`${item.assetClass} ${item.objective}`);
    return {
      primary: primary(item.category === "ETFs" ? "Market price" : "NAV", `$${fixed(seed, 2, 18, 780, 2)}`),
      trend: trend(),
      metrics: { secYield: field("30-day SEC yield", `${fixed(seed, 6, bondLike ? 3.1 : .7, bondLike ? 5.9 : 2.2)}%`), expenseRatio: field("Expense ratio", item.fee === null ? "—" : `${item.fee.toFixed(2)}%`) },
      featured: ["secYield", "expenseRatio"],
      asOf,
    };
  }

  if (item.category === "SMAs") {
    const threeYear = item.perf3 ?? Number(fixed(seed, 4, 2, 10));
    return {
      primary: primary("3Y composite", `${threeYear.toFixed(1)}%`, `${item.benchmark} benchmark`, "neutral"),
      trend: trend("1Y composite", annualReturn),
      metrics: { minimum: field("Minimum", formatMoney(item.minimum)), managerFee: field("Manager fee", item.fee === null ? "—" : `${item.fee.toFixed(2)}%`) },
      featured: ["minimum", "managerFee"],
      asOf: "Through Aug 21, 2026",
    };
  }

  if (item.category === "Fixed Income") {
    const yieldValue = Number(fixed(seed, 3, 3.4, 6.1, 2));
    const rating = item.type.includes("Treasury") ? "AA+ / Aaa" : item.assetClass.includes("Municipal") ? "AA" : "A";
    return {
      primary: primary("Clean price", `$${fixed(seed, 2, 92.5, 104.8, 3)}`, "Evaluated", "neutral"),
      trend: trend("1Y price return", annualReturn),
      metrics: { yieldToWorst: field("Yield to worst", `${yieldValue.toFixed(2)}%`), creditRating: field("Credit rating", rating) },
      featured: ["yieldToWorst", "creditRating"],
      asOf,
    };
  }

  if (item.category === "Alternatives") {
    const threeYear = item.perf3 ?? Number(fixed(seed, 4, 2, 10));
    return {
      primary: primary("Latest reported NAV", `$${fixed(seed, 2, 9.5, 42, 2)}`, "Quarterly", "neutral"),
      trend: trend("1Y reported return", annualReturn),
      metrics: { reportedReturn3Y: field("3Y annualized", `${threeYear.toFixed(1)}%`), reportedLiquidity: field("Liquidity", item.liquidity.split("·")[0].trim()) },
      featured: ["reportedReturn3Y", "reportedLiquidity"],
      asOf: "Reported Jun 30, 2026",
    };
  }

  if (item.category === "Structured") {
    const payoffReturn = Number(fixed(seed, 11, -3, 10, 1));
    return {
      primary: primary("Indicative value", `$${fixed(seed, 2, 94, 103, 2)}`, "Per $100 notional", "neutral"),
      trend: trend("Since issue", payoffReturn),
      metrics: { contingentCoupon: field("Contingent coupon", `${fixed(seed, 3, 6, 12)}%`), term: field("Term", `${fixed(seed, 4, 12, 36, 0)} months`) },
      featured: ["contingentCoupon", "term"],
      asOf,
    };
  }

  if (item.category === "Managed Options") {
    const threeYear = item.perf3 ?? Number(fixed(seed, 4, 2, 10));
    return {
      primary: primary("3Y composite", `${threeYear.toFixed(1)}%`, `${item.benchmark} benchmark`, "neutral"),
      trend: trend("1Y composite", annualReturn),
      metrics: { minimum: field("Minimum", formatMoney(item.minimum)), annualFee: field("Annual fee", item.fee === null ? "—" : `${item.fee.toFixed(2)}%`) },
      featured: ["minimum", "annualFee"],
      asOf: "Through Aug 21, 2026",
    };
  }

  if (item.category === "Annuities") {
    const rate = Number(fixed(seed, 2, 3.2, 6, 2));
    return {
      primary: primary("Crediting rate", `${rate.toFixed(2)}%`, "Current rate", "neutral"),
      trend: trend("Illustrative growth", rate),
      metrics: { guaranteePeriod: field("Guarantee period", `${fixed(seed, 3, 3, 10, 0)} years`), annualFee: field("Annual fee", item.fee === null ? "—" : `${item.fee.toFixed(2)}%`) },
      featured: ["guaranteePeriod", "annualFee"],
      asOf,
    };
  }

  return {
    primary: primary("Reference price", item.assetClass === "Gold" ? `$${fixed(seed, 2, 2350, 2850, 2)}` : `$${fixed(seed, 2, 24, 48, 2)}`),
    trend: trend(),
    metrics: { return1Y: field("1Y return", `${annualReturn >= 0 ? "+" : ""}${annualReturn.toFixed(1)}%`), custodyFee: field("Custody fee", item.fee === null ? "—" : `${item.fee.toFixed(2)}%`) },
    featured: ["return1Y", "custodyFee"],
    asOf,
  };
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
    appliedRanges: options.ranges,
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
    const rangeSource = entries.map(({ item }) => item).filter((item) => matchesBaseFilters(item, options));
    const matched = rangeSource.filter((item) => matchesRangeFilters(item, options));
    const facets = categoricalFacetsFor(matched, options);
    facets.ranges = rangeFacetsFor(rangeSource, options);
    return searchResponse({ options, matched, matchMetadata, facets, searchMode: "strict", started });
  }

  const referencedEtfIndex = etfReferenceIndexByTicker.get(options.identifierQuery);
  if (referencedEtfIndex !== undefined) {
    const item = makeSynthetic("ETFs", referencedEtfIndex);
    const filtered = matchesBaseFilters(item, options) ? [item] : [];
    const rangeSource = filtered;
    const matched = rangeSource.filter((record) => matchesRangeFilters(record, options));
    const matchMetadata = new Map([[item.id, { score: 1500, matchReason: "Exact ticker match", matchMode: "strict" }]]);
    const facets = categoricalFacetsFor(matched, options);
    facets.ranges = rangeFacetsFor(rangeSource, options);
    return searchResponse({ options, matched, matchMetadata, facets, searchMode: "strict", started });
  }

  const referencedEquityIndex = equityReferenceIndexByTicker.get(options.identifierQuery) ?? equityReferenceIndexByIdentifier.get(options.identifierQuery);
  if (referencedEquityIndex !== undefined) {
    const item = makeSynthetic("Equities", referencedEquityIndex);
    const filtered = matchesBaseFilters(item, options) ? [item] : [];
    const rangeSource = filtered;
    const matched = rangeSource.filter((record) => matchesRangeFilters(record, options));
    const matchReason = equityReferenceIndexByTicker.has(options.identifierQuery) ? "Exact ticker match" : "Exact identifier match";
    const matchMetadata = new Map([[item.id, { score: 1500, matchReason, matchMode: "strict" }]]);
    const facets = categoricalFacetsFor(matched, options);
    facets.ranges = rangeFacetsFor(rangeSource, options);
    return searchResponse({ options, matched, matchMetadata, facets, searchMode: "strict", started });
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
    const filtered = getCuratedSearchRecords().filter((item) => matchesBaseFilters(item, options));
    const matchMetadata = new Map();
    let searchMode = "strict";
    let rangeSource = filtered.filter((item) => {
      const match = strictTextMatch(item, options);
      if (match) matchMetadata.set(item.id, match);
      return Boolean(match);
    });
    if (!rangeSource.length) {
      searchMode = "fuzzy";
      rangeSource = filtered.filter((item) => {
        const match = fuzzyTextMatch(item, options);
        if (match) matchMetadata.set(item.id, match);
        return Boolean(match);
      });
    }
    const matched = rangeSource.filter((item) => matchesRangeFilters(item, options));
    sortItems(matched, options, matchMetadata);
    const facets = categoricalFacetsFor(matched, options);
    facets.ranges = rangeFacetsFor(rangeSource, options);
    return searchResponse({ options, matched, matchMetadata, facets, searchMode, started });
  }

  if (!options.tokens.length && options.normalizedQuery && options.identifierQuery && !/\d/.test(options.identifierQuery)) {
    return searchResponse({ options, matched: [], facets: buildFacets([]), searchMode: "filters", started });
  }

  const source = options.category === "All" && options.tokens.length ? getCandidateSearchIndex(candidateCategories) : getSearchIndex(options.category);
  const filtered = source.filter((item) => matchesBaseFilters(item, options));
  const matchMetadata = new Map();
  let rangeSource = filtered;
  let searchMode = options.tokens.length ? "strict" : "filters";
  const exactInstruments = options.identifierQuery ? filtered.filter((item) => {
    const match = exactInstrumentMatch(item, options);
    if (match) matchMetadata.set(item.id, match);
    return Boolean(match);
  }) : [];
  if (exactInstruments.length) {
    rangeSource = exactInstruments;
    searchMode = "strict";
  } else if (options.tokens.length) {
    rangeSource = filtered.filter((item) => {
      const match = strictTextMatch(item, options);
      if (match) matchMetadata.set(item.id, match);
      return Boolean(match);
    });
    if (!rangeSource.length) {
      searchMode = "fuzzy";
      rangeSource = filtered.filter((item) => {
        const match = fuzzyTextMatch(item, options);
        if (match) matchMetadata.set(item.id, match);
        return Boolean(match);
      });
    }
  } else if (options.normalizedQuery && options.identifierQuery) rangeSource = [];
  const matched = rangeSource.filter((item) => matchesRangeFilters(item, options));
  const facets = categoricalFacetsFor(matched, options);
  facets.ranges = rangeFacetsFor(rangeSource, options);
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

function researchStatusFor(item, seed) {
  if (item.flags.includes("CIO Select")) return {
    label: "Approved · Qualitative",
    tone: "approved",
    owner: "Chief Investment Office",
    reviewed: item.flags.includes("Research Updated") ? "Aug 18, 2026" : "Jul 24, 2026",
    nextReview: "Nov 2026",
    basis: "Full qualitative and quantitative review",
  };
  if (item.flags.includes("Research Updated")) return {
    label: "Approved · Quantitative",
    tone: "approved",
    owner: "Investment Solutions Research",
    reviewed: "Aug 18, 2026",
    nextReview: "Nov 2026",
    basis: "Current quantitative monitoring cycle",
  };
  if (item.status === "New") return {
    label: "Under review",
    tone: "review",
    owner: "Product Due Diligence",
    reviewed: "Aug 12, 2026",
    nextReview: "Sep 2026",
    basis: "Initial coverage review in progress",
  };
  return {
    label: "Available · Not rated",
    tone: "neutral",
    owner: item.category === "Equities" ? "Equity Research" : "Investment Solutions Research",
    reviewed: seed % 2 ? "Jul 24, 2026" : "Jul 17, 2026",
    nextReview: "Oct 2026",
    basis: "Available without an active approval designation",
  };
}

function controlsFor(item, seed) {
  const research = researchStatusFor(item, seed);
  const shelf = item.status === "Limited"
    ? { label: "Limited capacity", tone: "attention", detail: "Available subject to remaining capacity", effective: "Aug 6, 2026" }
    : item.status === "New"
      ? { label: "New to shelf", tone: "review", detail: "Recently added and available for research", effective: "Aug 12, 2026" }
      : { label: "Available", tone: "approved", detail: "Open on the illustrative product shelf", effective: "Aug 1, 2026" };
  const operations = item.status === "Limited"
    ? { label: "Capacity constrained", tone: "attention", detail: "Confirm capacity before use" }
    : item.category === "Structured" && item.status === "New"
      ? { label: "Offering open", tone: "review", detail: "Offering terms remain subject to close" }
      : item.category === "Alternatives" && item.status === "New"
        ? { label: "Subscription open", tone: "review", detail: "Operational onboarding available" }
        : { label: "Operationally ready", tone: "approved", detail: `${item.liquidity} implementation` };
  const sources = {
    Equities: "Illustrative Market Data Service",
    "Mutual Funds": "Illustrative Fund Data Feed",
    ETFs: "Illustrative Fund Data Feed",
    SMAs: "Strategy Master",
    "Fixed Income": "Illustrative Evaluated Pricing",
    Alternatives: "Private Markets Operations",
    Structured: "Structured Products Desk",
    "Managed Options": "Managed Solutions",
    Annuities: "Insurance Product Platform",
    "Precious Metals": "Precious Metals Desk",
  };
  const data = {
    label: "Current",
    tone: "approved",
    detail: `As of ${item.asOf}`,
    source: item.referenceSource ? "SEC issuer reference + illustrative market data" : sources[item.category] || "UPS Product Master",
    validated: "Validated Aug 21, 2026",
  };
  const categoryChanges = {
    Equities: ["Market and fundamentals refreshed", "Latest price, valuation and operating metrics passed validation."],
    "Mutual Funds": ["Fund data refreshed", "Performance, expenses and portfolio characteristics were updated."],
    ETFs: ["ETF data refreshed", "Market price, NAV relationship and portfolio characteristics were updated."],
    SMAs: ["Composite data refreshed", "Performance, assets and implementation terms were updated."],
    "Fixed Income": ["Price and yield refreshed", "Evaluated price, accrued interest and yield measures were updated."],
    Alternatives: ["Latest reported data ingested", "NAV, performance and liquidity terms passed the current validation cycle."],
    Structured: ["Offering terms refreshed", "Indicative value, coupon and offering terms were updated."],
    "Managed Options": ["Strategy data refreshed", "Composite performance and implementation terms were updated."],
    Annuities: ["Crediting terms refreshed", "Current rate, guarantee period and carrier terms were updated."],
    "Precious Metals": ["Reference price refreshed", "Reference price and custody terms passed validation."],
  };
  const [dataTitle, dataSummary] = categoryChanges[item.category];
  const shelfChange = item.status === "Limited"
    ? ["Capacity status changed", "Remaining availability is limited; confirm capacity before proceeding."]
    : item.status === "New"
      ? ["Added to the product shelf", "The product is newly available while the initial review cycle continues."]
      : ["Shelf availability reconfirmed", "Product Management reconfirmed current shelf availability."];
  const researchChange = research.tone === "approved"
    ? ["Research review completed", `${research.label} status was affirmed for the current monitoring cycle.`]
    : research.tone === "review"
      ? ["Initial review opened", "Product Due Diligence began the initial coverage assessment."]
      : ["Coverage status reviewed", "The product remains available without an active research approval designation."];
  return {
    research,
    shelf,
    operations,
    data,
    changes: [
      { date: "Aug 21, 2026", type: "Data", title: dataTitle, summary: dataSummary, owner: data.source },
      { date: research.reviewed, type: "Research", title: researchChange[0], summary: researchChange[1], owner: research.owner },
      { date: shelf.effective, type: "Shelf", title: shelfChange[0], summary: shelfChange[1], owner: "Product Management" },
    ],
  };
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
    const listing = item.manager.split("·")[1]?.trim();
    return {
      quote: { label: "Market price", value: `$${price}`, change: signedPercent(dayChange), changeTone: dayChange >= 0 ? "positive" : "negative", secondaryLabel: "Day range", secondaryValue: `$${fixed(seed, 3, Number(price) * 0.985, Number(price) * 1.012, 2)}–$${fixed(seed, 4, Number(price) * 1.013, Number(price) * 1.025, 2)}`, asOf },
      keyFacts: [
        { label: item.referenceSource ? "Illustrative market capitalization" : "Market capitalization", value: item.aum }, { label: item.referenceSource ? "Primary market" : "Sector", value: item.referenceSource ? listing : sector },
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
      fees: [{ label: "Product fee", value: item.fee === null ? "—" : `${item.fee.toFixed(2)}%` }, { label: "Additional expenses", value: "Product-specific" }, { label: "Transaction costs", value: "May apply" }],
    operations: commonOperations,
    research,
  };
}

function resolveInvestmentRecord(id) {
  const requested = String(id || "").toLowerCase();
  let item = CURATED.find((record) => record.id.toLowerCase() === requested || record.symbol.toLowerCase() === requested);
  if (!item) {
    const referenceIndex = equityReferenceIndexByTicker.get(normalizeIdentifier(requested));
    if (referenceIndex !== undefined) item = makeSynthetic("Equities", referenceIndex);
  }
  if (!item && requested.startsWith("eq-sec-")) {
    const referenceIndex = Number(requested.slice("eq-sec-".length));
    if (Number.isInteger(referenceIndex) && referenceIndex >= 0 && referenceIndex < EQUITY_UNIVERSE.length) item = makeSynthetic("Equities", referenceIndex);
  }
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
  return item || null;
}

export function getMarketSnapshots(ids = []) {
  return Object.fromEntries(ids.map((id) => {
    const item = resolveInvestmentRecord(id);
    return item ? [item.id, marketSnapshotFor(item)] : null;
  }).filter(Boolean));
}

export function getInvestmentDetail(id) {
  const item = resolveInvestmentRecord(id);
  if (!item) return null;
  const seed = hash(item.id);
  const performanceSeries = Array.from({ length: 18 }, (_, index) => 100 + index * 1.15 + Math.sin((seed % 8) + index / 2) * 3.2 + (seed % 17) / 5);
  const profile = profileFor(item, seed, performanceSeries);
  const controls = controlsFor(item, seed);
  return {
    ...item,
    canonicalSlug: item.id.startsWith("syn-") ? item.id : item.symbol,
    performanceSeries,
    profile,
    controls,
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
