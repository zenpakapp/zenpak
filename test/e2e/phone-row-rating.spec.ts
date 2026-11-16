import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the rating star shows on a row only when the item has a rating, set from the edit
// dialog, and it is 44px tall like the other row icons.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("the rating star shows on a phone row only once the item is rated", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pr${now}`, "testtest", `pr+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.tap();
  }
  await page.locator(".lpAddItem").first().tap();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const star = row.locator(".lpStar");
  await expect(star).toBeHidden();

  await row.locator(".lpEdit").tap();
  await page.locator(".itemDetailRatingBtn").nth(1).tap();
  await page.getByRole("button", { name: "Save", exact: true }).tap();

  await expect(star).toHaveClass(/lpStar2/);
  await expect(star).toBeVisible();
  const box = await star.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // A tap on the star opens the edit dialog with the rating; it does not cycle the note, so the
  // star never vanishes under the finger.
  await star.tap();
  const stars = page.locator(".itemDetailRatingBtn");
  await expect(stars).toHaveCount(3);
  await expect(stars.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cancel", exact: true }).tap();
  await expect(star).toHaveClass(/lpStar2/);
  await expect(star).toBeVisible();
});
