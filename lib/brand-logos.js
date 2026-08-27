export const BRAND_LOGOS = Object.freeze({
  apple: { label: "Apple", src: "/assets/brands/apple.svg" },
  microsoft: { label: "Microsoft", src: "/assets/brands/microsoft.svg" },
  nvidia: { label: "NVIDIA", src: "/assets/brands/nvidia.svg" },
  chase: { label: "JPMorgan Chase", src: "/assets/brands/chase.svg" },
  nextera: { label: "NextEra Energy", src: "/assets/brands/nextera.svg" },
  vanguard: { label: "Vanguard", src: "/assets/brands/vanguard.svg" },
  fidelity: { label: "Fidelity Investments", src: "/assets/brands/fidelity.svg" },
  "capital-group": { label: "Capital Group", src: "/assets/brands/capital-group.svg" },
  "t-rowe-price": { label: "T. Rowe Price", src: "/assets/brands/t-rowe-price.png" },
  "alliance-bernstein": { label: "AllianceBernstein", src: "/assets/brands/alliance-bernstein.png" },
  nuveen: { label: "Nuveen", src: "/assets/brands/nuveen.png" },
  "neuberger-berman": { label: "Neuberger Berman", src: "/assets/brands/neuberger-berman.png" },
  parnassus: { label: "Parnassus Investments", src: "/assets/brands/parnassus.png" },
  pimco: { label: "PIMCO", src: "/assets/brands/pimco.png" },
  mfs: { label: "MFS Investment Management", src: "/assets/brands/mfs.png" },
  blackstone: { label: "Blackstone", src: "/assets/brands/blackstone.png" },
  cboe: { label: "Cboe", src: "/assets/brands/cboe.png" },
  schwab: { label: "Charles Schwab", src: "/assets/brands/schwab.png" },
});

const BRAND_RULES = [
  ["apple", /\bapple(?: inc\.?| corporation)?\b/i],
  ["microsoft", /\bmicrosoft(?: corp(?:oration)?\.?)?\b/i],
  ["nvidia", /\bnvidia(?: corporation)?\b/i],
  ["chase", /\b(?:j\.?p\.?\s*morgan|jpmorgan|chase)\b/i],
  ["nextera", /\bnextera energy\b/i],
  ["vanguard", /\bvanguard\b/i],
  ["fidelity", /\bfidelity(?: investments)?\b/i],
  ["capital-group", /\b(?:capital group|american funds)\b/i],
  ["t-rowe-price", /\bt\.?\s*rowe price\b/i],
  ["alliance-bernstein", /\b(?:alliancebernstein|alliance bernstein)\b/i],
  ["nuveen", /\bnuveen\b/i],
  ["neuberger-berman", /\bneuberger\s+berman\b/i],
  ["parnassus", /\bparnassus(?: investments)?\b/i],
  ["pimco", /\bpimco\b/i],
  ["mfs", /\bmfs(?: investment management)?\b/i],
  ["blackstone", /\bblackstone\b/i],
  ["cboe", /\bcboe(?: vest)?\b/i],
  ["schwab", /\b(?:charles\s+)?schwab\b/i],
];

const managerBrandCache = new Map();

function matchBrand(identity = "") {
  return BRAND_RULES.find(([, pattern]) => pattern.test(identity))?.[0] || null;
}

export function resolveBrandKey(item = {}) {
  const nameMatch = matchBrand(item.name);
  if (nameMatch || !item.manager) return nameMatch;
  if (!managerBrandCache.has(item.manager)) managerBrandCache.set(item.manager, matchBrand(item.manager));
  return managerBrandCache.get(item.manager);
}

export function brandLogo(key) {
  return key ? BRAND_LOGOS[key] || null : null;
}
