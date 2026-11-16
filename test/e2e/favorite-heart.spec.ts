import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The favourite is a green heart, so it is not mistaken for the 1 to 3 star rating.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the favourite toggle is a green heart", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `fh${now}`, "testtest", `fh+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  await row.hover();
  await row.locator(".lpEdit").click();
  const heart = page.locator(".itemDetailStar");
  await expect(heart).toHaveText("♡");

  await heart.click();
  await expect(heart).toHaveText("♥");
  // Away from the pointer, so the colour is the "on" one and not the hover one.
  await page.mouse.move(5, 5);
  await expect(heart).toHaveCSS("color", "rgb(45, 122, 79)");
});
