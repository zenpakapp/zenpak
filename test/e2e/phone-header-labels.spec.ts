import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the rows stack quantity over weight, so the header does not show side-by-side column labels.
test.use({ locale: "en-US", viewport: { width: 375, height: 812 } });

test("category header hides column labels on a phone, shows them on desktop", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ph${now}`, "testtest", `ph+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const weight = page.locator(".lpItemsHeader .lpWeightCell").first();
  await expect(weight).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(weight).toBeVisible();
});
