import { expect, test } from "@playwright/test";

import { setupLocalApiMocks } from "./support/mockApi";

test.beforeEach(async ({ page }) => {
  await setupLocalApiMocks(page);
});

const routes = [
  { name: "Overview", path: "/", expectation: /Overview|Portfolio Control Center/ },
  { name: "Strategies", path: "/strategies", expectation: /Strategies/i },
  { name: "Trades", path: "/trades", expectation: /Trades/i },
  { name: "Uploads / Data", path: "/uploads", expectation: /Uploads/i },
  { name: "Settings / Health", path: "/settings", expectation: /Settings|Health/i },
  { name: "Admin Data", path: "/admin", expectation: /Admin Data|Uploads/i },
];

const badText = [/Unable to determine user/i, /auth endpoint was unreachable/i, /Waiting for Manus authentication/i];

test.describe("dashboard smoke", () => {
  test("renders navigation and major pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /portfolio control center/i })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();

    for (const route of routes) {
      const link = page.getByRole("link", { name: route.name });
      if ((await link.count()) === 0) continue;
      await link.click();
      const expectedPath = route.path === "/" ? /\/?$/ : new RegExp(`${route.path.replace("/", "\\/")}$`);
      await expect(page).toHaveURL(expectedPath);
      await expect(page.locator("main")).toContainText(route.expectation);
      for (const text of badText) {
        await expect(page.locator("main")).not.toContainText(text);
      }
    }

    expect(errors, "No unhandled page errors").toHaveLength(0);
  });
});
