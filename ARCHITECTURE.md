# Architecture

## Advisor-workspace flow

1. `/` requests one bounded household projection from `/api/wealth?householdId=...`. Canonical wealth records and indexes stay server-side; the browser never downloads the advisor's underlying book dataset.
2. The wealth repository validates entity IDs and foreign-key relationships once, then builds primary-key, household, account and household+instrument indexes. Household/account lookups do not require scanning the full book.
3. The server-side wealth service assembles the bounded browser contract and derives household financial assets, net worth, cash and goal counts from underlying account, asset, liability and goal records. Projections are cached by household/account ID for the life of the loaded source dataset.
4. The browser lazily loads the same locally bundled Lightweight Charts module already used for comparison and draws only the selected 1Y, 3Y or 5Y investable-wealth window. Account and goal detail are bounded projections from the same household contract, so drill-downs need no second source of truth.
5. A prioritized household insight opens an in-context analysis drawer. The concentration review keeps exposure, account location, cost basis, policy target, scenario impact and research standing visibly separate.
6. Selecting an implementation path creates an explicit scenario bundle containing objective, category, flags and risk. It switches to `/investments`, paints the scenario in a persistent ribbon and executes the normal bounded search request.
7. The screener remains independently usable and client-agnostic. Every passed criterion is visible and removable; no hidden client-fit or recommendation score is introduced.
8. Existing comparison state survives navigation back to Total Wealth, allowing the original household insight to show how many diversification alternatives have been selected.

The prototype now preserves the production seam as `normalized source → indexed repository → wealth service → bounded household BFF → browser projection`. A real database, portfolio-accounting service or aggregation layer can replace the demo source/repository behind that seam without changing the Total Wealth presentation contract.

## Wealth domain boundary

- Canonical records are normalized by entity: advisor, household, account, account allocation, position, non-financial asset, liability, goal, insight, concentration policy, household allocation/holding snapshot and history. Accounts do not embed holdings or allocation arrays in the canonical source model.
- Every relationship is explicit through stable IDs. Repository construction rejects duplicate IDs, missing foreign keys and cross-household account/position relationships before the application can render inconsistent data.
- The repository builds `Map` indexes once for primary keys and high-use relationships, including household→accounts, account→positions and household+instrument→positions. This is the same access pattern needed for books with thousands of households and tens or hundreds of thousands of related records; request work stays bounded to the selected household/account rather than scanning the full book.
- Household financial assets are the sum of account market values. Investable cash is the sum of account cash balances. Non-financial assets and liabilities are separately aggregated, and net worth is derived from those components. Goal progress is derived from funded/target amounts, and goal status counts are derived from goal records rather than duplicated household totals.
- Household allocation and top-holding records remain explicit as-of snapshots because the prototype does not yet carry every underlying position required to recompute those views faithfully. They are modeled as first-class snapshot entities so a future portfolio-accounting or analytics service can replace them without changing the consumer contract.
- The service returns immutable, browser-shaped projections and caches them by household/account ID. This prevents presentation code from mutating canonical records and creates the insertion point for permission checks, entitlements, freshness metadata and server-side aggregation.
- `/api/wealth` accepts one validated household ID and returns only that household projection. Responses are `private, no-store` and vary on authentication context. The demo does not implement authentication, but the endpoint is deliberately shaped so production entitlement checks happen before projection retrieval rather than in the browser.
- Canonical wealth source, repository and service modules are not copied into the public static bundle. The browser receives only `wealth-data.js`, which requests the bounded BFF contract. This prevents future book-level datasets from becoming downloadable application assets.
- Demo monetary values are whole USD numbers because the current UI renders whole-dollar values. A production canonical store should use authoritative decimal/minor-unit conventions plus currency/FX metadata; that choice remains behind the service projection boundary.
- The current `wealth-data.js` module is a browser compatibility facade. Existing UI imports continue to receive the same Morrison contract while the implementation now resolves that contract over the household BFF, allowing Phase 1 to land with no intended visual regression.

## Demo request path

1. The desktop browser sends only search text, allowlisted filters, sort and a 25-row cursor.
2. `/api/search` validates every value and rejects unknown criteria.
3. The deterministic 130,428-record mock shelf is divided into lazily initialized category shards. Curated instrument lookups use an exact identifier map, while broad screens evaluate the relevant deterministic shards.
4. The server applies structured filters, then requires every meaningful query term to match a whole word or word prefix in an indexed field.
5. Exact identifiers rank first; weighted product, manager, benchmark and vehicle fields determine relevance and provide a visible match explanation. A one-edit name/manager fallback runs only when strict search returns zero rows.
6. The server calculates categorical facets plus compact numeric distributions and globally sorts the full matching set. Numeric histograms are calculated before numeric bounds, so the shape remains stable while a user tightens a range.
7. Only the requested 25-row list-and-compare projection, counts and 12-bin distribution summaries return first; detail-only fields remain behind `/api/detail`.
8. After the rows paint, one cached `/api/snapshots` request enriches only those visible records with vehicle-specific market values, decision metrics and compact trend series. There are no per-row calls, and the search response stays below its existing payload budget.
9. The client resolves result columns through a category allowlist. Layouts are capped at five data columns, stored per vehicle in the browser, and encoded into saved screens and shareable URLs. Category-specific metric identifiers prevent fields such as custody fee or forward P/E from crossing into incompatible vehicles.
10. `/api/detail` fetches one record by validated identifier or canonical public slug and returns shared core fields plus a vehicle-specific profile schema.

## Numeric distribution filters

- A shared category allowlist determines which numeric criteria apply to each vehicle. Incompatible fields fail closed at the API boundary.
- Each facet response contains only its domain, median, 12 bucket counts and completeness count. The browser never receives the underlying records.
- Dual-handle changes repaint locally for immediate feedback. Search runs once the user commits the selection, and stale work remains cancellable.
- Baseline distributions are memoized by category for the life of a warm server instance. Active numeric bounds reuse that baseline because distributions intentionally exclude the numeric filters themselves.
- Range state is encoded in the URL and saved-screen schema. Legacy fee and minimum links remain readable.

## Research profile navigation

- Result names are semantic links to `/investment/:slug`. An ordinary click is intercepted to open the profile in a 75–80% viewport canvas; modified clicks and the explicit new-tab action retain native browser behavior.
- `history.pushState` gives an in-context canvas a real URL. Browser Back closes it without rebuilding the search or losing filters, paging or scroll position.
- A direct profile URL renders the same data and markup as a standalone full-page profile. A Vercel rewrite and the local development server both route profile paths to the application shell.
- The client caches resolved profiles and starts a request only after 160 ms of hover/focus intent. It never preloads all 25 rows.
- Current values in the prototype are visibly labeled illustrative. Production should source price, NAV, yield and valuation timestamps from governed market-data services and preserve the same profile contract.

Warm searches are designed to remain under the one-second interaction budget in the demo runtime. The browser debounces typing for 260 ms, cancels stale search and snapshot work, keeps the current rows in place, and reveals a loading layer only after 180 ms. Broad filters initialize only the shards they require, which are then reused for the life of the server instance. Numeric distribution baselines and visible-row snapshots are cached, so repeat screening does not rebuild the same supporting data.

## Brand identity

- Search records expose a stable `brandKey`, never an arbitrary remote image URL.
- The browser resolves that key through a small allowlisted registry of locally served, symbol-only image marks.
- Logo tiles stay exactly 31 × 31 pixels and use per-mark sizing so visually different symbols feel balanced.
- A monogram remains the deterministic fallback for managers without a legible compact symbol or if an asset fails to load.
- Production teams can expand the registry through a reviewed asset pipeline without changing the search contract or depending on a third-party logo service at runtime.

## Production replacement

- **Wealth ingestion:** CRM/mastered party relationships, portfolio accounting, held-away aggregation, planning and liability sources → validation/quarantine → canonical wealth entities with lineage and as-of metadata.
- **Wealth API:** the current bounded household BFF is the prototype seam. Production adds SSO identity, advisor/book entitlements, field-level permissions, authoritative source adapters, freshness/lineage metadata, audit events and database-backed projections behind the same household contract.
- **Investment ingestion:** source adapters → validation/quarantine → canonical security and vehicle schemas → versioned search documents.
- **Search:** a managed OpenSearch/Elasticsearch cluster with analyzers for names, tickers, CUSIPs and manager aliases; doc values for facets and sorting; point-in-time cursor pagination.
- **API:** stateless backend-for-frontend enforcing identity, shelf entitlements, field-level permissions, query limits and response schemas.
- **Governance:** centrally owned flag definitions with effective dates, evidence, approver, geography/program scope and full change history.
- **Performance:** CDN-cache safe public metadata, short server result caches, request cancellation, query budgets, slow-query telemetry and load tests at expected advisor concurrency.
- **Controls:** SSO, least-privilege service identities, audit events, document entitlements, data lineage, disaster recovery and security/compliance review.
- **Product controls:** research standing, shelf availability, operational readiness and data freshness are separate versioned states. Each state requires an owner, source, effective date and immutable change history; the prototype now models this API contract with illustrative data.

Do not copy the demo’s generated catalog or synthetic wealth source into production. Preserve the bounded contracts and replace the implementations behind them.


## Decision and action layer

Phase Three adds a normalized decision domain above household facts and below implementation. `lib/decision-source.js` enriches the server-only advisor-book dataset with stable `decisions` and `householdEvents`; `lib/decision-service.js` exposes bounded summary, detail, scenario, meeting-brief and timeline projections. `/api/decision` enforces the same advisor-to-household boundary as `/api/wealth` and never sends the full book or server source modules to the browser.

Scenario calculations are explicit transformations of the selected household's current values plus visible user-editable assumptions. They model consequences; they do not create a hidden suitability score or investment recommendation. Investment criteria passed from a decision into the existing screener remain visible and editable.

The prototype persists advisor-created action-plan workflow state in a small versioned browser adapter (`lib/decision-data.js`) because this demo has no durable write database. The UI does not own the decision math or canonical household data. A production implementation should replace that adapter with authenticated, audited server writes while preserving the stable decision/plan IDs and read projections.
