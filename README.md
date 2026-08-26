# UPS Investment Screener

Desktop-first, masked investment-shelf prototype deployed on Vercel. It demonstrates a responsive advisor search experience without loading the shelf into the browser.

## What is real in the demo

- A deterministic 130,428-record mock catalog exists in server memory.
- Search, combined filters, exact facets and global sorting run against that catalog.
- API responses are capped at 25 investments; the browser never downloads the universe.
- Natural-language phrases are converted to an explicit allowlist of governed filters.
- Detail, comparison, saved screens, saved investments, document previews and shareable screen URLs work.
- Inputs are validated and invalid categories, flags, risk levels and pagination values return HTTP 400.

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
