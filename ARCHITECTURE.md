# Architecture

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

- **Ingestion:** source adapters → validation/quarantine → canonical security and vehicle schemas → versioned search documents.
- **Search:** a managed OpenSearch/Elasticsearch cluster with analyzers for names, tickers, CUSIPs and manager aliases; doc values for facets and sorting; point-in-time cursor pagination.
- **API:** stateless backend-for-frontend enforcing identity, shelf entitlements, field-level permissions, query limits and response schemas.
- **Governance:** centrally owned flag definitions with effective dates, evidence, approver, geography/program scope and full change history.
- **Performance:** CDN-cache safe public metadata, short server result caches, request cancellation, query budgets, slow-query telemetry and load tests at expected advisor concurrency.
- **Controls:** SSO, least-privilege service identities, audit events, document entitlements, data lineage, disaster recovery and security/compliance review.

Do not copy the demo’s generated catalog into production. Preserve its bounded request/response contract and replace the implementation behind it.
