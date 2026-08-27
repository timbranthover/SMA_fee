export const UNIVERSE_SIZE = 130428;

export const CATEGORY_COUNTS = Object.freeze({
  All: UNIVERSE_SIZE,
  Equities: 22584,
  "Mutual Funds": 3338,
  ETFs: 1117,
  SMAs: 860,
  "Fixed Income": 93571,
  Alternatives: 498,
  Structured: 6900,
  "Managed Options": 420,
  Annuities: 780,
  "Precious Metals": 360,
});

export const CATEGORY_ORDER = Object.freeze(Object.keys(CATEGORY_COUNTS));
export const RISKS = Object.freeze(["Conservative", "Moderate", "High"]);
export const STATUSES = Object.freeze(["Available", "New", "Limited"]);
export const SORTS = Object.freeze(["relevance", "fee", "performance", "minimum"]);

export const FLAG_DEFINITIONS = Object.freeze({
  "CIO House View": { owner: "Chief Investment Office", definition: "Aligned with a current UPS CIO strategic or tactical investment view.", color: "red", code: "cio" },
  Sustainable: { owner: "Sustainable & Impact Investing", definition: "Classified under the governed sustainable investing framework for this prototype.", color: "green", code: "sus" },
  "SMA Select": { owner: "Advisory Products", definition: "Strategy participates in an illustrative managed-account access program.", color: "blue", code: "adv" },
  "Model Enabled": { owner: "Managed Solutions", definition: "Strategy is available through a model-delivery operating structure.", color: "purple", code: "mdl" },
  "Tax-Aware": { owner: "Portfolio Solutions", definition: "Includes an explicit tax-aware objective, process or customization capability.", color: "teal", code: "tax" },
  "Direct Indexing": { owner: "Portfolio Solutions", definition: "Provides direct ownership and systematic index-like portfolio construction.", color: "purple", code: "dir" },
  "New to Shelf": { owner: "Product Management", definition: "Approved and added to the investment shelf within the prior 90 days.", color: "black", code: "new" },
  "Limited Capacity": { owner: "Product Management", definition: "Available subject to remaining manager, issue or program capacity.", color: "amber", code: "lim" },
  "Research Updated": { owner: "Investment Solutions Research", definition: "The primary research review was refreshed within the prior 30 days.", color: "blue", code: "res" },
});

export const PRIMARY_FLAGS = Object.freeze(["CIO House View", "Sustainable", "SMA Select", "Model Enabled", "Tax-Aware", "Direct Indexing"]);
export const FLAG_COLORS = Object.freeze(Object.fromEntries(Object.entries(FLAG_DEFINITIONS).map(([name, definition]) => [name, definition.color])));
export const CATALOG_VERSION = "2026.08.27-profile.1";
