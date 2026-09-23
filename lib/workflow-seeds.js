const INVESTMENT_STEPS = Object.freeze([
  "Confirm the household target",
  "Review account location and tax lots",
  "Evaluate replacement investments",
  "Discuss the proposed path with the client",
]);

const FUNDING_STEPS = Object.freeze([
  "Confirm the amount and due date",
  "Confirm the designated funding account",
  "Schedule the transfer",
  "Verify completion",
]);

const SOLUTIONS = Object.freeze({
  aperio: Object.freeze({ id: "sma-aperio", name: "Tax-Managed US Large Cap Index", symbol: "", category: "SMAs", type: "Separately managed account", manager: "Aperio Group", assetClass: "US Equity", objective: "Tax-aware diversified US equity", benchmark: "Russell 1000 Index", risk: "Moderate", liquidity: "Daily liquidity", fee: 0.35, minimum: 250000 }),
  parametric: Object.freeze({ id: "syn-smas-1", name: "AllianceBernstein Tax-Managed US Broad Market Index", symbol: "", category: "SMAs", type: "Separately managed account", manager: "AllianceBernstein", assetClass: "US Equity", objective: "Tax-managed diversified US equity", benchmark: "Russell 1000 Index", risk: "Moderate", liquidity: "Daily liquidity", fee: 0.25, minimum: 100000 }),
  ivv: Object.freeze({ id: "etf-ivv", name: "iShares Core S&P 500 ETF", symbol: "IVV", category: "ETFs", type: "Exchange-traded fund", manager: "BlackRock", assetClass: "US Large Cap Equity", objective: "Broad US large-cap equity exposure", benchmark: "S&P 500 Index", risk: "Moderate", liquidity: "Exchange-traded; intraday liquidity", fee: 0.03, minimum: 0 }),
  vti: Object.freeze({ id: "etf-listed-1027", name: "Vanguard Total Stock Market ETF", symbol: "VTI", category: "ETFs", type: "Exchange-traded fund", manager: "Vanguard", assetClass: "US Equity", objective: "Broad US total-market equity exposure", benchmark: "CRSP US Total Market Index", risk: "Moderate", liquidity: "Exchange-traded; intraday liquidity", fee: 0.03, minimum: 0 }),
});

function candidate(solution, amount) {
  return Object.freeze({ ...solution, amount });
}

function plan({ decisionId, householdId, title, amount, createdAt, candidates = [], kind = "investment-basket", steps = INVESTMENT_STEPS }) {
  return Object.freeze({
    decisionId,
    householdId,
    title,
    objective: title,
    kind,
    status: "Plan drafted",
    createdAt,
    updatedAt: createdAt,
    implementationAmount: amount,
    steps: steps.map((step, index) => Object.freeze({ id: `step-${index + 1}`, title: step, complete: index < 2 })),
    candidates,
  });
}

function proposal({ decisionId, householdId, householdName, members, decisionTitle, amount, createdAt, candidates, sourceLabel }) {
  return Object.freeze({
    id: `proposal-${decisionId}`,
    decisionId,
    householdId,
    householdName,
    members,
    decisionTitle,
    objective: "Reduce single-position risk with a diversified, tax-aware implementation.",
    sourceLabel,
    sourceValue: "Modeled sale proceeds from the concentrated position",
    totalAmount: amount,
    status: "Ready for client",
    rationale: "We propose reducing the concentrated holding and reinvesting the proceeds across diversified solutions selected for tax awareness, broad market exposure, and daily liquidity.",
    sections: { householdImpact: true, proposedSolutions: true, costsAndConsiderations: true, nextSteps: true },
    impactModel: null,
    candidates,
    createdAt,
    updatedAt: createdAt,
  });
}

export const SEEDED_DECISION_ARTIFACTS = Object.freeze({
  "household-004-decision-1eb88k3": Object.freeze({
    signalAt: "2026-07-16", openedAt: "2026-07-20", planAt: "2026-07-24", finalizedAt: "2026-08-05",
    plan: plan({ decisionId: "household-004-decision-1eb88k3", householdId: "household-004", title: "CAT concentration implementation", amount: 1350000, createdAt: "2026-07-24T14:30:00Z", candidates: [candidate(SOLUTIONS.aperio, 750000), candidate(SOLUTIONS.ivv, 600000)] }),
    proposal: proposal({ decisionId: "household-004-decision-1eb88k3", householdId: "household-004", householdName: "Patel Household", members: ["Diana Patel", "Alexander Patel"], decisionTitle: "Reducing concentration in Caterpillar", amount: 1350000, createdAt: "2026-08-05T16:10:00Z", sourceLabel: "CAT sale proceeds", candidates: [candidate(SOLUTIONS.aperio, 750000), candidate(SOLUTIONS.ivv, 600000)] }),
  }),
  "household-014-decision-1ffigsm": Object.freeze({
    signalAt: "2026-07-28", openedAt: "2026-07-30",
  }),
  "household-032-decision-1y1j4ji": Object.freeze({
    signalAt: "2026-07-31", openedAt: "2026-08-03", planAt: "2026-08-07",
    plan: plan({ decisionId: "household-032-decision-1y1j4ji", householdId: "household-032", title: "CRWD diversification basket", amount: 925000, createdAt: "2026-08-07T15:45:00Z", candidates: [candidate(SOLUTIONS.parametric, 525000), candidate(SOLUTIONS.vti, 400000)] }),
  }),
  "household-038-decision-1e7undk": Object.freeze({
    signalAt: "2026-08-01", openedAt: "2026-08-04", planAt: "2026-08-08",
    plan: Object.freeze({ ...plan({ decisionId: "household-038-decision-1e7undk", householdId: "household-038", title: "$150K charitable-pledge funding schedule", amount: 150000, createdAt: "2026-08-08T12:15:00Z", kind: "funding-schedule", steps: FUNDING_STEPS }), sourceAccountName: "Household cash across linked accounts", dueDate: "This quarter" }),
  }),
  "household-039-decision-biz5jr": Object.freeze({
    signalAt: "2026-06-23", openedAt: "2026-06-25", planAt: "2026-07-01", completedAt: "2026-07-18",
    plan: plan({ decisionId: "household-039-decision-biz5jr", householdId: "household-039", title: "T concentration implementation", amount: 680000, createdAt: "2026-07-01T18:20:00Z", candidates: [candidate(SOLUTIONS.vti, 680000)] }),
  }),
  "household-060-decision-174udsh": Object.freeze({
    signalAt: "2026-08-06", openedAt: "2026-08-08", planAt: "2026-08-12",
    plan: plan({ decisionId: "household-060-decision-174udsh", householdId: "household-060", title: "MFG diversification basket", amount: 1240000, createdAt: "2026-08-12T14:05:00Z", candidates: [candidate(SOLUTIONS.aperio, 740000), candidate(SOLUTIONS.ivv, 500000)] }),
  }),
  "household-067-decision-nvtbeg": Object.freeze({
    signalAt: "2026-07-11", openedAt: "2026-07-15", planAt: "2026-07-22", finalizedAt: "2026-08-11",
    plan: plan({ decisionId: "household-067-decision-nvtbeg", householdId: "household-067", title: "SNOW concentration implementation", amount: 1100000, createdAt: "2026-07-22T16:40:00Z", candidates: [candidate(SOLUTIONS.parametric, 650000), candidate(SOLUTIONS.vti, 450000)] }),
    proposal: proposal({ decisionId: "household-067-decision-nvtbeg", householdId: "household-067", householdName: "Cooper Household", members: ["Edward Cooper", "Olivia Cooper"], decisionTitle: "Reducing concentration in Snowflake", amount: 1100000, createdAt: "2026-08-11T17:05:00Z", sourceLabel: "SNOW sale proceeds", candidates: [candidate(SOLUTIONS.parametric, 650000), candidate(SOLUTIONS.vti, 450000)] }),
  }),
  "household-102-decision-86yl72": Object.freeze({ signalAt: "2026-08-15", openedAt: "2026-08-18" }),
});

export function seededDecisionArtifact(decisionId) {
  return SEEDED_DECISION_ARTIFACTS[decisionId] || null;
}

export function seededDecisionStatus(decisionId) {
  const artifact = seededDecisionArtifact(decisionId);
  if (!artifact) return "New";
  if (artifact.completedAt) return "Complete";
  if (artifact.proposal?.status === "Ready for client") return "Ready for client";
  if (artifact.plan && (artifact.plan.kind === "funding-schedule" || artifact.plan.candidates?.length)) return "Plan drafted";
  if (artifact.openedAt) return "Reviewing";
  return "New";
}

export function seededDecisionTransitions(decision) {
  const artifact = seededDecisionArtifact(decision.id);
  const transitions = [{ status: "New", occurredAt: artifact?.signalAt || decision.signalAt, title: "Decision created", type: "decision" }];
  if (artifact?.openedAt) transitions.push({ status: "Reviewing", occurredAt: artifact.openedAt, title: "Decision review opened", type: "decision" });
  if (artifact?.planAt) transitions.push({ status: "Plan drafted", occurredAt: artifact.planAt, title: artifact.plan?.kind === "funding-schedule" ? "Funding plan scheduled" : "Implementation basket saved", type: "plan" });
  if (artifact?.finalizedAt) transitions.push({ status: "Ready for client", occurredAt: artifact.finalizedAt, title: "Client proposal finalized", type: "plan" });
  if (artifact?.completedAt) transitions.push({ status: "Complete", occurredAt: artifact.completedAt, title: "Decision completed", type: "plan" });
  return transitions;
}

export const SEEDED_DECISION_PLANS = Object.freeze(Object.values(SEEDED_DECISION_ARTIFACTS).map((artifact) => artifact.plan).filter(Boolean));
export const SEEDED_PROPOSALS = Object.freeze(Object.values(SEEDED_DECISION_ARTIFACTS).map((artifact) => artifact.proposal).filter(Boolean));
