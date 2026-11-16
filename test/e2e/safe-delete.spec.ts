import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A row removed from a list can be brought back with its settings; deleting an item from the
// library names the item and its lists, and puts the focus on Cancel, not on the delete button.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("removing a row can be undone and the library delete names what it removes", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sd${now}`, "testtest", `sd+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Give the row a setting that a bare re-add would lose.
  await row.hover();
  await row.locator(".lpWorn").click();
  await expect(row.locator(".lpWorn")).toHaveClass(/lpActive/);

  // The cross says what it does: it takes the item off this list, not out of the library.
  await expect(row.locator(".lpRemoveItem")).toHaveAttribute(
    "title",
    "Remove from list",
  );

  // Remove: the row goes, a toast offers Undo.
  await row.locator(".lpRemoveItem").click();
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(0);
  const toast = page
    .locator(".lpGlobalAlert")
    .filter({ hasText: "Camp stove" });
  await expect(toast).toContainText('"Camp stove" removed from the list.');
  await toast.getByRole("button", { name: "Undo" }).click();

  // Back, still worn.
  const back = page.locator(".lpItem[data-item-id]").first();
  await expect(back).toBeVisible();
  await expect(back.locator(".lpWorn")).toHaveClass(/lpActive/);

  // Library delete: names the item and the list that uses it, Cancel has the focus.
  const libraryRow = page
    .locator("#library .lpLibraryItem, .lpLibraryItem")
    .first();
  await libraryRow.hover();
  await libraryRow.locator(".lpRemoveLibraryItem").click();
  const dialog = page.locator("#speedbump");
  await expect(dialog).toContainText('"Camp stove"');
  await expect(dialog).toContainText("used in");
  await expect(
    dialog.getByRole("button", { name: "Delete", exact: true }),
  ).toHaveClass(/lpButtonDanger/);
  await expect(
    dialog.getByRole("button", { name: "No", exact: true }),
  ).toBeFocused();

  // Cancel keeps the item.
  await dialog.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(1);
});
