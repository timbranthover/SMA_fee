const BASE_PATH = location.pathname.match(/^\/[^/]+/)?.[0] || "";
const DEMO_ADVISOR_ID = "advisor-042";
const nativeFetch = window.fetch.bind(window);

window.__PAGES_PREVIEW_BASE_PATH = BASE_PATH;
window.__pagesPreviewPathname = () => {
  const path = location.pathname;
  return BASE_PATH && path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) || "/" : path;
};

function withBasePath(path) {
  if (!path || typeof path !== "string" || !path.startsWith("/")) return path;
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

for (const method of ["pushState", "replaceState"]) {
  const original = history[method].bind(history);
  history[method] = (state, unused, url) => original(state, unused, typeof url === "string" ? withBasePath(url) : url);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function routeWealth(url) {
  const { getAuthorizedWealthProjection } = await import("./api/wealth.js");
  const view = String(url.searchParams.get("view") || "overview").toLowerCase();
  let id;
  let data;
  if (view === "book") {
    id = url.searchParams.get("advisorId") || DEMO_ADVISOR_ID;
    data = getAuthorizedWealthProjection(DEMO_ADVISOR_ID, id, view, "", {
      query: String(url.searchParams.get("q") || "").slice(0, 120),
      focus: String(url.searchParams.get("focus") || "all").toLowerCase(),
      sort: String(url.searchParams.get("sort") || "attention").toLowerCase(),
      cursor: Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0,
      pageSize: Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get("pageSize") || "80", 10) || 80)),
    });
  } else {
    id = url.searchParams.get("householdId") || "";
    const entityId = view === "account" ? url.searchParams.get("accountId") || "" : view === "goal" ? url.searchParams.get("goalId") || "" : "";
    data = getAuthorizedWealthProjection(DEMO_ADVISOR_ID, id, view, entityId);
  }
  if (data === null) return jsonResponse({ error: view === "book" ? "Advisor book not found" : "Household data not found" }, 404);
  return jsonResponse({ schemaVersion: 1, id, view, data });
}

async function routeDecision(url) {
  const { getAuthorizedDecisionProjection } = await import("./api/decision.js");
  const view = String(url.searchParams.get("view") || "summary").toLowerCase();
  const householdId = url.searchParams.get("householdId") || "";
  const decisionId = view === "detail" || view === "scenario" ? url.searchParams.get("decisionId") || "" : "";
  const scenarioKeys = ["targetWeight", "stressDrop", "goalFunding", "redeployAmount", "deployAmount", "reservePct", "fundingAmount", "allocationAmount"];
  const options = view === "scenario" ? Object.fromEntries(scenarioKeys.flatMap((key) => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw === "") return [];
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? [[key, numeric]] : [];
  })) : {};
  const data = getAuthorizedDecisionProjection(DEMO_ADVISOR_ID, householdId, view, decisionId, options);
  if (data === null) return jsonResponse({ error: "Decision workspace not found" }, 404);
  return jsonResponse({ schemaVersion: 1, householdId, decisionId: decisionId || null, view, data });
}

async function routeFetch(input, init = {}) {
  const raw = typeof input === "string" ? input : input?.url;
  if (!raw) return nativeFetch(input, init);
  const url = new URL(raw, location.origin);
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, init);
  if ((init.method || (input instanceof Request ? input.method : "GET")).toUpperCase() !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (url.pathname === "/api/wealth") return await routeWealth(url);
    if (url.pathname === "/api/decision") return await routeDecision(url);
    const moduleByPath = {
      "/api/search": "./api/search.js",
      "/api/detail": "./api/detail.js",
      "/api/history": "./api/history.js",
      "/api/snapshots": "./api/snapshots.js",
    };
    const modulePath = moduleByPath[url.pathname];
    if (!modulePath) return jsonResponse({ error: "Preview API route not found" }, 404);
    const api = await import(modulePath);
    return await api.default.fetch(new Request(url.href, { method: "GET", headers: init.headers }));
  } catch (error) {
    console.error("GitHub QA API error", error);
    return jsonResponse({ error: error?.message || "Preview API error" }, error instanceof RangeError ? 400 : 500);
  }
}

window.fetch = routeFetch;

document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.("a[href^='/']");
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  if (href) anchor.setAttribute("href", withBasePath(href));
}, true);

document.addEventListener("DOMContentLoaded", () => {
  const badge = document.querySelector(".environment-badge");
  if (badge) {
    badge.textContent = "GITHUB QA";
    badge.title = "Static visual-QA build. Production runtime remains on Vercel.";
  }
});
