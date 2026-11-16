import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The row's rating is counted (one, two or three green stars), not a colour to decode.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the row star shows one to three green stars", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sc${now}`, "testtest", `sc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const star = row.locator(".lpStar");
  const glyphs = () =>
    star.evaluate((el) => getComputedStyle(el, "::before").content);

  await row.hover();
  expect(await glyphs()).toBe('"☆"');

  for (const [n, text] of [
    [1, "★"],
    [2, "★★"],
    [3, "★★★"],
  ] as const) {
    await row.hover();
    await star.click();
    await expect(star).toHaveClass(new RegExp(`lpStar${n}`));
    expect(await glyphs()).toBe(`"${text}"`);
    await expect(star).toHaveAttribute("title", `Rate this item (${n}/3)`);
    await page.mouse.move(5, 5);
    await expect(star).toHaveCSS("color", "rgb(45, 122, 79)");
  }

  // Dark theme: a lighter green that stays readable.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.mouse.move(5, 5);
  await expect(star).toHaveCSS("color", "rgb(58, 158, 103)");
  await page.emulateMedia({ colorScheme: "light" });

  await row.hover();
  await star.click();
  await expect(star).toHaveClass(/lpStar0/);
  expect(await glyphs()).toBe('"☆"');
});
