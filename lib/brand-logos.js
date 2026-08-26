export const BRAND_LOGOS = Object.freeze({
  apple: { label: "Apple", src: "/assets/brands/apple.svg" },
  microsoft: { label: "Microsoft", src: "/assets/brands/microsoft.svg" },
  nvidia: { label: "NVIDIA", src: "/assets/brands/nvidia.svg" },
  chase: { label: "JPMorgan Chase", src: "/assets/brands/chase.svg" },
  nextera: { label: "NextEra Energy", src: "/assets/brands/nextera.svg" },
  vanguard: { label: "Vanguard", src: "/assets/brands/vanguard.svg" },
  fidelity: { label: "Fidelity Investments", src: "/assets/brands/fidelity.svg" },
  "capital-group": { label: "Capital Group", src: "/assets/brands/capital-group.svg" },
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
];

export function resolveBrandKey(item = {}) {
  const identity = [item.name, item.manager].filter(Boolean).join(" · ");
  return BRAND_RULES.find(([, pattern]) => pattern.test(identity))?.[0] || null;
}

export function brandLogo(key) {
  return key ? BRAND_LOGOS[key] || null : null;
}
