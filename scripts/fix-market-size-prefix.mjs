import fs from "node:fs";
const file = "lib/catalog.js";
const source = fs.readFileSync(file, "utf8");
const pattern = /function compactMarketSize\(value, suffix = ""\) \{[\s\S]*?\n\}/;
const matches = source.match(new RegExp(pattern.source, "g")) || [];
if (matches.length !== 1) throw new Error(`Expected one compactMarketSize function, found ${matches.length}`);
const replacement = `function compactMarketSize(value, suffix = "") {
  if (!Number.isFinite(value) || value < 0) return "—";
  const format = (number, unit) => {
    const amount = number.toFixed(number >= 100 ? 0 : number >= 10 ? 1 : 2).replace(/\\.0+$|(?<=\\.[0-9])0$/g, "");
    return "$" + amount + unit + suffix;
  };
  if (value >= 1_000_000_000_000) return format(value / 1_000_000_000_000, "T");
  if (value >= 1_000_000_000) return format(value / 1_000_000_000, "B");
  if (value >= 1_000_000) return format(value / 1_000_000, "M");
  return format(value / 1_000, "K");
}`;
fs.writeFileSync(file, source.replace(pattern, replacement));
console.log("Corrected compact market-size currency prefix.");
