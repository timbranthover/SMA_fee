import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CONCENTRATION_REVIEW,
  HOUSEHOLD,
  HOUSEHOLD_ACCOUNTS,
  HOUSEHOLD_GOALS,
  HOUSEHOLD_HOLDINGS,
  HOUSEHOLD_INSIGHTS,
  WEALTH_ALLOCATION,
  WEALTH_HISTORY,
} from "../lib/wealth-data.js";

test("the synthetic household is internally coherent and decision-useful", () => {
  assert.equal(HOUSEHOLD.name, "Morrison Household");
  assert.equal(HOUSEHOLD.netWorth, HOUSEHOLD.financialAssets + HOUSEHOLD.nonFinancialAssets - HOUSEHOLD.liabilities);
  assert.equal(WEALTH_ALLOCATION.reduce((sum, item) => sum + item.value, 0), 100);
  assert.equal(HOUSEHOLD_ACCOUNTS.reduce((sum, account) => sum + account.value, 0), HOUSEHOLD.financialAssets);
  assert.ok(HOUSEHOLD_HOLDINGS[0].weight > CONCENTRATION_REVIEW.targetWeight);
  assert.ok(CONCENTRATION_REVIEW.accounts.every((account) => account.gain > 0));
  assert.ok(HOUSEHOLD_GOALS.length >= 4);
  assert.ok(HOUSEHOLD_INSIGHTS.some((insight) => insight.id === "concentration"));
});

test("household performance history is ordered, bounded and ends at the stated value", () => {
  assert.ok(WEALTH_HISTORY.length > 250);
  assert.equal(WEALTH_HISTORY.at(-1).time, "2026-08-21");
  assert.equal(WEALTH_HISTORY.at(-1).value, 11.98);
  for (let index = 1; index < WEALTH_HISTORY.length; index += 1) {
    assert.ok(WEALTH_HISTORY[index].time > WEALTH_HISTORY[index - 1].time);
    assert.ok(WEALTH_HISTORY[index].value > 0);
  }
});

test("Total Wealth connects to the existing screener without hidden suitability logic", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const build = await readFile(new URL("../scripts/build-static.mjs", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(html, /id="wealthView"/);
  assert.match(html, /id="investmentView" hidden/);
  assert.match(html, /data-workspace-view="wealth">Total Wealth/);
  assert.match(html, /data-workspace-view="investments">Investments/);
  assert.match(html, /id="scenarioRibbon"/);
  assert.match(html, /id="wealthDrawer"/);
  assert.match(app, /function setWorkspaceView/);
  assert.match(app, /data-household-scenario="concentration"/);
  assert.match(app, /flags: \["Tax-Aware", "Direct Indexing"\]/);
  assert.match(app, /Carry the objective—not hidden client data/);
  assert.match(app, /library\.AreaSeries/);
  assert.match(css, /\.wealth-layout/);
  assert.match(css, /\.wealth-drawer\.open/);
  assert.match(build, /"wealth-data\.js"/);
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/investments" && rule.destination === "/"));
});

