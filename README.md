# UPS Investment Screener

Desktop-first, masked investment-shelf prototype deployed on Vercel. It demonstrates a responsive advisor search experience without loading the shelf into the browser.

## What is real in the demo

- A deterministic 130,428-record mock catalog exists in server memory.
- Search uses exact ticker/CUSIP priority, field-weighted whole-word relevance, strict multi-term matching and a controlled name/manager typo fallback.
- Combined filters, exact facets and global sorting run against the complete catalog; each text result explains why it matched.
- The initial shelf, unfiltered category pages and curated ticker/CUSIP/name lookups use exact precomputed paths; category-specific searches build only the relevant deterministic shard.
- API responses are capped at 25 investments; the browser never downloads the universe.
- Natural-language phrases are converted to an explicit allowlist of governed filters.
- Curated company and manager marks are served locally, with deterministic identity matching and monogram fallbacks.
- Each investment has a vehicle-specific research profile covering its current illustrative value, benchmarked performance, composition, risk, costs, operating terms, UPS research and governed documents.
- A normal result click opens that profile in a large in-context research canvas; every profile also has a stable `/investment/:slug` URL that supports new tabs and direct sharing.
- Detail, comparison, saved screens, saved investments, document previews and shareable screen URLs work.
- Inputs are validated and invalid categories, flags, risk levels and pagination values return HTTP 400.
- The browser aborts stale requests, waits 260 ms for typing intent and delays loading chrome for 180 ms so fast results replace in place without flicker. Profile requests are cached and prefetched only after brief hover/focus intent.
- Search responses contain only list-and-compare fields; profile-only research data is retrieved from `/api/detail` after selection.

The investment data, performance, flags, product availability and company identity are illustrative. This is not an investment or production entitlement system.

## Run and test

```bash
npm run dev
npm test
npm run build
```

Open `http://127.0.0.1:4173` after starting the local server.

## Production direction

The UI/API boundary is deliberately production-shaped. A real implementation should replace the in-memory mock index with OpenSearch/Elasticsearch or a comparable governed search service, fed by versioned source-system pipelines. Keep the bounded API contract, strict query allowlist, cursor pagination, entitlement checks, audit logging and server-side facets. See [ARCHITECTURE.md](./ARCHITECTURE.md).
