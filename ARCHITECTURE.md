# Architecture

## Demo request path

1. The desktop browser sends only search text, allowlisted filters, sort and a 25-row cursor.
2. `/api/search` validates every value and rejects unknown criteria.
3. A lazily initialized server index holds the deterministic 130,428-record mock shelf.
4. The server applies structured filters, then requires every meaningful query term to match a whole word or word prefix in an indexed field.
5. Exact identifiers rank first; weighted product, manager, benchmark and vehicle fields determine relevance and provide a visible match explanation. A one-edit name/manager fallback runs only when strict search returns zero rows.
6. The server calculates facets and globally sorts the full matching set.
7. Only the requested 25-row slice and facet counts return to the browser.
8. `/api/detail` fetches one record by validated identifier or canonical public slug and returns shared core fields plus a vehicle-specific profile schema.

## Research profile navigation

- Result names are semantic links to `/investment/:slug`. An ordinary click is intercepted to open the profile in a 75–80% viewport canvas; modified clicks and the explicit new-tab action retain native browser behavior.
- `history.pushState` gives an in-context canvas a real URL. Browser Back closes it without rebuilding the search or losing filters, paging or scroll position.
- A direct profile URL renders the same data and markup as a standalone full-page profile. A Vercel rewrite and the local development server both route profile paths to the application shell.
- The client caches resolved profiles and starts a request only after 160 ms of hover/focus intent. It never preloads all 25 rows.
- Current values in the prototype are visibly labeled illustrative. Production should source price, NAV, yield and valuation timestamps from governed market-data services and preserve the same profile contract.

Warm searches are designed to remain under the one-second interaction budget in the demo runtime. The browser debounces typing for 260 ms, cancels stale work, keeps the current rows in place, and reveals a loading layer only after 180 ms. The initial server instance builds its mock index once.

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
