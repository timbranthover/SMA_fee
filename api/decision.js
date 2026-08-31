import { ADVISOR_WORKSPACE_DATASET, DEFAULT_ADVISOR_ID } from "../lib/decision-source.js";
import { createWealthRepository } from "../lib/wealth-repository.js";
import { createWealthService } from "../lib/wealth-service.js";
import { createDecisionService } from "../lib/decision-service.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,119}$/i;
const VIEWS = new Set(["summary", "detail", "scenario", "meeting", "timeline"]);
const repository = createWealthRepository(ADVISOR_WORKSPACE_DATASET);
const wealthService = createWealthService(ADVISOR_WORKSPACE_DATASET, { repository });
const decisionService = createDecisionService(ADVISOR_WORKSPACE_DATASET, { repository, wealthService });
const DEMO_PRINCIPAL_ADVISOR_ID = DEFAULT_ADVISOR_ID;

function parseId(value, label) {
  const id = String(value || "").trim();
  if (!ID_PATTERN.test(id)) throw new RangeError(`Invalid ${label}`);
  return id;
}

function parseView(value) {
  const view = String(value || "summary").trim().toLowerCase();
  if (!VIEWS.has(view)) throw new RangeError("Invalid view");
  return view;
}

function parseOptionalNumber(searchParams, key) {
  const value = searchParams.get(key);
  if (value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new RangeError(`Invalid ${key}`);
  return numeric;
}

export function getAuthorizedDecisionProjection(principalAdvisorIdValue, householdIdValue, viewValue = "summary", decisionIdValue = "", options = {}) {
  const principalAdvisorId = parseId(principalAdvisorIdValue || DEMO_PRINCIPAL_ADVISOR_ID, "advisorId");
  const householdId = parseId(householdIdValue, "householdId");
  if (!wealthService.householdBelongsToAdvisor(principalAdvisorId, householdId)) return null;
  const view = parseView(viewValue);
  if (view === "summary") return decisionService.getHouseholdDecisionSummary(householdId);
  if (view === "meeting") return decisionService.getMeetingBrief(householdId);
  if (view === "timeline") return decisionService.getHouseholdTimeline(householdId);
  const decisionId = parseId(decisionIdValue, "decisionId");
  if (view === "detail") return decisionService.getDecisionDetail(householdId, decisionId);
  return decisionService.modelDecisionScenario(householdId, decisionId, options);
}

export default async function handler(request, response) {
  if (request.method && request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const startedAt = performance.now();
  try {
    const url = new URL(request.url, "http://localhost");
    const view = parseView(url.searchParams.get("view"));
    const householdId = parseId(url.searchParams.get("householdId"), "householdId");
    const decisionId = view === "detail" || view === "scenario" ? parseId(url.searchParams.get("decisionId"), "decisionId") : "";
    const scenarioInputs = view === "scenario" ? Object.fromEntries([
      "targetWeight", "taxRate", "stressDrop", "goalFunding", "redeployAmount", "deployAmount", "reservePct", "fundingAmount", "allocationAmount",
    ].map((key) => [key, parseOptionalNumber(url.searchParams, key)]).filter(([, value]) => value !== undefined)) : {};
    const data = getAuthorizedDecisionProjection(DEMO_PRINCIPAL_ADVISOR_ID, householdId, view, decisionId, scenarioInputs);
    if (data === null) return response.status(404).json({ error: "Decision workspace not found" });
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Vary", "Cookie, Authorization");
    response.setHeader("Server-Timing", `decision;dur=${Math.max(0.1, performance.now() - startedAt).toFixed(1)}`);
    return response.status(200).json({ schemaVersion: decisionService.schemaVersion, householdId, decisionId: decisionId || null, view, data });
  } catch (error) {
    return response.status(error instanceof RangeError ? 400 : 500).json({ error: error.message });
  }
}
