import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Picking a Gear Room suggestion fills the type when the dialog has none yet (the line threw a
// ReferenceError: it read a constant that was renamed and no longer imported).
test("picking a suggestion fills the type of an item that has none", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const library = createEditorLibrary(12, 4) as any;
  library.items[0].category = "";
  library.items[1].category = "water";
  library.items[1].name = "Bottle 1L";
  await mockSuccessfulEditorInitialization(page, library);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  await row.hover();
  await row.locator(".lpEdit").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#itemEditType")).toHaveValue("");

  const name = dialog.getByPlaceholder("Item name");
  await name.fill("");
  await name.pressSequentially("Bottle");
  await expect(dialog.getByRole("option").first()).toContainText("Bottle 1L");
  await name.press("ArrowDown");
  await name.press("Enter");

  await expect(name).toHaveValue("Bottle 1L");
  await expect(dialog.locator("#itemEditType")).toHaveValue("water");
  expect(errors).toEqual([]);
});
