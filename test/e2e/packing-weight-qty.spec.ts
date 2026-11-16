import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Packing mode on a phone shows the weight above the quantity, like the edit rows.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("packing rows put the weight above the quantity", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pw${now}`, "testtest", `pw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.tap();
  }
  await page.locator(".lpAddItem").first().tap();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  await page.locator(".lpTotalsContainer .lpPackBtn").tap();
  await expect(page.locator(".lpPackingBar")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  const weight = await row.locator(".lpWeightCell").boundingBox();
  const qty = await row.locator(".lpQtyCell").boundingBox();
  expect(weight?.y ?? 0, "weight above quantity").toBeLessThan(qty?.y ?? 0);
});
