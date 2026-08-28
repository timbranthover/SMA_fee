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
  assert.equal(await page.locator("#sortSelect").inputValue(), "name-asc");
  assert.equal(await page.locator("#resultsHeader .col-investment").getAttribute("aria-sort"), "ascending");
  assert.match(await page.locator(".brand-mark").innerText(), /UPS/);
  const logoState = await page.locator(".product-logo").evaluateAll((logos) => logos.map((logo) => {
    const tile = logo.closest(".product-monogram").getBoundingClientRect();
    return { src: logo.getAttribute("src"), loaded: logo.complete && logo.naturalWidth > 0, tileWidth: tile.width, tileHeight: tile.height };
  }));
  assert.ok(logoState.length >= 8);
  assert.ok(logoState.every((logo) => logo.src.startsWith("/assets/brands/") && logo.loaded));
  assert.ok(logoState.every((logo) => logo.tileWidth === 31 && logo.tileHeight === 31));
  assert.ok(await page.locator(".product-monogram:not(.has-logo)").count() > 0);
  assert.equal(await page.locator(".product-monogram.logo-failed").count(), 0);
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
  await page.waitForSelector("#compareChart canvas");
  await page.waitForFunction(() => document.querySelector("#compareChartStatus")?.hidden === true);
  assert.match(await page.locator("#compareModal").innerText(), /Objective/);
  assert.match(await page.locator("#compareModal").innerText(), /Performance comparison/);
  assert.doesNotMatch(await page.locator("#compareModal").innerText(), /Client fit/);
  await page.locator('[data-compare-range="3Y"]').click();
  assert.equal(await page.locator('[data-compare-range="3Y"]').getAttribute("aria-pressed"), "true");
  await page.locator("#compareBenchmark").check();
  assert.equal(await page.locator('[data-compare-series="benchmark-sp500"]:visible').count(), 1);
  const firstSeries = page.locator("[data-compare-series]").first();
  await firstSeries.click();
  assert.equal(await firstSeries.getAttribute("aria-pressed"), "false");
  await page.locator("#compareTableWrap").click();
  assert.equal(await page.locator("#compareModal").getAttribute("open"), "");
  await page.screenshot({ path: "/tmp/investment-screener-compare.png", fullPage: false });
  await page.mouse.click(8, 80);
  await page.waitForSelector("#compareModal:not([open])");

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
