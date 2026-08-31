from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    source = file.read_text()
    if old not in source:
        raise SystemExit(f"Expected patch target not found in {path}: {old[:100]!r}")
    file.write_text(source.replace(old, new, 1))


def insert_before(path, marker, block):
    replace_once(path, marker, block + marker)


# --- advisor book: promote actionable signals into first-class decisions / plans ---
replace_once(
    "lib/advisor-book-source.js",
    'import { MORRISON_WEALTH_DATASET } from "./wealth-source.js";\n',
    'import { MORRISON_WEALTH_DATASET } from "./wealth-source.js";\nimport { planTemplateForDecision } from "./decision-engine.js";\n',
)

advisor_helpers = r'''
const SEEDED_DECISION_STATUSES = ["New", "Reviewing", "Plan drafted", "Client discussion"];

function stableDecisionNumber(value) {
  let hash = 0;
  for (const character of String(value)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function parseShortMoney(value = "") {
  const match = String(value).match(/\$([\d.]+)\s*([KM])?/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const multiplier = match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1;
  return Number.isFinite(amount) ? Math.round(amount * multiplier) : 0;
}

function decisionTypeForInsight(insight) {
  if (/concentration/i.test(insight.id)) return "concentration";
  if (/(^|-)cash$/i.test(insight.id) || insight.severity === "Opportunity") return "liquidity";
  if (/goal-review/i.test(insight.id)) return "goal-funding";
  if (/capital-call/i.test(insight.id) || insight.severity === "Upcoming") return "upcoming-obligation";
  if (/muni/i.test(insight.id) || insight.severity === "Allocation") return "allocation";
  return null;
}

function decisionObjective(type, insight) {
  if (type === "concentration") return "Evaluate how to reduce single-position risk while preserving household objectives and implementation flexibility.";
  if (type === "liquidity") return "Determine how much household liquidity should remain available versus be deployed.";
  if (type === "goal-funding") return "Evaluate a funding path that advances the goal without creating an avoidable household liquidity issue.";
  if (type === "upcoming-obligation") return "Confirm the funding source and preserve adequate liquidity after the obligation is met.";
  if (type === "allocation") return "Evaluate an implementation path that moves the household toward its stated allocation target.";
  return insight.detail || "Review the underlying household evidence and determine the next advisor action.";
}

function seededDecisionStatus(householdId, signalId) {
  if (householdId === "household-morrison") {
    if (signalId === "concentration" || signalId === "capital-call") return "Reviewing";
    return "New";
  }
  return SEEDED_DECISION_STATUSES[stableDecisionNumber(`${householdId}:${signalId}`) % SEEDED_DECISION_STATUSES.length];
}

function buildDecisionDomain(dataset) {
  const households = new Map(dataset.households.map((record) => [record.id, record]));
  const goalsByHousehold = new Map();
  for (const goal of dataset.goals) {
    if (!goalsByHousehold.has(goal.householdId)) goalsByHousehold.set(goal.householdId, []);
    goalsByHousehold.get(goal.householdId).push(goal);
  }
  const policiesByHousehold = new Map();
  for (const policy of dataset.concentrationPolicies) {
    if (!policiesByHousehold.has(policy.householdId)) policiesByHousehold.set(policy.householdId, []);
    policiesByHousehold.get(policy.householdId).push(policy);
  }

  const decisions = [];
  const actionPlans = [];
  const actions = [];
  for (const insight of dataset.insights) {
    const type = decisionTypeForInsight(insight);
    if (!type) continue;
    const household = households.get(insight.householdId);
    if (!household) continue;
    const decisionId = `decision-${insight.id}`;
    const householdGoals = goalsByHousehold.get(insight.householdId) || [];
    const watchGoal = householdGoals.find((goal) => goal.tone === "watch") || null;
    const policy = (policiesByHousehold.get(insight.householdId) || []).find((item) => item.isPrimary) || (policiesByHousehold.get(insight.householdId) || [])[0] || null;
    const percentages = [...String(insight.detail || "").matchAll(/([\d.]+)%/g)].map((match) => Number(match[1]));
    const status = seededDecisionStatus(insight.householdId, insight.id);
    const record = {
      id: decisionId,
      householdId: insight.householdId,
      advisorId: household.advisorId,
      signalId: insight.id,
      type,
      status,
      title: insight.title,
      summary: insight.detail,
      objective: decisionObjective(type, insight),
      severity: insight.severity,
      tone: insight.tone,
      goalId: type === "goal-funding" || type === "concentration" ? watchGoal?.id || null : null,
      instrumentId: type === "concentration" ? policy?.instrumentId || null : null,
      amount: type === "upcoming-obligation" ? parseShortMoney(insight.title) : 0,
      currentPct: type === "allocation" ? percentages[0] || 0 : 0,
      targetPct: type === "allocation" ? percentages[1] || percentages[0] || 0 : 0,
      createdAt: household.asOf,
      updatedAt: household.asOf,
      source: "household-signal",
    };
    decisions.push(record);

    if (status === "Plan drafted" || status === "Client discussion") {
      const planId = `plan-${decisionId}`;
      actionPlans.push({ id: planId, householdId: insight.householdId, decisionId, status, objective: record.objective, createdAt: household.asOf, updatedAt: household.asOf });
      const template = planTemplateForDecision(type);
      const completed = status === "Client discussion" ? Math.min(3, template.length - 1) : 1;
      template.forEach((title, index) => actions.push({
        id: `${planId}-action-${index + 1}`,
        householdId: insight.householdId,
        planId,
        title,
        status: index < completed ? "Complete" : index === completed ? "Ready" : "Pending",
        owner: "Advisor",
        order: index + 1,
      }));
    }
  }
  return { decisions, actionPlans, actions };
}

'''
insert_before("lib/advisor-book-source.js", "const base = enrichedMorrisonDataset();\n", advisor_helpers)

old_book_export = '''const base = enrichedMorrisonDataset();
const generated = Array.from({ length: GENERATED_HOUSEHOLDS }, (_, index) => generatedHousehold(index));

export const ADVISOR_BOOK_DATASET = deepFreeze({
  schemaVersion: 1,
  advisors: base.advisors.map((advisor) => ({ ...advisor, initials: advisor.initials || "A4" })),
  households: [...base.households, ...generated.map((item) => item.household)],
  accounts: [...base.accounts, ...generated.flatMap((item) => item.accounts)],
  accountAllocations: [...base.accountAllocations, ...generated.flatMap((item) => item.accountAllocations)],
  positions: [...base.positions, ...generated.flatMap((item) => item.positions)],
  householdAllocationSnapshots: [...base.householdAllocationSnapshots, ...generated.flatMap((item) => item.householdAllocationSnapshots)],
  householdHoldingSnapshots: [...base.householdHoldingSnapshots, ...generated.flatMap((item) => item.householdHoldingSnapshots)],
  nonFinancialAssets: [...base.nonFinancialAssets, ...generated.flatMap((item) => item.nonFinancialAssets)],
  liabilities: [...base.liabilities, ...generated.flatMap((item) => item.liabilities)],
  goals: [...base.goals, ...generated.flatMap((item) => item.goals)],
  insights: [...base.insights, ...generated.flatMap((item) => item.insights)],
  concentrationPolicies: [...base.concentrationPolicies, ...generated.flatMap((item) => item.concentrationPolicies)],
  histories: [...base.histories, ...generated.flatMap((item) => item.histories)],
});

export const DEFAULT_ADVISOR_ID = ADVISOR_ID;'''
new_book_export = '''const base = enrichedMorrisonDataset();
const generated = Array.from({ length: GENERATED_HOUSEHOLDS }, (_, index) => generatedHousehold(index));
const combinedBookDataset = {
  schemaVersion: 1,
  advisors: base.advisors.map((advisor) => ({ ...advisor, initials: advisor.initials || "A4" })),
  households: [...base.households, ...generated.map((item) => item.household)],
  accounts: [...base.accounts, ...generated.flatMap((item) => item.accounts)],
  accountAllocations: [...base.accountAllocations, ...generated.flatMap((item) => item.accountAllocations)],
  positions: [...base.positions, ...generated.flatMap((item) => item.positions)],
  householdAllocationSnapshots: [...base.householdAllocationSnapshots, ...generated.flatMap((item) => item.householdAllocationSnapshots)],
  householdHoldingSnapshots: [...base.householdHoldingSnapshots, ...generated.flatMap((item) => item.householdHoldingSnapshots)],
  nonFinancialAssets: [...base.nonFinancialAssets, ...generated.flatMap((item) => item.nonFinancialAssets)],
  liabilities: [...base.liabilities, ...generated.flatMap((item) => item.liabilities)],
  goals: [...base.goals, ...generated.flatMap((item) => item.goals)],
  insights: [...base.insights, ...generated.flatMap((item) => item.insights)],
  concentrationPolicies: [...base.concentrationPolicies, ...generated.flatMap((item) => item.concentrationPolicies)],
  histories: [...base.histories, ...generated.flatMap((item) => item.histories)],
};
const decisionDomain = buildDecisionDomain(combinedBookDataset);

export const ADVISOR_BOOK_DATASET = deepFreeze({ ...combinedBookDataset, ...decisionDomain });

export const DEFAULT_ADVISOR_ID = ADVISOR_ID;'''
replace_once("lib/advisor-book-source.js", old_book_export, new_book_export)

# --- wealth service: projections, decision studio, and book-level lifecycle ---
replace_once(
    "lib/wealth-service.js",
    'import { createWealthRepository } from "./wealth-repository.js";\n',
    'import { createWealthRepository } from "./wealth-repository.js";\nimport { buildDecisionScenario, decisionStatusRank, planTemplateForDecision } from "./decision-engine.js";\n',
)
replace_once(
    "lib/wealth-service.js",
    '  workspace: 50,\n});',
    '  workspace: 50,\n  decision: 500,\n});',
)
replace_once(
    "lib/wealth-service.js",
    'function projectInsight(record) {\n  return { id: record.id, severity: record.severity, tone: record.tone, title: record.title, detail: record.detail, action: record.action, details: record.details || null };\n}',
    '''function projectInsight(record, decision = null) {
  return { id: record.id, severity: record.severity, tone: record.tone, title: record.title, detail: record.detail, action: record.action, details: record.details || null, decisionId: decision?.id || null, decisionStatus: decision?.status || null };
}

function projectDecisionSummary(record, plan = null) {
  if (!record) return null;
  return { id: record.id, type: record.type, status: record.status, title: record.title, objective: record.objective, severity: record.severity, tone: record.tone, planStatus: plan?.status || null };
}''',
)
replace_once(
    "lib/wealth-service.js",
    '  const workspaceCache = createLruCache(limits.workspace);\n',
    '  const workspaceCache = createLruCache(limits.workspace);\n  const decisionCache = createLruCache(limits.decision);\n',
)
replace_once(
    "lib/wealth-service.js",
    '      insights: repository.listHouseholdInsights(householdId).map(projectInsight),\n',
    '      insights: repository.listHouseholdInsights(householdId).map((record) => projectInsight(record, repository.getDecisionBySignal(record.id))),\n',
)
replace_once(
    "lib/wealth-service.js",
    '''      accounts: positions.map((position) => ({
        name: repository.getAccount(position.accountId)?.name || position.accountId,
        value: position.marketValue,
        weight: position.accountWeightPct,
        gain: position.unrealizedGain,
      })),''',
    '''      accounts: positions.map((position) => {
        const account = repository.getAccount(position.accountId);
        return { name: account?.name || position.accountId, registration: account?.registration || "—", taxTreatment: account?.taxTreatment || "—", value: position.marketValue, weight: position.accountWeightPct, gain: position.unrealizedGain };
      }),''',
)

decision_service_block = r'''
  function getHouseholdDecisions(householdId) {
    if (!repository.getHousehold(householdId)) return null;
    return repository.listHouseholdDecisions(householdId).map((record) => projectDecisionSummary(record, repository.getActionPlanByDecision(record.id)));
  }

  function decisionEvidence(record, household, insight, review, goal) {
    const evidence = [
      { label: "Household", value: household.name, format: "text", detail: household.riskProfile },
      { label: "Financial assets", value: household.financialAssets, format: "currency", detail: `${household.accountCount} connected accounts` },
      { label: "Readily available cash", value: household.investableCash, format: "currency", detail: `${household.liquidityPct.toFixed(1)}% of financial assets` },
    ];
    if (record.type === "concentration" && review) {
      evidence.unshift({ label: "Position", value: review.holding.name, format: "text", detail: `${review.holding.symbol} · ${review.holding.weight.toFixed(1)}% of household` });
      evidence.push({ label: "Household target", value: review.targetWeight, format: "percent", detail: "Single-position concentration policy" });
      evidence.push({ label: "Unrealized gain", value: review.unrealizedGain, format: "currency", detail: `${review.accounts.length} ${review.accounts.length === 1 ? "account" : "accounts"}` });
    }
    if (goal) evidence.push({ label: "Linked goal", value: goal.name, format: "text", detail: `${goal.progress}% funded · ${goal.status}` });
    if (record.type === "upcoming-obligation") evidence.push({ label: "Obligation", value: record.amount || 0, format: "currency", detail: insight?.detail || "Upcoming household funding need" });
    if (record.type === "allocation" && record.targetPct) evidence.push({ label: "Policy range", value: `${Number(record.currentPct).toFixed(1)}% → ${Number(record.targetPct).toFixed(1)}%`, format: "text", detail: insight?.detail || "Household allocation policy" });
    return evidence;
  }

  function getHouseholdDecision(householdId, decisionId, assumptions = {}) {
    const record = repository.getDecision(decisionId);
    if (!record || record.householdId !== householdId) return null;
    const overview = getHouseholdOverview(householdId);
    if (!overview) return null;
    const insight = repository.getInsight(record.signalId);
    const goal = record.goalId ? getHouseholdGoal(householdId, record.goalId) : null;
    const review = record.type === "concentration" ? getHouseholdConcentrationReview(householdId) : null;
    const plan = repository.getActionPlanByDecision(record.id);
    const actions = plan ? repository.listPlanActions(plan.id).sort((left, right) => left.order - right.order).map((action) => ({ id: action.id, title: action.title, status: action.status, owner: action.owner, order: action.order })) : [];
    const scenario = buildDecisionScenario({ decision: record, household: overview.household, insight, review, goal }, assumptions);
    const projection = {
      ...projectDecisionSummary(record, plan),
      householdId,
      signalId: record.signalId,
      summary: record.summary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      household: { id: overview.household.id, name: overview.household.name, initials: overview.household.initials, riskProfile: overview.household.riskProfile, location: overview.household.location, financialAssets: overview.household.financialAssets, investableCash: overview.household.investableCash, liquidityPct: overview.household.liquidityPct },
      signal: insight ? projectInsight(insight, record) : null,
      evidence: decisionEvidence(record, overview.household, insight, review, goal),
      scenario,
      plan: plan ? { id: plan.id, status: plan.status, objective: plan.objective, actions } : null,
      planTemplate: planTemplateForDecision(record.type),
    };
    if (!Object.keys(assumptions || {}).length) decisionCache.set(`${householdId}\u001f${decisionId}`, deepFreeze(projection));
    return deepFreeze(projection);
  }

'''
insert_before("lib/wealth-service.js", "  function buildBookHousehold(record) {\n", decision_service_block)

replace_once(
    "lib/wealth-service.js",
    '    const insights = repository.listHouseholdInsights(householdId).map(projectInsight);\n',
    '    const insights = repository.listHouseholdInsights(householdId).map((insight) => projectInsight(insight, repository.getDecisionBySignal(insight.id)));\n    const decisions = repository.listHouseholdDecisions(householdId);\n',
)
replace_once(
    "lib/wealth-service.js",
    '    const priority = choosePriority(insights);\n',
    '    const priority = choosePriority(insights);\n    const priorityDecision = priority ? repository.getDecisionBySignal(priority.id) : null;\n    const primaryDecision = priorityDecision || [...decisions].sort((left, right) => decisionStatusRank(right.status) - decisionStatusRank(left.status))[0] || null;\n    const primaryPlan = primaryDecision ? repository.getActionPlanByDecision(primaryDecision.id) : null;\n',
)
replace_once(
    "lib/wealth-service.js",
    '      attentionCount: insights.filter((insight) => insight.tone === "red" || insight.tone === "amber" || insight.tone === "green").length,\n      priority: priority ? { severity: priority.severity, tone: priority.tone, title: priority.title, detail: priority.detail } : null,\n',
    '      attentionCount: insights.filter((insight) => insight.tone === "red" || insight.tone === "amber" || insight.tone === "green").length,\n      openDecisionCount: decisions.filter((decision) => decision.status !== "Complete").length,\n      decision: projectDecisionSummary(primaryDecision, primaryPlan),\n      priority: priority ? { severity: priority.severity, tone: priority.tone, title: priority.title, detail: priority.detail } : null,\n',
)
replace_once(
    "lib/wealth-service.js",
    '      searchText: `${record.name} ${record.location || ""} ${record.riskProfile || ""} ${priority?.title || ""}`.toLowerCase(),\n',
    '      searchText: `${record.name} ${record.location || ""} ${record.riskProfile || ""} ${priority?.title || ""} ${primaryDecision?.status || ""} ${primaryDecision?.title || ""}`.toLowerCase(),\n',
)
replace_once(
    "lib/wealth-service.js",
    '''      heldAwayAssets: sum(items, (item) => item.heldAway),
      attentionHouseholds: items.filter((item) => item.priorityScore >= 3).length,
    };''',
    '''      heldAwayAssets: sum(items, (item) => item.heldAway),
      attentionHouseholds: items.filter((item) => item.priorityScore >= 3).length,
      openDecisionHouseholds: items.filter((item) => item.openDecisionCount > 0).length,
      openDecisionCount: sum(items, (item) => item.openDecisionCount),
      activePlanCount: repository.listAdvisorDecisions(advisorId).filter((decision) => repository.getActionPlanByDecision(decision.id)).length,
    };''',
)
replace_once(
    "lib/wealth-service.js",
    '    getHouseholdHistory,\n    getHouseholdConcentrationReview,\n',
    '    getHouseholdHistory,\n    getHouseholdConcentrationReview,\n    getHouseholdDecisions,\n    getHouseholdDecision,\n',
)

# --- API and browser wealth client ---
replace_once("api/wealth.js", 'const PROJECTION_VIEWS = new Set(["book", "overview", "history", "concentration", "account", "goal"]);', 'const PROJECTION_VIEWS = new Set(["book", "overview", "history", "concentration", "account", "goal", "decisions", "decision"]);')
replace_once(
    "api/wealth.js",
    '  if (view === "account") return wealthService.getHouseholdAccount(householdId, parseId(entityIdValue, "accountId"));\n  return wealthService.getHouseholdGoal(householdId, parseId(entityIdValue, "goalId"));',
    '  if (view === "account") return wealthService.getHouseholdAccount(householdId, parseId(entityIdValue, "accountId"));\n  if (view === "goal") return wealthService.getHouseholdGoal(householdId, parseId(entityIdValue, "goalId"));\n  if (view === "decisions") return wealthService.getHouseholdDecisions(householdId);\n  return wealthService.getHouseholdDecision(householdId, parseId(entityIdValue, "decisionId"), options);',
)
replace_once(
    "api/wealth.js",
    '  return getWealthProjection(householdId, view, entityIdValue, options);\n',
    '  return getWealthProjection(householdId, view, entityIdValue, options);\n',
)
# the branch already forwards options through this line; keep as explicit guard
replace_once(
    "api/wealth.js",
    '      const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : "";\n      data = getAuthorizedWealthProjection(DEMO_PRINCIPAL_ADVISOR_ID, id, view, entityId);',
    '''      const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : view === "decision" ? url.searchParams.get("decisionId") : "";
      const assumptions = view === "decision" ? Object.fromEntries(["targetWeight", "goalFundingAmount", "deployAmount", "fundingAmount", "implementationAmount"].map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value !== null && value !== "")) : {};
      data = getAuthorizedWealthProjection(DEMO_PRINCIPAL_ADVISOR_ID, id, view, entityId, assumptions);''',
)

replace_once(
    "lib/wealth-data.js",
    '''function householdProjection(householdId, view, entityKey = "", entityId = "") {
  const params = new URLSearchParams({ view, householdId });
  if (entityKey && entityId) params.set(entityKey, entityId);
  return fetchProjection(params);
}''',
    '''function householdProjection(householdId, view, entityKey = "", entityId = "", extras = {}) {
  const params = new URLSearchParams({ view, householdId });
  if (entityKey && entityId) params.set(entityKey, entityId);
  Object.entries(extras || {}).forEach(([key, value]) => { if (value !== null && value !== undefined && value !== "") params.set(key, String(value)); });
  return fetchProjection(params);
}''',
)
replace_once(
    "lib/wealth-data.js",
    'export const loadHouseholdGoal = (goalId, householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "goal", "goalId", goalId);\n',
    'export const loadHouseholdGoal = (goalId, householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "goal", "goalId", goalId);\nexport const loadHouseholdDecisions = (householdId = DEFAULT_HOUSEHOLD_ID) => householdProjection(householdId, "decisions");\nexport const loadHouseholdDecision = (decisionId, householdId = DEFAULT_HOUSEHOLD_ID, assumptions = {}) => householdProjection(householdId, "decision", "decisionId", decisionId, assumptions);\n',
)

# local dev parity
replace_once(
    "local-server.mjs",
    '        const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : "";\n        data = getAuthorizedWealthProjection(DEFAULT_ADVISOR_ID, id, view, entityId);',
    '        const entityId = view === "account" ? url.searchParams.get("accountId") : view === "goal" ? url.searchParams.get("goalId") : view === "decision" ? url.searchParams.get("decisionId") : "";\n        const assumptions = view === "decision" ? Object.fromEntries(["targetWeight", "goalFundingAmount", "deployAmount", "fundingAmount", "implementationAmount"].map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value !== null && value !== "")) : {};\n        data = getAuthorizedWealthProjection(DEFAULT_ADVISOR_ID, id, view, entityId, assumptions);',
)
replace_once(
    "local-server.mjs",
    '  const requested = url.pathname === "/" || /^\\/household\\/[^/]+\\/?$/.test(url.pathname) || /^\\/investments\\/?$/.test(url.pathname) || /^\\/investment\\/[^/]+\\/?$/.test(url.pathname)\n',
    '  const requested = url.pathname === "/" || /^\\/household\\/[^/]+\\/?$/.test(url.pathname) || /^\\/household\\/[^/]+\\/decision\\/[^/]+\\/?$/.test(url.pathname) || /^\\/investments\\/?$/.test(url.pathname) || /^\\/investment\\/[^/]+\\/?$/.test(url.pathname)\n',
)

# static browser bundle, scripts, routing
replace_once(
    "scripts/build-static.mjs",
    '["shared-config.js", "brand-logos.js", "column-config.js", "sort-config.js", "range-config.js", "wealth-data.js"].map((file) =>',
    '["shared-config.js", "brand-logos.js", "column-config.js", "sort-config.js", "range-config.js", "wealth-data.js", "decision-workspace.js"].map((file) =>',
)
replace_once(
    "package.json",
    'node --check lib/wealth-source.js && node --check lib/advisor-book-source.js && node --check lib/wealth-repository.js',
    'node --check lib/wealth-source.js && node --check lib/advisor-book-source.js && node --check lib/decision-engine.js && node --check lib/decision-workspace.js && node --check lib/wealth-repository.js',
)
replace_once(
    "vercel.json",
    '    { "source": "/household/:id", "destination": "/" },\n',
    '    { "source": "/household/:id/decision/:decisionId", "destination": "/" },\n    { "source": "/household/:id", "destination": "/" },\n',
)

# --- HTML: add Decision Studio as an application surface and update book language ---
replace_once("index.html", '<div><span>Needs attention</span><strong class="book-watch" id="bookAttentionCount">—</strong><small>Priority or review items</small></div>', '<div><span>Open decisions</span><strong class="book-watch" id="bookAttentionCount">—</strong><small>Across active relationships</small></div>')
replace_once("index.html", '<th>Goals</th><th>Needs attention</th>', '<th>Goals</th><th>Current focus</th>')
insert_before(
    "index.html",
    '      <section class="investment-view" id="investmentView" hidden>\n',
    '      <section class="decision-view" id="decisionView" hidden><div id="decisionContent"></div></section>\n\n',
)

# --- App: route, render, model, implementation handoff, and prototype persistence adapter ---
replace_once(
    "app.js",
    'import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";\n',
    'import { DEFAULT_ADVISOR_ID, loadAdvisorBook, loadConcentrationReview, loadHouseholdAccount, loadHouseholdDecision, loadHouseholdGoal, loadHouseholdOverview, loadWealthHistory } from "/lib/wealth-data.js";\nimport { buildDraftPlan, getDecisionWorkspace, saveDecisionCandidates, saveDecisionWorkspace } from "/lib/decision-workspace.js";\n',
)
replace_once(
    "app.js",
    '  currentHouseholdId: null,\n',
    '  currentHouseholdId: null,\n  currentDecisionId: null,\n  currentDecision: null,\n  decisionAssumptions: {},\n',
)
replace_once(
    "app.js",
    'let bookPrefetchTimer = null;\n',
    'let bookPrefetchTimer = null;\nlet decisionRequest = 0;\nlet decisionControlTimer = null;\n',
)
insert_before(
    "app.js",
    'function getSavedScreens() {\n',
    '''function decisionFromPath() {
  const match = location.pathname.match(/^\\/household\\/([^/]+)\\/decision\\/([^/]+)\\/?$/i);
  if (!match) return null;
  try { return { householdId: decodeURIComponent(match[1]), decisionId: decodeURIComponent(match[2]) }; }
  catch { return { householdId: match[1], decisionId: match[2] }; }
}

''',
)
replace_once(
    "app.js",
    '''function bookPriorityMarkup(item) {
  if (!item.priority) return `<span class="book-priority-none">No material exception</span>`;
  return `<span class="book-priority book-priority-${escapeHtml(item.priority.tone)}"><i></i><span><strong>${escapeHtml(item.priority.title)}</strong><small>${escapeHtml(item.priority.detail)}</small></span></span>`;
}''',
    '''function bookPriorityMarkup(item) {
  if (!item.priority) return `<span class="book-priority-none">No material exception</span>`;
  const workspace = item.decision ? getDecisionWorkspace(item.decision.id) : null;
  const decisionStatus = workspace?.status || item.decision?.status;
  return `<span class="book-priority book-priority-${escapeHtml(item.priority.tone)}"><i></i><span><strong>${escapeHtml(item.priority.title)}</strong><small>${escapeHtml(item.priority.detail)}</small>${decisionStatus ? `<em class="book-decision-state">${escapeHtml(decisionStatus)}</em>` : ""}</span></span>`;
}''',
)
replace_once(
    "app.js",
    '  el("bookAttentionCount").textContent = formatCount(data.metrics.attentionHouseholds);\n',
    '  el("bookAttentionCount").textContent = formatCount(data.metrics.openDecisionHouseholds ?? data.metrics.attentionHouseholds);\n',
)

# Decision Studio rendering block
decision_app_block = r'''
function decisionValue(value, format) {
  if (format === "currency" || format === "currency-negative") return formatWealthCurrency(value);
  if (format === "percent") return `${Number(value || 0).toFixed(1)}%`;
  return String(value ?? "—");
}

function decisionMetricValue(value, format) {
  if (format === "currency-negative") return value ? `−${formatWealthCurrency(Math.abs(value))}` : "$0";
  return decisionValue(value, format);
}

function decisionWorkspaceForCurrent() {
  return state.currentDecisionId ? getDecisionWorkspace(state.currentDecisionId) : null;
}

function renderDecisionLoading() {
  updateHtml(el("decisionContent"), `<div class="decision-loading"><span></span><strong>Preparing decision workspace…</strong><p>Loading only the household evidence and scenario data needed for this decision.</p></div>`);
}

function renderDecisionStudio() {
  const decision = state.currentDecision;
  if (!decision) return;
  const workspace = decisionWorkspaceForCurrent();
  const status = workspace?.status || decision.status;
  const candidates = workspace?.candidates || [];
  const plan = workspace?.plan || decision.plan;
  const scenario = decision.scenario || { controls: [], metrics: [], notes: [], implementation: null };
  const steps = ["Evidence", "Model", "Implement", "Plan"];
  const activeStep = plan ? 3 : candidates.length ? 2 : 1;
  const evidence = decision.evidence.map((item) => `<div class="decision-evidence-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(decisionValue(item.value, item.format))}</strong>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</div>`).join("");
  const controls = scenario.controls.length ? `<div class="decision-controls">${scenario.controls.map((control) => `<label class="decision-control"><span><strong>${escapeHtml(control.label)}</strong><output data-decision-control-output="${escapeHtml(control.key)}">${escapeHtml(decisionValue(control.value, control.format))}</output></span><input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" data-decision-control="${escapeHtml(control.key)}" data-decision-format="${escapeHtml(control.format)}" aria-label="${escapeHtml(control.label)}"/><small>${escapeHtml(decisionValue(control.min, control.format))}<b>${escapeHtml(decisionValue(control.max, control.format))}</b></small></label>`).join("")}</div>` : `<div class="decision-static-scenario"><strong>No adjustable assumption is required</strong><p>This decision is primarily a funding or review workflow. The household consequence is calculated from the current known obligation.</p></div>`;
  const metrics = scenario.metrics.length ? `<div class="decision-impact-table"><div class="decision-impact-head"><span>Household consequence</span><span>Current</span><span>Scenario</span></div>${scenario.metrics.map((item) => `<div class="decision-impact-row tone-${escapeHtml(item.tone)}"><span><strong>${escapeHtml(item.label)}</strong>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</span><span>${escapeHtml(decisionMetricValue(item.before, item.format))}</span><span>${escapeHtml(decisionMetricValue(item.after, item.format))}</span></div>`).join("")}</div>` : "";
  const implementation = scenario.implementation ? `<section class="decision-implementation-card"><div><span>IMPLEMENTATION OBJECTIVE</span><h3>${escapeHtml(scenario.implementation.objective)}</h3><p><strong>${formatWealthCurrency(scenario.implementation.amount)}</strong> available to take into the investment shelf with explicit, editable criteria.</p><div>${scenario.implementation.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}</div></div><button type="button" class="primary-button" data-decision-implementation>Explore implementation →</button></section>` : `<section class="decision-implementation-card muted"><div><span>IMPLEMENTATION</span><h3>No investment search required yet</h3><p>This scenario is currently resolved through planning or liquidity workflow rather than selecting a new investment.</p></div></section>`;
  const candidateMarkup = candidates.length ? `<div class="decision-candidates"><span>IMPLEMENTATION CANDIDATES</span>${candidates.map((candidate) => `<div><strong>${escapeHtml(candidate.symbol || candidate.name)}</strong><small>${escapeHtml(candidate.name)} · ${escapeHtml(candidate.category)}</small></div>`).join("")}</div>` : `<div class="decision-candidates empty"><span>IMPLEMENTATION CANDIDATES</span><p>${scenario.implementation ? "Explore the shelf and select investments to bring candidates back into this decision." : "No investment candidates are needed for this workflow."}</p></div>`;
  const planMarkup = plan ? `<div class="decision-plan"><div class="decision-plan-heading"><span>ACTION PLAN</span><strong>${escapeHtml(plan.status || status)}</strong></div><p>${escapeHtml(plan.objective || decision.objective)}</p><div class="decision-actions">${(plan.actions || []).map((action) => `<div class="decision-action status-${escapeHtml(String(action.status).toLowerCase().replace(/\s+/g, "-"))}"><i></i><span><strong>${escapeHtml(action.title)}</strong><small>${escapeHtml(action.owner || "Advisor")} · ${escapeHtml(action.status)}</small></span></div>`).join("")}</div></div>` : `<div class="decision-plan empty"><span>ACTION PLAN</span><h3>Turn this scenario into persistent work</h3><p>Build a lightweight plan that keeps the decision, implementation candidates and next advisor actions together.</p><ol>${decision.planTemplate.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><button type="button" class="primary-button" data-build-decision-plan>Build plan</button></div>`;

  updateHtml(el("decisionContent"), `<header class="decision-header"><div><button type="button" class="decision-back" data-decision-back>← ${escapeHtml(decision.household.name)}</button><span class="eyebrow">DECISION STUDIO · ${escapeHtml(decision.household.name.toUpperCase())}</span><h1>${escapeHtml(decision.title)}</h1><p>${escapeHtml(decision.objective)}</p></div><div class="decision-header-status"><span>${escapeHtml(decision.severity)}</span><strong>${escapeHtml(status)}</strong><small>Updated ${escapeHtml(decision.updatedAt || decision.household.name)}</small></div></header><div class="decision-stage-nav">${steps.map((step, index) => `<span class="${index <= activeStep ? "active" : ""}"><b>${index + 1}</b>${step}</span>`).join("")}</div><div class="decision-layout"><aside class="decision-evidence"><div class="decision-section-heading"><span>WHAT WE KNOW</span><h2>Evidence</h2><p>${escapeHtml(decision.summary || decision.signal?.detail || "Current household evidence")}</p></div>${evidence}<div class="decision-evidence-source"><span>Source</span><strong>Connected household data</strong><small>Facts remain traceable to the active relationship.</small></div></aside><main class="decision-scenario"><div class="decision-section-heading"><span>WHAT COULD CHANGE</span><h2>Model the decision</h2><p>${escapeHtml(scenario.summary || "Review the household consequence of this decision.")}</p></div>${controls}${metrics}${implementation}<div class="decision-notes">${scenario.notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div></main><aside class="decision-plan-column">${candidateMarkup}${planMarkup}<p class="decision-disclosure">Illustrative decision support · No trade, transfer, tax liability or client approval is executed by this prototype.</p></aside></div>`);
}

async function openDecision(decisionId, householdId = state.currentHouseholdId, { updateHistory = true, replaceHistory = false, assumptions = null } = {}) {
  if (!decisionId || !householdId) return;
  const request = ++decisionRequest;
  closeWealthDrawer({ restoreFocus: false });
  state.currentHouseholdId = householdId;
  state.currentDecisionId = decisionId;
  state.currentDecision = null;
  state.decisionAssumptions = assumptions || {};
  setWorkspaceView("decision", { updateHistory, replaceHistory });
  renderDecisionLoading();
  try {
    const overviewPromise = HOUSEHOLD?.id === householdId ? Promise.resolve(null) : loadHouseholdOverview(householdId);
    const [overview, decision] = await Promise.all([overviewPromise, loadHouseholdDecision(decisionId, householdId, state.decisionAssumptions)]);
    if (request !== decisionRequest || state.currentDecisionId !== decisionId) return;
    if (overview) assignHouseholdOverview(overview);
    state.currentDecision = decision;
    state.decisionAssumptions = Object.fromEntries((decision.scenario?.controls || []).map((control) => [control.key, control.value]));
    renderAdvisorIdentity({ displayName: HOUSEHOLD?.advisor, initials: HOUSEHOLD?.advisorInitials, workspaceLabel: HOUSEHOLD?.advisorWorkspace });
    renderDecisionStudio();
    document.title = `${decision.title} | Advisor Workspace`;
  } catch (error) {
    if (request !== decisionRequest) return;
    updateHtml(el("decisionContent"), `<div class="decision-loading error"><strong>Decision workspace unavailable</strong><p>${escapeHtml(error.message)}</p><button type="button" class="secondary-button" data-decision-back>Back to household</button></div>`);
  }
}

function refreshDecisionScenario() {
  if (!state.currentDecisionId || !state.currentHouseholdId) return;
  window.clearTimeout(decisionControlTimer);
  decisionControlTimer = window.setTimeout(async () => {
    const request = ++decisionRequest;
    try {
      const decision = await loadHouseholdDecision(state.currentDecisionId, state.currentHouseholdId, state.decisionAssumptions);
      if (request !== decisionRequest) return;
      state.currentDecision = decision;
      renderDecisionStudio();
      const workspace = decisionWorkspaceForCurrent();
      if (workspace) saveDecisionWorkspace(decision.id, { scenario: state.decisionAssumptions });
    } catch (error) { showToast(error.message || "Unable to update scenario"); }
  }, 90);
}

function buildCurrentDecisionPlan() {
  const decision = state.currentDecision;
  if (!decision) return;
  const workspace = decisionWorkspaceForCurrent();
  buildDraftPlan(decision.id, { scenario: state.decisionAssumptions, candidates: workspace?.candidates || [], template: decision.planTemplate, objective: decision.objective });
  renderDecisionStudio();
  renderBookRows();
  renderHouseholdProgress();
  showToast("Action plan drafted");
}

function openDecisionImplementation() {
  const decision = state.currentDecision;
  const implementation = decision?.scenario?.implementation;
  if (!decision || !implementation) return;
  saveDecisionWorkspace(decision.id, { status: decisionWorkspaceForCurrent()?.status || "Reviewing", scenario: state.decisionAssumptions });
  state.compare.clear();
  renderCompareTray();
  state.q = implementation.query || "";
  state.category = CATEGORY_ORDER.includes(implementation.category) ? implementation.category : "All";
  state.appliedCategory = state.category;
  state.flags = new Set((implementation.flags || []).filter((flag) => PRIMARY_FLAGS.includes(flag)));
  state.risks = new Set((implementation.risks || []).filter((risk) => RISKS.includes(risk)));
  state.statuses.clear();
  state.ranges = {};
  state.sort = defaultSort(Boolean(state.q));
  state.sortExplicit = false;
  el("searchInput").value = state.q;
  showScenarioRibbon({ source: "FROM DECISION STUDIO", title: `${implementation.objective} · ${formatWealthCurrency(implementation.amount)}`, tags: implementation.tags || [], decisionId: decision.id });
  state.investmentSearchStarted = true;
  setWorkspaceView("investments");
  runSearch();
}

'''
insert_before("app.js", "function renderCategories() {\n", decision_app_block)

# make concentration drawer route into Decision Studio
replace_once(
    "app.js",
    '<button type="button" class="primary-button" data-household-scenario="concentration">Explore diversification options →</button>',
    '<button type="button" class="primary-button" data-open-decision="${escapeHtml(HOUSEHOLD_INSIGHTS.find((item) => item.id === "concentration" || item.id.endsWith("-concentration"))?.decisionId || "")}">Open Decision Studio →</button>',
)
replace_once(
    "app.js",
    'function showScenarioRibbon({ source, title, tags }) {\n  state.householdScenario = { source, title, tags, householdId: state.currentHouseholdId, householdName: HOUSEHOLD.name };',
    'function showScenarioRibbon({ source, title, tags, decisionId = null }) {\n  state.householdScenario = { source, title, tags, decisionId, householdId: state.currentHouseholdId, householdName: HOUSEHOLD.name };',
)
replace_once(
    "app.js",
    '  el("scenarioBack").textContent = `← ${HOUSEHOLD.name}`;\n',
    '  el("scenarioBack").textContent = decisionId ? "← Decision Studio" : `← ${HOUSEHOLD.name}`;\n',
)
replace_once(
    "app.js",
    '''function handleWealthInsight(id) {
  if (id === "concentration" || id.endsWith("-concentration")) { openWealthDrawer("concentration"); return; }''',
    '''function handleWealthInsight(id) {
  const insight = HOUSEHOLD_INSIGHTS.find((candidate) => candidate.id === id);
  if (insight?.decisionId) { openDecision(insight.decisionId); return; }
  if (id === "concentration" || id.endsWith("-concentration")) { openWealthDrawer("concentration"); return; }''',
)
replace_once(
    "app.js",
    'function renderHouseholdProgress() {\n  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));\n  if (!concentration) return;\n  const progress = document.querySelector(`[data-insight-detail="${CSS.escape(concentration.id)}"]`);\n  if (!progress) return;\n  const selected = state.compare.size;\n  progress.textContent = selected ? `${selected} diversification ${selected === 1 ? "alternative" : "alternatives"} selected` : concentration.detail;\n}',
    'function renderHouseholdProgress() {\n  const concentration = HOUSEHOLD_INSIGHTS.find((insight) => insight.id === "concentration" || insight.id.endsWith("-concentration"));\n  if (!concentration) return;\n  const progress = document.querySelector(`[data-insight-detail="${CSS.escape(concentration.id)}"]`);\n  if (!progress) return;\n  const workspace = concentration.decisionId ? getDecisionWorkspace(concentration.decisionId) : null;\n  const selected = workspace?.candidates?.length || (state.householdScenario?.decisionId === concentration.decisionId ? state.compare.size : 0);\n  progress.textContent = workspace?.status === "Plan drafted" ? `Plan drafted · ${selected} implementation ${selected === 1 ? "candidate" : "candidates"}` : selected ? `${selected} diversification ${selected === 1 ? "candidate" : "candidates"} selected` : concentration.detail;\n}',
)

# workspace routing
replace_once(
    "app.js",
    '  const next = ["book", "wealth", "investments"].includes(view) ? view : "book";\n',
    '  const next = ["book", "wealth", "decision", "investments"].includes(view) ? view : "book";\n',
)
replace_once(
    "app.js",
    '  el("wealthView").hidden = next !== "wealth";\n  el("investmentView").hidden = next !== "investments";\n',
    '  el("wealthView").hidden = next !== "wealth";\n  el("decisionView").hidden = next !== "decision";\n  el("investmentView").hidden = next !== "investments";\n',
)
replace_once(
    "app.js",
    '    button.classList.toggle("active", target === "book" ? next === "book" || next === "wealth" : target === next);\n',
    '    button.classList.toggle("active", target === "book" ? next === "book" || next === "wealth" || next === "decision" : target === next);\n',
)
replace_once(
    "app.js",
    '  document.title = next === "book" ? "Advisor Workspace" : next === "wealth" ? `${HOUSEHOLD?.name || "Household"} | Advisor Workspace` : "Investment Screener | Advisor Workspace";\n',
    '  document.title = next === "book" ? "Advisor Workspace" : next === "wealth" ? `${HOUSEHOLD?.name || "Household"} | Advisor Workspace` : next === "decision" ? `${state.currentDecision?.title || "Decision Studio"} | Advisor Workspace` : "Investment Screener | Advisor Workspace";\n',
)
replace_once(
    "app.js",
    '    const href = next === "book" ? "/" : next === "wealth" && state.currentHouseholdId ? `/household/${encodeURIComponent(state.currentHouseholdId)}` : investmentUrl();\n',
    '    const href = next === "book" ? "/" : next === "decision" && state.currentHouseholdId && state.currentDecisionId ? `/household/${encodeURIComponent(state.currentHouseholdId)}/decision/${encodeURIComponent(state.currentDecisionId)}` : next === "wealth" && state.currentHouseholdId ? `/household/${encodeURIComponent(state.currentHouseholdId)}` : investmentUrl();\n',
)
replace_once(
    "app.js",
    '  } else if (next === "wealth") {\n    renderHouseholdProgress();\n    if (HOUSEHOLD) requestAnimationFrame(initializeWealthChart);\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  } else {\n',
    '  } else if (next === "wealth") {\n    renderHouseholdProgress();\n    if (HOUSEHOLD) requestAnimationFrame(initializeWealthChart);\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  } else if (next === "decision") {\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  } else {\n',
)

# compare selections become implementation candidates when launched from a decision
replace_once(
    "app.js",
    '  renderCompareTray();\n  renderResults();\n}\n\nfunction chartSvg',
    '  renderCompareTray();\n  if (state.householdScenario?.decisionId) saveDecisionCandidates(state.householdScenario.decisionId, [...state.compare.values()]);\n  renderResults();\n}\n\nfunction chartSvg',
)

# hydrate / popstate / initial route
replace_once(
    "app.js",
    '  const profile = profileFromPath();\n  const household = householdFromPath();\n  state.workspaceView = profile || /^\\/investments\\/?$/i.test(location.pathname) ? "investments" : household ? "wealth" : "book";\n  state.currentHouseholdId = household;\n',
    '  const profile = profileFromPath();\n  const decisionRoute = decisionFromPath();\n  const household = decisionRoute?.householdId || householdFromPath();\n  state.workspaceView = profile || /^\\/investments\\/?$/i.test(location.pathname) ? "investments" : decisionRoute ? "decision" : household ? "wealth" : "book";\n  state.currentHouseholdId = household;\n  state.currentDecisionId = decisionRoute?.decisionId || null;\n',
)
replace_once(
    "app.js",
    '  const scenarioBack = event.target.closest("#scenarioBack");\n  if (scenarioBack && state.householdScenario?.householdId) openHousehold(state.householdScenario.householdId);\n',
    '  const scenarioBack = event.target.closest("#scenarioBack");\n  if (scenarioBack && state.householdScenario?.decisionId) openDecision(state.householdScenario.decisionId, state.householdScenario.householdId);\n  else if (scenarioBack && state.householdScenario?.householdId) openHousehold(state.householdScenario.householdId);\n',
)
replace_once(
    "app.js",
    '  const wealthRangeButton = event.target.closest("[data-wealth-range]");\n',
    '  const openDecisionButton = event.target.closest("[data-open-decision]");\n  if (openDecisionButton?.dataset.openDecision) openDecision(openDecisionButton.dataset.openDecision);\n  if (event.target.closest("[data-decision-back]")) openHousehold(state.currentHouseholdId);\n  if (event.target.closest("[data-decision-implementation]")) openDecisionImplementation();\n  if (event.target.closest("[data-build-decision-plan]")) buildCurrentDecisionPlan();\n  const wealthRangeButton = event.target.closest("[data-wealth-range]");\n',
)
replace_once(
    "app.js",
    '  const target = event.target;\n  if (target.matches("[data-column-choice]")) {\n',
    '  const target = event.target;\n  if (target.matches("[data-decision-control]")) {\n    state.decisionAssumptions[target.dataset.decisionControl] = Number(target.value);\n    refreshDecisionScenario();\n  }\n  if (target.matches("[data-column-choice]")) {\n',
)
replace_once(
    "app.js",
    'document.addEventListener("input", (event) => {\n  const target = event.target;\n  if (target.matches("[data-range-number]")) {\n',
    'document.addEventListener("input", (event) => {\n  const target = event.target;\n  if (target.matches("[data-decision-control]")) {\n    const output = document.querySelector(`[data-decision-control-output="${CSS.escape(target.dataset.decisionControl)}"]`);\n    if (output) output.textContent = decisionValue(Number(target.value), target.dataset.decisionFormat);\n  }\n  if (target.matches("[data-range-number]")) {\n',
)
replace_once(
    "app.js",
    'window.addEventListener("popstate", () => {\n  const slug = profileFromPath();\n',
    'window.addEventListener("popstate", () => {\n  const slug = profileFromPath();\n',
)
replace_once(
    "app.js",
    '  if (el("detailDrawer").classList.contains("open")) closeDrawer({ fromHistory: true });\n  const householdId = householdFromPath();\n',
    '  if (el("detailDrawer").classList.contains("open")) closeDrawer({ fromHistory: true });\n  const decisionRoute = decisionFromPath();\n  if (decisionRoute) { openDecision(decisionRoute.decisionId, decisionRoute.householdId, { updateHistory: false }); return; }\n  const householdId = householdFromPath();\n',
)
replace_once(
    "app.js",
    'const initialProfile = profileFromPath();\nconst initialHousehold = householdFromPath();\nif (initialHousehold) {\n  openHousehold(initialHousehold, { updateHistory: false });\n} else {\n',
    'const initialProfile = profileFromPath();\nconst initialDecision = decisionFromPath();\nconst initialHousehold = initialDecision?.householdId || householdFromPath();\nif (initialDecision) {\n  openDecision(initialDecision.decisionId, initialDecision.householdId, { updateHistory: false });\n} else if (initialHousehold) {\n  openHousehold(initialHousehold, { updateHistory: false });\n} else {\n',
)

# hover/focus prefetch decision projection
replace_once(
    "app.js",
    'function prefetchBookHousehold(target) {\n',
    '''function prefetchDecision(target) {
  if (!state.currentHouseholdId) return;
  const insightButton = target.closest?.("[data-wealth-insight]");
  const insight = insightButton ? HOUSEHOLD_INSIGHTS.find((candidate) => candidate.id === insightButton.dataset.wealthInsight) : null;
  if (insight?.decisionId) loadHouseholdDecision(insight.decisionId, state.currentHouseholdId).catch(() => {});
}

function prefetchBookHousehold(target) {
''',
)
replace_once(
    "app.js",
    'document.addEventListener("pointerover", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchBookHousehold(event.target); });\ndocument.addEventListener("focusin", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchBookHousehold(event.target); });\n',
    'document.addEventListener("pointerover", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchDecision(event.target); prefetchBookHousehold(event.target); });\ndocument.addEventListener("focusin", (event) => { scheduleDetailPrefetch(event.target); prefetchWealthDetail(event.target); prefetchDecision(event.target); prefetchBookHousehold(event.target); });\n',
)

# Decision Studio CSS appended using existing product tokens / visual DNA
styles = r'''

/* Phase Three · decision and action layer */
.decision-view { max-width: 1600px; margin: 0 auto; padding: 0 32px 56px; }
.decision-header { min-height: 122px; display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; padding: 26px 0 20px; border-bottom: 1px solid var(--line); }
.decision-header > div:first-child { min-width: 0; }
.decision-back { display: block; margin: 0 0 16px; padding: 0; border: 0; background: transparent; color: #555; font-size: 10px; font-weight: 700; cursor: pointer; }
.decision-header h1 { margin: 5px 0 5px; font-family: Georgia, 'Times New Roman', serif; font-size: 29px; font-weight: 500; letter-spacing: -.35px; }
.decision-header p { max-width: 760px; margin: 0; color: #666; font-size: 11px; line-height: 1.55; }
.decision-header-status { flex: none; min-width: 172px; padding: 13px 15px; border: 1px solid var(--line); background: #fff; }
.decision-header-status span, .decision-header-status small { display: block; color: #858580; font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.decision-header-status strong { display: block; margin: 5px 0 6px; font-size: 15px; }
.decision-stage-nav { display: flex; align-items: center; gap: 0; padding: 13px 0; border-bottom: 1px solid var(--line); }
.decision-stage-nav span { position: relative; display: flex; align-items: center; gap: 7px; min-width: 145px; color: #9a9a96; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.decision-stage-nav span:not(:last-child)::after { content: ''; width: 42px; height: 1px; margin-left: auto; margin-right: 14px; background: #ddd; }
.decision-stage-nav b { display: grid; width: 19px; height: 19px; place-items: center; border: 1px solid #cfcfca; border-radius: 50%; font-size: 8px; }
.decision-stage-nav span.active { color: #203f52; }
.decision-stage-nav span.active b { border-color: #203f52; background: #203f52; color: #fff; }
.decision-layout { display: grid; grid-template-columns: minmax(230px, .76fr) minmax(520px, 1.75fr) minmax(270px, .92fr); gap: 18px; padding-top: 18px; align-items: start; }
.decision-evidence, .decision-scenario, .decision-plan-column { min-width: 0; }
.decision-evidence, .decision-scenario, .decision-plan, .decision-candidates { border: 1px solid var(--line); background: #fff; }
.decision-evidence, .decision-scenario { padding: 19px; }
.decision-section-heading > span, .decision-plan > span, .decision-candidates > span, .decision-plan-heading > span { display: block; color: #8a8a86; font-size: 7px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.decision-section-heading h2 { margin: 4px 0 5px; font-family: Georgia, 'Times New Roman', serif; font-size: 19px; font-weight: 500; }
.decision-section-heading p { margin: 0 0 16px; color: #70706c; font-size: 10px; line-height: 1.55; }
.decision-evidence-row { padding: 11px 0; border-top: 1px solid #eeeeeb; }
.decision-evidence-row span, .decision-evidence-source span { display: block; margin-bottom: 4px; color: #8b8b87; font-size: 7px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.decision-evidence-row strong { display: block; color: #222; font-size: 12px; }
.decision-evidence-row small { display: block; margin-top: 3px; color: #777; font-size: 8px; line-height: 1.4; }
.decision-evidence-source { margin: 12px -19px -19px; padding: 13px 19px; border-top: 1px solid var(--line); background: #f7f7f5; }
.decision-evidence-source strong { display: block; font-size: 9px; }
.decision-evidence-source small { color: #777; font-size: 8px; }
.decision-controls { display: grid; gap: 12px; margin: 4px 0 17px; }
.decision-control { display: block; padding: 13px 14px 11px; border: 1px solid #deded9; background: #fafaf8; }
.decision-control > span { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.decision-control strong { font-size: 10px; }
.decision-control output { color: #203f52; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; }
.decision-control input[type='range'] { width: 100%; margin: 12px 0 6px; accent-color: #203f52; cursor: pointer; }
.decision-control > small { display: flex; justify-content: space-between; color: #92928e; font-size: 7px; }
.decision-control > small b { font-weight: 600; }
.decision-static-scenario { margin-bottom: 16px; padding: 14px; border: 1px solid #deded9; background: #fafaf8; }
.decision-static-scenario strong { font-size: 10px; }
.decision-static-scenario p { margin: 5px 0 0; color: #777; font-size: 9px; line-height: 1.5; }
.decision-impact-table { border: 1px solid var(--line); }
.decision-impact-head, .decision-impact-row { display: grid; grid-template-columns: minmax(210px, 1.55fr) .72fr .72fr; align-items: center; }
.decision-impact-head { min-height: 31px; padding: 0 12px; background: #f5f5f2; color: #777; font-size: 7px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.decision-impact-row { min-height: 48px; padding: 8px 12px; border-top: 1px solid #ecece8; }
.decision-impact-row > span:nth-child(n+2) { text-align: right; font-size: 10px; font-weight: 700; }
.decision-impact-row > span:last-child { color: #203f52; }
.decision-impact-row.tone-watch > span:last-child { color: #9a6c20; }
.decision-impact-row > span:first-child strong { display: block; font-size: 9px; }
.decision-impact-row > span:first-child small { display: block; margin-top: 2px; color: #858581; font-size: 7px; }
.decision-implementation-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 15px; padding: 16px; border: 1px solid #b9c9c3; background: #f5faf8; }
.decision-implementation-card.muted { border-color: var(--line); background: #fafaf8; }
.decision-implementation-card > div > span { display: block; color: #5f7d72; font-size: 7px; font-weight: 800; letter-spacing: .1em; }
.decision-implementation-card h3 { margin: 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 500; }
.decision-implementation-card p { margin: 0; color: #666; font-size: 9px; }
.decision-implementation-card p strong { color: #222; }
.decision-implementation-card em { display: inline-block; margin: 9px 5px 0 0; padding: 4px 6px; border: 1px solid #d7dfda; background: #fff; color: #53645e; font-size: 7px; font-style: normal; }
.decision-notes { margin-top: 10px; color: #898984; font-size: 7px; line-height: 1.45; }
.decision-notes p { margin: 3px 0; }
.decision-plan-column { display: grid; gap: 12px; }
.decision-candidates, .decision-plan { padding: 15px; }
.decision-candidates > div { padding: 9px 0; border-top: 1px solid #eeeeeb; }
.decision-candidates > div:first-of-type { margin-top: 8px; }
.decision-candidates strong, .decision-candidates small { display: block; }
.decision-candidates strong { font-size: 10px; }
.decision-candidates small { margin-top: 2px; color: #777; font-size: 7px; }
.decision-candidates.empty p { margin: 9px 0 0; color: #777; font-size: 9px; line-height: 1.5; }
.decision-plan-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.decision-plan-heading strong { padding: 4px 6px; background: #eef4f1; color: #246a58; font-size: 8px; }
.decision-plan > p { color: #666; font-size: 9px; line-height: 1.5; }
.decision-actions { margin-top: 12px; }
.decision-action { display: flex; gap: 9px; padding: 9px 0; border-top: 1px solid #eeeeeb; }
.decision-action i { flex: none; width: 8px; height: 8px; margin-top: 3px; border: 1px solid #aaa; border-radius: 50%; }
.decision-action.status-complete i { border-color: #246a58; background: #246a58; }
.decision-action.status-ready i { border-color: #b28a4d; background: #b28a4d; }
.decision-action strong, .decision-action small { display: block; }
.decision-action strong { font-size: 9px; line-height: 1.35; }
.decision-action small { margin-top: 2px; color: #888; font-size: 7px; }
.decision-plan.empty h3 { margin: 7px 0 5px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 500; }
.decision-plan.empty p, .decision-plan.empty li { color: #71716d; font-size: 8px; line-height: 1.5; }
.decision-plan.empty ol { margin: 10px 0 14px; padding-left: 17px; }
.decision-plan.empty li { margin: 4px 0; }
.decision-disclosure { margin: 0; color: #92928e; font-size: 7px; line-height: 1.5; }
.decision-loading { max-width: 660px; margin: 110px auto; padding: 34px; text-align: center; border: 1px solid var(--line); background: #fff; }
.decision-loading span { display: block; width: 22px; height: 22px; margin: 0 auto 12px; border: 2px solid #ddd; border-top-color: #203f52; border-radius: 50%; animation: spin .8s linear infinite; }
.decision-loading strong { display: block; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 500; }
.decision-loading p { color: #777; font-size: 9px; }
.book-decision-state { display: inline-block; width: fit-content; margin-top: 5px; padding: 3px 5px; background: #f1f4f2; color: #557067; font-size: 6px; font-style: normal; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
@media (max-width: 1160px) { .decision-layout { grid-template-columns: 250px minmax(0, 1fr); } .decision-plan-column { grid-column: 1 / -1; grid-template-columns: 1fr 1fr; } }
@media (max-width: 820px) { .decision-view { padding-left: 18px; padding-right: 18px; } .decision-header { align-items: flex-start; flex-direction: column; } .decision-layout { grid-template-columns: 1fr; } .decision-plan-column { grid-column: auto; grid-template-columns: 1fr; } .decision-stage-nav span { min-width: 0; flex: 1; } .decision-stage-nav span:not(:last-child)::after { display: none; } .decision-impact-head, .decision-impact-row { grid-template-columns: 1.25fr .7fr .7fr; } }
'''
Path("styles.css").write_text(Path("styles.css").read_text() + styles)

# tests: create a focused decision-domain suite
Path("tests/decision.test.mjs").write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { ADVISOR_BOOK_DATASET, DEFAULT_ADVISOR_ID } from "../lib/advisor-book-source.js";
import { createWealthService } from "../lib/wealth-service.js";
import { getAuthorizedWealthProjection } from "../api/wealth.js";

const service = createWealthService(ADVISOR_BOOK_DATASET);

test("advisor book contains normalized decisions, plans and actions with valid relationships", () => {
  const stats = service.getRepositoryStats();
  assert.ok(stats.decisions > 100);
  assert.ok(stats.actionPlans > 0);
  assert.ok(stats.actions > stats.actionPlans);
  const book = service.getAdvisorBook(DEFAULT_ADVISOR_ID, { pageSize: 200 });
  assert.equal(book.metrics.openDecisionHouseholds > 0, true);
  assert.equal(book.metrics.openDecisionCount, stats.decisions);
  assert.ok(book.metrics.activePlanCount > 0);
  assert.ok(book.items.some((item) => item.decision?.id && item.openDecisionCount > 0));
});

test("Morrison concentration decision models household consequences from underlying wealth data", () => {
  const decisions = service.getHouseholdDecisions("household-morrison");
  const concentration = decisions.find((decision) => decision.type === "concentration");
  assert.ok(concentration);
  const detail = service.getHouseholdDecision("household-morrison", concentration.id, { targetWeight: 12, goalFundingAmount: 400000 });
  assert.equal(detail.household.name, "Morrison Household");
  assert.equal(detail.scenario.kind, "concentration");
  assert.equal(detail.scenario.controls[0].key, "targetWeight");
  assert.equal(detail.scenario.metrics.find((item) => item.key === "positionWeight").before, 23.4);
  assert.equal(detail.scenario.metrics.find((item) => item.key === "positionWeight").after, 12);
  assert.ok(detail.scenario.outputs.releaseAmount > 1_300_000);
  assert.equal(detail.scenario.outputs.goalFundingAmount, 400000);
  assert.ok(detail.scenario.outputs.implementationAmount > 900000);
  assert.ok(detail.scenario.outputs.estimatedRealizedGain > 0);
  assert.equal(detail.scenario.implementation.category, "SMAs");
  assert.deepEqual(detail.scenario.implementation.flags, ["Tax-Aware", "Direct Indexing"]);
});

test("decision assumptions are bounded and cannot cross household or advisor boundaries", () => {
  const decision = service.getHouseholdDecisions("household-morrison").find((item) => item.type === "concentration");
  const bounded = service.getHouseholdDecision("household-morrison", decision.id, { targetWeight: -100, goalFundingAmount: 999999999 });
  const targetControl = bounded.scenario.controls.find((control) => control.key === "targetWeight");
  assert.ok(targetControl.value >= targetControl.min);
  const goalControl = bounded.scenario.controls.find((control) => control.key === "goalFundingAmount");
  if (goalControl) assert.ok(goalControl.value <= goalControl.max);
  const otherHousehold = ADVISOR_BOOK_DATASET.households.find((item) => item.id !== "household-morrison");
  assert.equal(service.getHouseholdDecision(otherHousehold.id, decision.id), null);
  assert.equal(getAuthorizedWealthProjection("advisor-does-not-exist", "household-morrison", "decision", decision.id), null);
});

test("non-concentration decisions use the same projection contract without forcing investment selection", () => {
  const decisions = service.getHouseholdDecisions("household-morrison");
  const liquidity = decisions.find((decision) => decision.type === "liquidity");
  const goalFunding = decisions.find((decision) => decision.type === "goal-funding");
  assert.ok(liquidity);
  const liquidityDetail = service.getHouseholdDecision("household-morrison", liquidity.id);
  assert.equal(liquidityDetail.scenario.kind, "liquidity");
  assert.ok(liquidityDetail.scenario.outputs.implementationAmount >= 0);
  if (goalFunding) {
    const goalDetail = service.getHouseholdDecision("household-morrison", goalFunding.id);
    assert.equal(goalDetail.scenario.kind, "goal-funding");
    assert.equal(goalDetail.scenario.implementation, null);
  }
});
''')

print("Phase Three patch applied")
