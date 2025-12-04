import { expect, test } from "@playwright/test";

import { setupLocalApiMocks } from "./support/mockApi";

test.beforeEach(async ({ page }) => {
  await setupLocalApiMocks(page);
});

test.describe("portfolio flows", () => {
  test("overview loads and time range change works", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("heading", { name: /portfolio overview/i })).toBeVisible();
    await page.getByRole("button", { name: "3Y" }).click();
    await expect(page.getByRole("button", { name: "3Y" })).toHaveClass(/bg-slate-900/);
    await expect(page.locator("[data-testid=equity-chart]")).toBeVisible();
  });

  test("strategy detail navigation and controls", async ({ page }) => {
    await page.goto("/strategies/1");
    await expect(page.getByRole("heading", { name: /strategy|momentum alpha/i })).toBeVisible();
    const main = page.getByRole("main");
    await main.getByRole("button", { name: "1Y" }).click();
    await page.getByLabel("Starting capital").fill("120000");
    await expect(main).toContainText(/Performance breakdown/i);
    await expect(main).toContainText(/Recent trades/i);
  });

  test("strategy comparison shows curves and correlation", async ({ page }) => {
    await page.goto("/strategy-comparison");
    const options = page.locator('[data-testid^="strategy-option-"]');
    const count = await options.count();
    test.skip(count < 2, "Not enough strategies to compare in this environment");

    await options.nth(0).click();
    await options.nth(1).click();
    await page.getByRole("button", { name: "5Y" }).click();

    await expect(page.locator("main")).toContainText(/Combined metrics/i);
    await expect(page.locator("[data-testid=correlation-heatmap]")).toBeVisible();
    await expect(page.locator("[data-testid=combined-equity-chart]")).toBeVisible();
  });
});
