# Architecture

## Demo request path

1. The desktop browser sends only search text, allowlisted filters, sort and a 25-row cursor.
2. `/api/search` validates every value and rejects unknown criteria.
3. A lazily initialized server index holds the deterministic 130,428-record mock shelf.
4. The server filters, calculates facets and globally sorts the full matching set.
5. Only the requested 25-row slice and facet counts return to the browser.
6. `/api/detail` fetches one record by validated identifier.

Warm searches are designed to complete in tens of milliseconds in the demo runtime. The initial server instance builds its mock index once.

## Production replacement

- **Ingestion:** source adapters → validation/quarantine → canonical security and vehicle schemas → versioned search documents.
- **Search:** a managed OpenSearch/Elasticsearch cluster with analyzers for names, tickers, CUSIPs and manager aliases; doc values for facets and sorting; point-in-time cursor pagination.
- **API:** stateless backend-for-frontend enforcing identity, shelf entitlements, field-level permissions, query limits and response schemas.
- **Governance:** centrally owned flag definitions with effective dates, evidence, approver, geography/program scope and full change history.
- **Performance:** CDN-cache safe public metadata, short server result caches, request cancellation, query budgets, slow-query telemetry and load tests at expected advisor concurrency.
- **Controls:** SSO, least-privilege service identities, audit events, document entitlements, data lineage, disaster recovery and security/compliance review.

Do not copy the demo’s generated catalog into production. Preserve its bounded request/response contract and replace the implementation behind it.
