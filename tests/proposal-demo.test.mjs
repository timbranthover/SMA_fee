import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allocateProposalCandidates, createProposalDraft, finalizedProposalEvents, getProposal, getProposalReadiness, markProposalReady, reallocateProposalCandidate, reopenProposal, saveProposal } from "../lib/proposal-data.js";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const candidates = [
  { id: "a", name: "A", category: "SMAs", minimum: 250_000, fee: 0.3, liquidity: "Daily", amount: 0 },
  { id: "b", name: "B", category: "SMAs", minimum: 100_000, fee: 0.4, liquidity: "Daily", amount: 0 },
];

test("even split stays equal where feasible and explains infeasible minimums", () => {
  assert.deepEqual(allocateProposalCandidates(candidates, 1_000_000).map(({ amount }) => amount), [500_000, 500_000]);
  assert.deepEqual(allocateProposalCandidates(candidates, 450_000).map(({ amount }) => amount), [250_000, 200_000]);
  const impossible = allocateProposalCandidates(candidates, 250_000);
  assert.deepEqual(impossible.map(({ amount }) => amount), [125_000, 125_000]);
  const draft = createProposalDraft({ decisionId: "min-demo", householdId: "household-morrison", totalAmount: 250_000, sourceLabel: "Portfolio cash", sourceValue: "$250,000", rationale: "We recommend the selected strategies for your household needs.", candidates: impossible });
  assert.match(getProposalReadiness(draft).blockers.find(({ code }) => code === "minimums").label, /Selected minimums total \$350,000; budget is \$250,000/);
});

test("twenty allocation edits stay exact and above minimums", () => {
  let allocation = allocateProposalCandidates(candidates, 1_000_000);
  for (let index = 0; index < 20; index += 1) {
    allocation = reallocateProposalCandidate(allocation, 1_000_000, "a", 400_000 + index * 5_000);
    assert.equal(allocation.reduce((sum, item) => sum + item.amount, 0), 1_000_000);
    assert.ok(allocation.every((item) => item.amount >= item.minimum));
  }
  assert.equal(allocation[0].amount, 495_000);
});

test("finalized proposals persist as ready until explicitly reopened, with a timeline event", () => {
  storage.clear();
  const draft = createProposalDraft({ decisionId: "final-demo", householdId: "household-morrison", householdName: "Morrison Household", totalAmount: 500_000, sourceLabel: "Apple sale proceeds", sourceValue: "$500,000", rationale: "We propose to diversify the concentrated Apple position with complementary strategies.", candidates: allocateProposalCandidates(candidates, 500_000) });
  saveProposal(draft);
  assert.equal(markProposalReady("final-demo").status, "Ready for client");
  assert.equal(getProposal("final-demo").status, "Ready for client");
  const events = finalizedProposalEvents([getProposal("final-demo")], "household-morrison");
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Client proposal finalized");
  assert.equal(events[0].decisionId, "final-demo");
  assert.equal(reopenProposal("final-demo").status, "Draft");
  assert.equal(finalizedProposalEvents([getProposal("final-demo")], "household-morrison").length, 0);
});

test("proposal markup has no CSP-blocked inline styles and has proportional progress controls", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /style="width:/);
  assert.match(app, /<progress id="proposalFundingProgress"/);
  assert.match(app, /<progress data-proposal-allocation-progress=/);
  assert.match(app, /input type="number"[^>]+data-proposal-allocation=/);
  assert.doesNotMatch(app, /input type="range"[^>]+data-proposal-allocation=/);
  assert.match(app, /data-proposal-reopen/);
  assert.match(app, /Values as of Aug 21, 2026/);
});
