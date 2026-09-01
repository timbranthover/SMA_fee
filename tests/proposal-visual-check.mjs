import { chromium } from "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto("http://127.0.0.1:4173/household/household-morrison", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#wealthView:not([hidden])");
  assert.match(await page.locator("#wealthView").innerText(), /Morrison Household/);
  assert.ok((await page.locator("body").innerText()).trim().length > 1000);
  assert.equal(await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count(), 0);

  await page.getByRole("button", { name: /Apple concentration increased/ }).click();
  await page.waitForSelector("#decisionStudio:not([hidden]) [data-decision-implement]");
  const decisionText = await page.locator("#decisionStudio").innerText();
  assert.match(decisionText, /AVAILABLE TO REDEPLOY/);
  assert.match(decisionText, /STEP 1 OF 3/);
  assert.match(decisionText, /Find investments for proposal/);
  await page.screenshot({ path: "/tmp/proposal-decision-studio.png", fullPage: true });

  const searchResponse = page.waitForResponse((response) => response.url().includes("/api/search") && response.status() === 200);
  await page.locator("[data-decision-implement]").click();
  await searchResponse;
  await page.waitForSelector("#resultsBody [data-proposal-id]");
  assert.match(page.url(), /\/investments/);
  assert.equal(await page.locator("#scenarioRibbon").isVisible(), true);
  assert.match(await page.locator("#scenarioRibbon").innerText(), /STEP 2 OF 3/);
  assert.match(await page.locator("#scenarioRibbon").innerText(), /AVAILABLE TO ALLOCATE/);
  assert.equal(await page.locator("#proposalTray").isVisible(), true);
  assert.equal(await page.locator("#compareTray").isVisible(), false);

  const addButtons = page.locator("#resultsBody [data-proposal-id]");
  await addButtons.nth(0).click();
  await addButtons.nth(1).click();
  assert.match(await page.locator("#proposalTrayTitle").innerText(), /2 solutions selected/);
  assert.match(await page.locator("#proposalTrayRemaining").innerText(), /\$0 remaining/);
  assert.equal(await page.locator("#proposalContinue").isEnabled(), true);
  await page.screenshot({ path: "/tmp/proposal-investment-selection.png", fullPage: true });

  await page.locator("#proposalContinue").click();
  await page.waitForSelector("#proposalView:not([hidden]) .proposal-builder-layout");
  assert.match(page.url(), /\/proposal\//);
  assert.match(await page.locator("#proposalView").innerText(), /Build the client proposal/);
  assert.match(await page.locator("#proposalView").innerText(), /Prepared for/);
  assert.match(await page.locator("#proposalView").innerText(), /HOUSEHOLD IMPACT/);
  assert.match(await page.locator("#proposalView").innerText(), /COSTS & CONSIDERATIONS/);
  assert.equal(await page.locator("[data-proposal-generate]").first().isEnabled(), true);
  const proposalUrl = page.url();
  await page.screenshot({ path: "/tmp/proposal-builder.png", fullPage: true });

  await page.locator("[data-proposal-generate]").first().click();
  await page.waitForSelector("#proposalReadyModal[open]");
  assert.match(await page.locator("#proposalReadyModal").innerText(), /CLIENT PROPOSAL READY/);
  assert.match(await page.locator("#proposalReadyModal").innerText(), /ready for the client conversation/i);
  assert.equal(await page.locator(".proposal-document-brand > span").innerText(), "READY FOR CLIENT");
  await page.screenshot({ path: "/tmp/proposal-ready.png", fullPage: true });

  await page.locator("[data-close-modal=proposalReadyModal]").click();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#proposalView:not([hidden]) .proposal-builder-layout");
  assert.equal(page.url(), proposalUrl);
  assert.match(await page.locator("#proposalView").innerText(), /READY FOR CLIENT/);

  await page.locator("[data-open-decision-from-proposal]").click();
  await page.waitForSelector("#decisionStudio:not([hidden])");
  assert.match(await page.locator("#decisionStudio").innerText(), /Ready for client/);
  assert.match(await page.locator("#decisionStudio").innerText(), /Implementation candidates/);

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(JSON.stringify({
    status: "passed",
    proposalUrl,
    consoleErrors,
    pageErrors,
    screenshots: [
      "/tmp/proposal-decision-studio.png",
      "/tmp/proposal-investment-selection.png",
      "/tmp/proposal-builder.png",
      "/tmp/proposal-ready.png",
    ],
  }, null, 2));
} finally {
  await browser.close();
}
