import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The welcome notice is neutral (not the yellow warning bar), sits at the bottom so the header
// stays free, and closes by itself.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the welcome toast is neutral, off the header and closes by itself", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `wt${now}`, "testtest", `wt+${now}@lighterpack.com`);
  const toast = page.locator(".lpGlobalAlerts");
  await expect(toast).toBeVisible({ timeout: 35000 });
  await expect(toast).toHaveClass(/lpGlobalAlertsInfo/);

  const box = await toast.boundingBox();
  const header = await page.locator("#header").boundingBox();
  expect(box!.y).toBeGreaterThan(header!.y + header!.height);

  await expect(toast).toHaveCount(0, { timeout: 12000 });
});
