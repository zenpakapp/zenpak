import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The edit dialog ("More options") sets the 1 to 3 star rating, which the row's star shows.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the edit dialog sets the rating and the row shows it", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `er${now}`, "testtest", `er+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.locator(".lpStar")).toHaveClass(/lpStar0/);

  await row.hover();
  await row.locator(".lpEdit").click();
  const stars = page.locator(".itemDetailRatingBtn");
  await expect(stars).toHaveCount(3);
  await stars.nth(2).click();
  await expect(stars.nth(2)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(row.locator(".lpStar")).toHaveClass(/lpStar3/);

  // Reopened, it shows 3; tapping the active star clears it.
  await row.hover();
  await row.locator(".lpEdit").click();
  await expect(stars.nth(2)).toHaveAttribute("aria-pressed", "true");
  await stars.nth(2).click();
  await expect(stars.nth(2)).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(row.locator(".lpStar")).toHaveClass(/lpStar0/);
});
