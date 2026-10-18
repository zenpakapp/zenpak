import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Changing the unit in the item dialog used to relabel the number: 690 g became 690 oz
// (19.5 kg) on save. It now converts, so the item keeps the same real weight.
async function openDialog(page) {
  await page.setViewportSize({ width: 1024, height: 812 });
  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Bag";
  library.items[0].weight = 690000;
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();
  const row = page.locator('.lpItem[data-item-id="3"]');
  await row.hover();
  await row.locator(".lpEdit").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

const stored = (page) =>
  page.evaluate(() => {
    const item = window.LighterPack.$store.state.library.items.find(
      (i) => i.id === 3,
    );
    return { weight: item.weight, unit: item.authorUnit };
  });

test("changing the unit converts the shown weight", async ({ page }) => {
  const dialog = await openDialog(page);
  const weight = dialog.locator(".itemDetailUnitRow input");
  const unit = dialog.locator(".itemDetailUnitRow select");
  await expect(weight).toHaveValue("690");

  await unit.selectOption("oz");
  await expect(weight).toHaveValue("24.34");
  await unit.selectOption("kg");
  await expect(weight).toHaveValue("0.69");
  await unit.selectOption("g");
  await expect(weight).toHaveValue("690");
});

test("saving after a unit change keeps the exact weight", async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.locator(".itemDetailUnitRow select").selectOption("oz");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();
  await expect(dialog).toBeHidden();
  expect(await stored(page)).toEqual({ weight: 690000, unit: "oz" });
});

test("a weight typed before changing the unit is converted too", async ({
  page,
}) => {
  const dialog = await openDialog(page);
  await dialog.locator(".itemDetailUnitRow input").fill("5");
  await dialog.locator(".itemDetailUnitRow select").selectOption("kg");
  await expect(dialog.locator(".itemDetailUnitRow input")).toHaveValue("0.005");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();
  await expect(dialog).toBeHidden();
  expect(await stored(page)).toEqual({ weight: 5000, unit: "kg" });
});
