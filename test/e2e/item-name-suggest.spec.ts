import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

test("name field suggests Gear Room items and picks one with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Batons";
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  await row.hover();
  await row.locator(".lpEdit").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  const name = dialog.getByPlaceholder("Item name");
  // Opening the dialog on an existing name does not open the list.
  await expect(dialog.getByRole("listbox")).toHaveCount(0);

  await name.fill("");
  await name.pressSequentially("Fixture item 007");
  const options = dialog.getByRole("option");
  await expect(options.first()).toContainText("Fixture item 007");
  await expect(name).toHaveAttribute("aria-expanded", "true");

  await name.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");

  // Enter picks the suggestion and does not submit the form.
  await name.press("Enter");
  await expect(name).toHaveValue("Fixture item 007");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();

  // Escape closes the list without picking.
  await name.fill("");
  await name.pressSequentially("Fixture item 008");
  await expect(options.first()).toBeVisible();
  await name.press("Escape");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(name).toHaveValue("Fixture item 008");
});
