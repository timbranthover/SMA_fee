# UPS Advisor Workspace

Desktop-first, masked vision prototype deployed on Vercel. It connects a synthetic Total Wealth household view to the existing institutional investment screener without obscuring how or why the handoff occurs.

## What is real in the demo

- The default Total Wealth workspace contains one internally coherent synthetic household spanning accounts, held-away assets, liabilities, allocation, goals, cash needs and prioritized advisor work.
- A concentrated Apple position opens an in-context household analysis with account location, cost basis, scenario impact, policy comparison and research context.
- The analysis passes an explicit objective bundle into the existing screener. It never claims hidden suitability, eligibility or recommendation logic; the advisor can see and edit every resulting criterion.
- The same locally bundled Lightweight Charts library powers both investable-wealth history and investment comparison, keeping the experience smooth without a remote charting or market-data dependency.
- Selected diversification alternatives remain in memory when the advisor returns to Total Wealth, closing the loop from household fact to research activity.
- A deterministic 130,428-record mock catalog exists in server memory.
- Search uses exact ticker/CUSIP priority, field-weighted whole-word relevance, strict multi-term matching and a controlled name/manager typo fallback.
- Combined filters, exact facets and global sorting run against the complete catalog; sorting adapts to the active vehicle and visible quantitative columns, and each text result explains why it matched.
- Numeric criteria expose compact 12-bucket distributions, medians, exact bounds and live match previews. The criteria are vehicle-aware, persisted in saved/shareable screens and evaluated against the complete matched set.
- Category-specific searches build only the relevant deterministic shard; curated ticker, CUSIP and exact-name lookups avoid broad catalog scans.
- API responses are capped at 25 investments; the browser never downloads the universe.
- Result columns adapt to the selected vehicle and add cached price/NAV, trend and decision metrics in one post-render batch rather than per-row requests. Users can choose, order and persist up to five valid fields or apply a vehicle-specific Research, Performance, Income, Risk, or Cost preset; incompatible fields are excluded by configuration.
- Natural-language phrases are converted to an explicit allowlist of governed filters.
- Curated company and manager marks are served locally, with deterministic identity matching and monogram fallbacks.
- Each investment has a vehicle-specific research profile covering its current illustrative value, benchmarked performance, composition, risk, costs, operating terms and UPS research.
- Every profile separates research standing, shelf availability, operational readiness and data freshness, with ownership, review dates and a compact recent-change history.
- A normal result click opens that profile in a large in-context research canvas; every profile also has a stable `/investment/:slug` URL that supports new tabs and direct sharing.
- Detail, comparison, saved screens, saved investments and shareable screen URLs work.
- Inputs are validated and invalid categories, flags, risk levels, numeric ranges and pagination values return HTTP 400.
- The browser aborts stale requests, waits 260 ms for typing intent and delays loading chrome for 180 ms so fast results replace in place without flicker. Range dragging stays local and requests only on commit; baseline distributions are cached per server instance. Profile requests are cached and prefetched only after brief hover/focus intent.
- Search responses contain only list-and-compare fields; profile-only research data is retrieved from `/api/detail` after selection.

The household, investment data, performance, flags, product availability and company identity are illustrative. This is not a financial plan, recommendation, investment or production entitlement system.

## Run and test

```bash
npm run dev
npm test
npm run build
```

Open `http://127.0.0.1:4173` after starting the local server. The screener is also available directly at `/investments`.

## Production direction

The UI/API boundary is deliberately production-shaped. A real implementation should replace the in-memory mock index with OpenSearch/Elasticsearch or a comparable governed search service, fed by versioned source-system pipelines. Keep the bounded API contract, strict query allowlist, cursor pagination, entitlement checks, audit logging and server-side facets. See [ARCHITECTURE.md](./ARCHITECTURE.md).
