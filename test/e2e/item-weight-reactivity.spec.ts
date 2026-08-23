import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Regression test for the stale weight snapshot in the list row.
// Editing an item's weight through the detail modal used to leave the list
// row frozen at its initial value because item.vue watched the whole `item`
// object shallowly — a watch that never fired when the library mutated the
// item in place. The fix watches `item.weight` by path instead.
test("updates the list row weight after editing via the detail modal, without reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });

  // Seed the first item with a zero weight: the bug was only observable when
  // the initial value was 0/absent, so this maximizes the test's value.
  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Batons";
  library.items[0].weight = 0;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  // A full page reload would also refresh the row, masking the reactivity bug.
  // Track any navigation after the editor has settled so we can prove the
  // update happened in place.
  let reloaded = false;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) reloaded = true;
  });

  const row = page.locator(".lpItem[data-item-id]").first();
  const weightInput = row.locator(".lpWeight");
  await expect(weightInput).toHaveValue("0");

  // Open the detail modal directly in edit mode (same path as the pencil icon).
  // The action icons are hidden until the row is hovered, so hover the row
  // first to make `.lpEdit` visible before clicking it.
  await row.hover();
  await row.locator(".lpEdit").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  // The item's weight field (not a category field) inside the edit form.
  const weightField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Weight" })
    .locator("input");
  await weightField.fill("146");

  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  // Save flips the modal back to view mode; close it to reveal the list row.
  await expect(dialog).toBeVisible();
  await dialog.locator(".lpModalClose").click();
  await expect(dialog).toBeHidden();

  await expect(weightInput).toHaveValue("146");
  expect(reloaded).toBe(false);
});
