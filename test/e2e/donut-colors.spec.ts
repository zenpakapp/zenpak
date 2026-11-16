import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The first category gets the ZenPak green; a category with no weight has no slice, so no
// colour swatch; and the swatch outline is not a hard white box in the dark theme.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("donut: first colour is ZenPak green, empty categories have no swatch", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `dc${now}`, "testtest", `dc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const swatch = page.locator(".lpLegendCell .lpLegend");
  // No weight yet: no slice, so no swatch in the legend.
  await expect(swatch).toHaveCount(0);

  // With a weight the category has a slice and its swatch shows ZenPak green.
  await row.locator(".lpWeight").fill("500");
  await row.locator(".lpWeight").blur();
  await expect(swatch).toHaveCount(1);
  await expect(swatch).toHaveCSS("background-color", "rgb(45, 122, 79)");

  // Dark theme: the outline follows the theme border, not pure white.
  await page.emulateMedia({ colorScheme: "dark" });
  const outline = await swatch.evaluate(
    (el) => getComputedStyle(el).borderTopColor,
  );
  expect(outline).not.toBe("rgb(255, 255, 255)");
});
