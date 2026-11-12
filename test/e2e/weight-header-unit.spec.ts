import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The Weight column header names the unit of the rows, since the subtotals may use another one.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the weight column header shows the item unit and fits at 390px", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `wh${now}`, "testtest", `wh+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const header = page.locator(".lpItemsHeader .lpWeightCell").first();
  await expect(header).toHaveText(/Weight \((oz|g|lb|kg)\)/);

  await page.setViewportSize({ width: 390, height: 800 });
  const fits = await header.evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(fits).toBe(true);
});
