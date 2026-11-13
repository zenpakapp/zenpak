import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The item type is one of a fixed list. The edit dialog offers it as a closed choice, like the
// tag form, so a typed value can no longer be saved and then dropped when the library loads.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the edit dialog offers the item type as a closed list and keeps the choice", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `it${now}`, "testtest", `it+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.locator(".lpAddItemWithDetails").first().click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  // A select, not a text field, with "None" plus the fixed types.
  const type = dialog.locator("select.itemDetailTypeSelect");
  await expect(type).toBeVisible();
  expect(await type.locator("option").count()).toBeGreaterThan(10);
  await expect(type.locator("option").first()).toHaveText(/None/i);
  await expect(dialog.locator(".itemDetailTypeSuggestions")).toHaveCount(0);

  await dialog.locator("input").first().fill("Test tent");
  await type.selectOption("Shelter");
  await dialog
    .locator("button.lpButton", { hasText: /save|add/i })
    .last()
    .click();
  await expect(dialog).toBeHidden({ timeout: 10000 });

  // Reopen: the choice was kept.
  const row = page.locator(".lpItem[data-item-id]").first();
  await row.hover();
  await row.locator(".lpEdit").click();
  await expect(
    page.locator("#itemDetailDialog select.itemDetailTypeSelect"),
  ).toHaveValue("Shelter");

  // An item with a type keeps its tag button on a phone, where an empty one is hidden.
  await page.locator("#itemDetailDialog .lpModalClose").click();
  await page.setViewportSize({ width: 375, height: 812 });
  const tag = row.locator(".lpTag");
  await expect(tag).toBeVisible();
  await expect(tag).toHaveClass(/lpActive/);
});
