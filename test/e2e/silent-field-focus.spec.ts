import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The inline fields of an item row are rounded, and focus is a 1px accent border with a soft ring,
// not a 2px outline.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a focused item field is rounded with a thin border and a soft ring", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sf${now}`, "testtest", `sf+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Tent");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page
    .locator(".lpCategory")
    .first()
    .locator(".lpItem[data-item-id]")
    .first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const field = row.locator("input.lpDescription");
  await field.click();
  const style = await field.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      radius: s.borderTopLeftRadius,
      border: s.borderTopWidth,
      outline: s.outlineStyle,
      shadow: s.boxShadow,
    };
  });
  expect(style.radius).toBe("8px");
  expect(style.border).toBe("1px");
  expect(style.outline).toBe("none");
  expect(style.shadow).not.toBe("none");
});
