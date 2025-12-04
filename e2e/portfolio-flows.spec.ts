import { expect, test } from "@playwright/test";

test.describe("portfolio flows", () => {
  test("overview time range toggles", async ({ page }) => {
    await page.goto("/overview");
    await page.getByRole("button", { name: "3Y" }).click();
    await expect(page.getByRole("button", { name: "3Y" })).toHaveClass(/bg-slate-900/);
  });

  test("strategy detail renders sections", async ({ page }) => {
    await page.goto("/strategies/1");
    await expect(page.locator("main")).toContainText(/strategy detail|strategy/i);
    await expect(page.locator("main")).toContainText(/Recent trades/i);
    await expect(page.locator("main")).toContainText(/Performance breakdown/i);
  });

  test("strategy comparison selects strategies", async ({ page }) => {
    await page.goto("/strategy-comparison");
    const options = page.locator('[data-testid^="strategy-option-"]');
    const count = await options.count();
    test.skip(count < 2, "Not enough strategies to compare in this environment");

    await options.nth(0).click();
    await options.nth(1).click();

    await expect(page.locator("main")).toContainText(/Combined metrics/i);
  });
});
