import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Weights are stored in mg and shown in the library's item unit. In kg, a 4 g item used to
// show as 0 and a 28.349 g item as 0.03, and saving either (even just renaming it) wrote
// the rounded value back over the real weight.
async function openEditor(page) {
  await page.setViewportSize({ width: 1024, height: 812 });
  const library = createEditorLibrary(12, 4);
  library.itemUnit = "kg";
  library.totalUnit = "kg";
  library.items[0].name = "Spork";
  library.items[0].weight = 4000;
  library.items[1].name = "Bag";
  library.items[1].weight = 28349;
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();
}

const storedWeight = (page, name) =>
  page.evaluate(
    (itemName) =>
      window.LighterPack.$store.state.library.items.find(
        (item) => item.name === itemName,
      ).weight,
    name,
  );

// Fixture item ids start at 3: Spork is item 3, Bag is item 4.
const ITEM_IDS = { Spork: 3, Bag: 4 };
const row = (page, name) =>
  page.locator(`.lpItem[data-item-id="${ITEM_IDS[name]}"]`);

test("a light item shows its real weight instead of 0", async ({ page }) => {
  await openEditor(page);
  await expect(row(page, "Spork").locator(".lpWeight")).toHaveValue("0.004");
  await expect(row(page, "Bag").locator(".lpWeight")).toHaveValue("0.028");
});

test("retyping the shown weight does not overwrite the stored one", async ({
  page,
}) => {
  await openEditor(page);
  await row(page, "Bag").locator(".lpWeight").fill("0.028");
  expect(await storedWeight(page, "Bag")).toBe(28349);
  await row(page, "Bag").locator(".lpWeight").fill("0.05");
  expect(await storedWeight(page, "Bag")).toBe(50000);
});

test("renaming an item in the detail dialog keeps its exact weight", async ({
  page,
}) => {
  await openEditor(page);
  const bag = row(page, "Bag");
  await bag.hover();
  await bag.locator(".lpEdit").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  await dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Name" })
    .locator("input")
    .fill("Dry bag");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();
  await expect(dialog).toBeHidden();
  expect(await storedWeight(page, "Dry bag")).toBe(28349);
});
