import { searchCatalog } from "../lib/catalog.js";
for (const category of ["Equities", "ETFs"]) {
  const sort = category === "Equities" ? "marketCap-desc" : "aum-desc";
  const result = searchCatalog({ category, sort });
  console.log(category, result.items.slice(0, 25).map(({ symbol, aum }) => ({ symbol, aum })));
}
