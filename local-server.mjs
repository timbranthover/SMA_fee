import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { searchCatalog } from "./lib/catalog.js";
import { getInvestmentDetail } from "./lib/catalog.js";
import { inputFromQuery } from "./api/search.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8" };

function queryObject(searchParams) {
  return Object.fromEntries(searchParams.entries());
}

function json(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/api/search") {
    try { return json(response, searchCatalog(inputFromQuery(queryObject(url.searchParams)))); }
    catch (error) { return json(response, { error: error.message }, error instanceof RangeError ? 400 : 500); }
  }
  if (url.pathname === "/api/detail") {
    const detail = getInvestmentDetail(url.searchParams.get("id") || "");
    return detail ? json(response, detail) : json(response, { error: "Investment not found" }, 404);
  }
  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const path = join(root, safePath);
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Investment Screener running at http://127.0.0.1:${port}\n`);
});
