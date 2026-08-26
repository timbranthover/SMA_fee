import { chromium } from "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.waitForSelector("#resultsBody tr[data-row-id]");
  assert.equal(await page.title(), "Investment Screener");
  assert.equal(await page.locator("#resultsBody tr[data-row-id]").count(), 25);
  assert.match(await page.locator("body").innerText(), /130,428/);
  assert.match(await page.locator(".brand-mark").innerText(), /UPS/);
  assert.equal(await page.getByText("Client context", { exact: true }).count(), 0);
  assert.equal(await page.locator("[data-nextjs-dialog], .vite-error-overlay").count(), 0);
  await page.screenshot({ path: "/tmp/investment-screener-home.png", fullPage: true });

  await page.locator("#searchInput").fill("moderate tax-aware SMA under 50 bps");
  await page.locator("#searchForm .search-button").click();
  await page.waitForResponse((response) => response.url().includes("/api/search") && response.status() === 200);
  await page.waitForFunction(() => document.querySelector("#resultsTitle")?.textContent === "SMAs");
  assert.match(await page.locator("#interpretationText").innerText(), /Tax-aware/);
  assert.ok(await page.locator("#resultsBody tr[data-row-id]").count() > 0);
  await page.screenshot({ path: "/tmp/investment-screener-search.png", fullPage: true });

  const firstName = await page.locator("#resultsBody [data-detail-id]").first().innerText();
  await page.locator("#resultsBody [data-detail-id]").first().click();
  await page.waitForSelector("#detailDrawer.open #drawerContent:not([hidden])");
  assert.match(await page.locator("#detailTitle").innerText(), new RegExp(firstName.slice(0, 10), "i"));
  assert.match(await page.locator("#drawerContent").innerText(), /Investment details/);
  assert.doesNotMatch(await page.locator("#drawerContent").innerText(), /Client eligibility/);
  await page.screenshot({ path: "/tmp/investment-screener-detail.png", fullPage: false });
  await page.locator("[data-close-drawer]").click();

  const checks = page.locator("#resultsBody [data-compare-id]");
  await checks.nth(0).check();
  await checks.nth(1).check();
  await page.waitForFunction(() => document.querySelector("#compareTray")?.hidden === false);
  assert.equal(await page.locator("#compareTrayCount").innerText(), "2");
  await page.locator("#compareButton").click();
  await page.waitForSelector("#compareModal[open]");
  assert.match(await page.locator("#compareModal").innerText(), /Objective/);
  assert.doesNotMatch(await page.locator("#compareModal").innerText(), /Client fit/);
  await page.screenshot({ path: "/tmp/investment-screener-compare.png", fullPage: false });
  await page.locator('[data-close-modal="compareModal"]').click();

  await page.locator("#saveScreenButton").click();
  await page.locator("#saveName").fill("Moderate tax-aware SMA shortlist");
  await page.locator("#saveForm button[type=submit]").click();
  assert.match(await page.locator("#toast").innerText(), /Saved/);
  await page.locator("[data-open-saved]").last().click();
  await page.waitForSelector("#savedModal[open]");
  assert.match(await page.locator("#savedModal").innerText(), /Moderate tax-aware SMA shortlist/);

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({ status: "passed", rows: 25, consoleErrors, pageErrors, screenshots: ["/tmp/investment-screener-home.png", "/tmp/investment-screener-search.png", "/tmp/investment-screener-detail.png", "/tmp/investment-screener-compare.png"] }, null, 2));
} finally {
  await browser.close();
}
