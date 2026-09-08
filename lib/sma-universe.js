// Illustrative shelf records, with stable IDs and coherent strategy-level metadata.
// These are examples, not representations of actual managers' products or terms.
const prefixes = ["Cedar", "Juniper", "Laurel", "Willow", "Alder", "Aspen", "Birch", "Elm", "Sequoia"];
const suffixes = ["Harbor", "Ridge", "Valley", "Grove", "Point"];
export const SMA_DEMO_MANAGERS = ["AllianceBernstein", "BlackRock", "Nuveen Asset Management", "UPS Asset Management", "Neuberger Berman", ...prefixes.flatMap((prefix) => suffixes.map((suffix) => `${prefix} ${suffix}`))];
const profile = (name, assetClass, objective, benchmark, risk, minimum, fee, flags = []) => ({ name, assetClass, objective, benchmark, risk, minimum, fee, flags });
const taxIndex = ["Tax-Aware", "Direct Indexing"];
export const SMA_DEMO_STRATEGIES = [
  profile("Tax-Managed US Large Cap Index", "US Large Blend", "Tax-aware core equity", "S&P 500", "Moderate", 250000, .30, taxIndex),
  profile("Tax-Managed US Broad Market Index", "US Broad Market Equity", "Tax-aware broad market exposure", "Russell 3000", "Moderate", 100000, .25, taxIndex),
  profile("Tax-Managed US Value Index", "US Large Value", "Tax-aware value exposure", "Russell 1000 Value", "Moderate", 250000, .35, taxIndex),
  profile("Tax-Managed US Growth Index", "US Large Growth", "Tax-aware growth exposure", "Russell 1000 Growth", "Moderate", 250000, .35, taxIndex),
  profile("Tax-Managed US Mid Cap Index", "US Mid Cap Equity", "Tax-aware mid-cap exposure", "Russell Midcap", "Moderate", 500000, .40, taxIndex),
  profile("Sustainable US Direct Index", "US Large Blend", "Customizable sustainable core equity", "MSCI USA", "Moderate", 250000, .38, [...taxIndex, "Sustainable"]),
  profile("US Quality Core", "US Large Blend", "Quality-focused core equity", "Russell 1000", "Moderate", 100000, .40),
  profile("US Dividend Growth", "US Large Value", "Dividend income and growth", "Russell 1000 Value", "Moderate", 100000, .42),
  profile("US Focus Growth", "US Large Growth", "Concentrated growth equity", "Russell 1000 Growth", "High", 100000, .55),
  profile("US Small Cap Value", "US Small Cap Equity", "Small-cap value exposure", "Russell 2000 Value", "High", 250000, .65),
  profile("International Quality Equity", "International Equity", "Developed-market diversification", "MSCI EAFE", "Moderate", 250000, .50),
  profile("Global Dividend Equity", "Global Equity", "Global dividend income", "MSCI ACWI", "Moderate", 100000, .48),
  profile("Emerging Markets Equity", "Emerging Markets Equity", "Emerging-market diversification", "MSCI Emerging Markets", "High", 500000, .70),
  profile("Short Municipal Income", "Municipal Bond", "Short-duration tax-exempt income", "Bloomberg 1-5 Year Municipal", "Conservative", 100000, .22, ["Tax-Aware"]),
  profile("Intermediate Municipal Income", "Municipal Bond", "Intermediate tax-exempt income", "Bloomberg 1-15 Year Municipal", "Conservative", 250000, .28, ["Tax-Aware"]),
  profile("New York Municipal Income", "Municipal Bond", "New York tax-exempt income", "Bloomberg New York Municipal", "Conservative", 250000, .30, ["Tax-Aware"]),
  profile("California Municipal Income", "Municipal Bond", "California tax-exempt income", "Bloomberg California Municipal", "Conservative", 250000, .30, ["Tax-Aware"]),
  profile("Short Treasury Ladder", "US Government", "Capital preservation and scheduled income", "Bloomberg 1-3 Year US Treasury", "Conservative", 100000, .15),
  profile("Investment Grade Corporate Ladder", "Investment Grade Corporate", "Investment-grade corporate income", "Bloomberg US Corporate", "Moderate", 250000, .25),
  profile("Core Bond Portfolio", "Core Bond", "Diversified fixed income", "Bloomberg US Aggregate", "Conservative", 100000, .30),
];

export function illustrativeSMA(index) {
  const strategy = SMA_DEMO_STRATEGIES[index % SMA_DEMO_STRATEGIES.length];
  const manager = SMA_DEMO_MANAGERS[Math.floor(index / SMA_DEMO_STRATEGIES.length)];
  if (!manager) throw new RangeError("Illustrative SMA identity capacity exceeded");
  return { ...strategy, name: `${manager} ${strategy.name}`, manager, type: "Illustrative SMA", symbol: `SMA${String(index + 1).padStart(4, "0")}` };
}
