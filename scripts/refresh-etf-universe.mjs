import { writeFile } from "node:fs/promises";

const NASDAQ_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const OUTPUT_URL = new URL("../lib/etf-universe.js", import.meta.url);
const TARGET_COUNT = 1117;

const EXCHANGE_CODES = new Map([
  ["A", "NYSE American"],
  ["N", "NYSE"],
  ["P", "NYSE Arca"],
  ["Z", "Cboe BZX"],
  ["V", "IEX"],
]);

const PRIORITY_TICKERS = [
  "SPY", "IVV", "VOO", "VTI", "QQQ", "QQQM", "DIA", "IWM", "IJH", "IJR", "ITOT", "SPLG",
  "SCHB", "SCHX", "SCHD", "SCHG", "VUG", "VTV", "VB", "RSP", "QUAL", "USMV", "MTUM", "AVUV", "AVUS", "DFAU", "DFAC",
  "VXUS", "VEA", "VWO", "IEFA", "EFA", "EEM", "ACWI", "VT", "SCHF", "SPEM",
  "BND", "AGG", "BNDX", "BSV", "BIV", "BLV", "LQD", "HYG", "JNK", "TLT", "IEF", "SHY", "SGOV", "BIL", "VCSH", "VCLT",
  "MUB", "VTEB", "EMB", "PFF", "BKLN", "CLOA",
  "GLD", "IAU", "SLV", "USO", "XLE", "XLK", "XLF", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "SMH", "SOXX", "VGT", "IYW",
  "ARKK", "JEPI", "JEPQ", "DIVO", "VIG", "DGRO", "HDV", "NOBL", "IBIT", "FBTC", "BITB", "SUSL",
];

const ISSUER_RULES = [
  [/^iShares\b/i, "BlackRock"],
  [/^(?:SPDR|State Street)\b/i, "State Street Global Advisors"],
  [/^Vanguard\b/i, "Vanguard"],
  [/^Invesco\b/i, "Invesco"],
  [/^(?:First Trust|FT Vest)\b/i, "First Trust"],
  [/^JPMorgan\b/i, "J.P. Morgan Asset Management"],
  [/^Fidelity\b/i, "Fidelity Investments"],
  [/^Schwab\b/i, "Charles Schwab Investment Management"],
  [/^Dimensional\b/i, "Dimensional Fund Advisors"],
  [/^Global X\b/i, "Global X"],
  [/^VanEck\b/i, "VanEck"],
  [/^ProShares\b/i, "ProShares"],
  [/^Direxion\b/i, "Direxion"],
  [/^WisdomTree\b/i, "WisdomTree"],
  [/^Franklin\b/i, "Franklin Templeton"],
  [/^Avantis\b/i, "Avantis Investors"],
  [/^Pacer\b/i, "Pacer ETFs"],
  [/^Innovator\b/i, "Innovator Capital Management"],
  [/^Goldman Sachs\b/i, "Goldman Sachs Asset Management"],
  [/^Capital Group\b/i, "Capital Group"],
  [/^American Century\b/i, "American Century Investments"],
  [/^T\. Rowe Price\b/i, "T. Rowe Price"],
  [/^Nuveen\b/i, "Nuveen"],
  [/^VictoryShares\b/i, "Victory Capital"],
  [/^FlexShares\b/i, "Northern Trust"],
  [/^Principal\b/i, "Principal Asset Management"],
  [/^PGIM\b/i, "PGIM"],
  [/^BNY(?: Mellon)?\b/i, "BNY Investments"],
  [/^Hartford\b/i, "Hartford Funds"],
  [/^Janus Henderson\b/i, "Janus Henderson"],
  [/^ALPS\b/i, "ALPS Advisors"],
  [/^AdvisorShares\b/i, "AdvisorShares"],
  [/^Amplify\b/i, "Amplify ETFs"],
  [/^Simplify\b/i, "Simplify Asset Management"],
  [/^NEOS\b/i, "NEOS Investments"],
  [/^Roundhill\b/i, "Roundhill Investments"],
  [/^Defiance\b/i, "Defiance ETFs"],
  [/^YieldMax\b/i, "YieldMax ETFs"],
  [/^GraniteShares\b/i, "GraniteShares"],
  [/^REX\b/i, "REX Shares"],
  [/^Tradr\b/i, "Tradr ETFs"],
  [/^Tema\b/i, "Tema ETFs"],
  [/^Alpha Architect\b/i, "Alpha Architect"],
  [/^Cambria\b/i, "Cambria Investment Management"],
  [/^ARK\b/i, "ARK Invest"],
  [/^Bitwise\b/i, "Bitwise Asset Management"],
  [/^Grayscale\b/i, "Grayscale Investments"],
  [/^21Shares\b/i, "21Shares"],
  [/^Calamos\b/i, "Calamos Investments"],
  [/^KraneShares\b/i, "KraneShares"],
  [/^BondBloxx\b/i, "BondBloxx Investment Management"],
  [/^abrdn\b/i, "abrdn"],
  [/^(?:USCF|United States (?:Oil|Natural Gas|Commodity|Copper|12 Month))\b/i, "USCF Investments"],
  [/^Teucrium\b/i, "Teucrium"],
  [/^Aptus\b/i, "Aptus Capital Advisors"],
  [/^Rareview\b/i, "Rareview Capital"],
  [/^Syntax\b/i, "Syntax Advisors"],
  [/^TrueShares\b/i, "TrueMark Investments"],
  [/^Engine No\. 1\b/i, "Engine No. 1"],
  [/^IndexIQ\b/i, "IndexIQ"],
];

function issuerFor(name) {
  return ISSUER_RULES.find(([pattern]) => pattern.test(name))?.[1] || null;
}

function parsePipe(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split("|");
  return lines
    .filter((line) => line && !line.startsWith("File Creation Time"))
    .map((line) => Object.fromEntries(line.split("|").map((value, index) => [headers[index], value])));
}

function cleanName(value) {
  return String(value)
    .replace(/\s+-\s+ETF\s*$/i, " ETF")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

async function download(url) {
  const response = await fetch(url, { headers: { Accept: "text/plain", "User-Agent": "UPS Investment Screener prototype https://github.com/timbranthover/SMA_fee" } });
  if (!response.ok) throw new Error(`ETF reference download failed (${response.status}) for ${url}`);
  return response.text();
}

const [nasdaqText, otherText] = await Promise.all([download(NASDAQ_URL), download(OTHER_URL)]);
const candidates = [];
const seen = new Set();

for (const row of parsePipe(nasdaqText)) {
  if (row.ETF !== "Y" || row["Test Issue"] !== "N") continue;
  const ticker = String(row.Symbol || "").trim().toUpperCase();
  const name = cleanName(row["Security Name"]);
  const issuer = issuerFor(name);
  if (!ticker || !name || !issuer || seen.has(ticker)) continue;
  seen.add(ticker);
  candidates.push([ticker, name, "NASDAQ", issuer]);
}

for (const row of parsePipe(otherText)) {
  if (row.ETF !== "Y" || row["Test Issue"] !== "N") continue;
  const ticker = String(row["ACT Symbol"] || row["NASDAQ Symbol"] || "").trim().toUpperCase();
  const name = cleanName(row["Security Name"]);
  const exchange = EXCHANGE_CODES.get(row.Exchange);
  const issuer = issuerFor(name);
  if (!ticker || !name || !exchange || !issuer || seen.has(ticker)) continue;
  seen.add(ticker);
  candidates.push([ticker, name, exchange, issuer]);
}

if (candidates.length < TARGET_COUNT) throw new Error(`Only ${candidates.length} issuer-resolved ETFs found; need ${TARGET_COUNT}`);
const byTicker = new Map(candidates.map((row) => [row[0], row]));
const selected = [];
const selectedTickers = new Set();
for (const ticker of PRIORITY_TICKERS) {
  const row = byTicker.get(ticker);
  if (!row || selectedTickers.has(ticker)) continue;
  selected.push(row);
  selectedTickers.add(ticker);
}

const remaining = candidates
  .filter(([ticker]) => !selectedTickers.has(ticker))
  .sort((left, right) => hash(left[0]) - hash(right[0]) || left[0].localeCompare(right[0]));
for (const row of remaining) {
  if (selected.length >= TARGET_COUNT) break;
  selected.push(row);
  selectedTickers.add(row[0]);
}

if (selected.length !== TARGET_COUNT) throw new Error(`Selected ${selected.length} ETFs; expected ${TARGET_COUNT}`);
selected.sort((left, right) => left[0].localeCompare(right[0]));

const generatedDate = new Date().toISOString().slice(0, 10);
const output = `// Generated by scripts/refresh-etf-universe.mjs from Nasdaq Trader's current symbol directories.\n// Tickers, fund names, listing exchanges and issuer mappings are sourced/derived from current listed identities; demo analytics remain illustrative.\nexport const ETF_REFERENCE_SOURCES = Object.freeze(${JSON.stringify([NASDAQ_URL, OTHER_URL])});\nexport const ETF_REFERENCE_AS_OF = ${JSON.stringify(generatedDate)};\nexport const ETF_UNIVERSE = Object.freeze(${JSON.stringify(selected)});\n`;
await writeFile(OUTPUT_URL, output);

const issuerCounts = new Map();
for (const [, , , issuer] of selected) issuerCounts.set(issuer, (issuerCounts.get(issuer) || 0) + 1);
console.log(`Wrote ${selected.length.toLocaleString("en-US")} current listed ETFs to ${OUTPUT_URL.pathname}`);
console.log(`Resolved ${new Set(selected.map((row) => row[3])).size} issuers from ${candidates.length.toLocaleString("en-US")} eligible current ETFs.`);
console.log([...issuerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([issuer, count]) => `${issuer}: ${count}`).join(" | "));
