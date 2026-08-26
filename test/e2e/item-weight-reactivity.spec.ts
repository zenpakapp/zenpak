import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

test("closes the detail modal after saving an edit opened directly from a list row", async ({
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

  await expect(dialog).toBeHidden();

  await expect(weightInput).toHaveValue("146");
  expect(reloaded).toBe(false);
});

test("persists list-specific item options after editing via the detail modal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });

  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Trail shirt";
  library.categories[0].categoryItems[0].qty = 2;
  library.categories[0].categoryItems[0].worn = false;
  library.categories[0].categoryItems[0].consumable = false;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  await row.hover();
  await row.locator(".lpEdit").click();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Worn").check();
  await dialog.getByLabel("Consumable").check();
  await expect(dialog.getByLabel("Worn")).not.toBeChecked();
  await dialog.getByLabel("Option").check();
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(dialog).toBeHidden();

  await row.hover();
  await expect(row.locator(".lpWorn")).not.toHaveClass(/lpActive/);
  await expect(row.locator(".lpConsumable")).toHaveClass(/lpActive/);
  await expect(row.locator(".lpOptionDot")).toHaveClass(/lpActive/);
  await expect(row.locator(".lpQty")).toHaveValue("0");
});

test("updates the list row quantity after editing via the detail modal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });

  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Tent stake";
  library.categories[0].categoryItems[0].qty = 1;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  const qtyInput = row.locator(".lpQty");
  await expect(qtyInput).toHaveValue("1");

  await row.hover();
  await row.locator(".lpEdit").click();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  const qtyField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Qty" })
    .locator("input");
  await qtyField.fill("3");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(dialog).toBeHidden();
  await expect(qtyInput).toHaveValue("3");
});

test("updates the summary and list row quantity after editing from the item summary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });

  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Groundsheet";
  library.categories[0].categoryItems[0].qty = 1;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  const qtyInput = row.locator(".lpQty");
  await expect(qtyInput).toHaveValue("1");

  await row.dblclick();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  const summaryQtyValue = dialog
    .locator(".itemDetailStat")
    .filter({ hasText: "Qty" })
    .locator(".itemDetailStatValue");
  await expect(summaryQtyValue).toHaveText("-");

  await dialog.getByRole("button", { name: "Edit gear" }).click();

  const qtyField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Qty" })
    .locator("input");
  await qtyField.fill("3");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(dialog).toBeVisible();
  await expect(summaryQtyValue).toHaveText("3");

  await dialog.locator(".lpModalClose").click();
  await expect(dialog).toBeHidden();
  await expect(qtyInput).toHaveValue("3");
});

test("updates the restored quantity for an optional item edited from details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });

  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Optional stakes";
  library.categories[0].categoryItems[0].qty = 0;
  library.categories[0].categoryItems[0].qtyBeforeOptional = 1;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  const qtyInput = row.locator(".lpQty");
  await expect(qtyInput).toHaveValue("0");

  await row.hover();
  await row.locator(".lpEdit").click();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();

  const qtyField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Qty" })
    .locator("input");
  await expect(qtyField).toHaveValue("1");
  await qtyField.fill("3");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(dialog).toBeHidden();
  await expect(qtyInput).toHaveValue("0");

  await row.hover();
  await row.locator(".lpOptionDot").click();
  await expect(qtyInput).toHaveValue("3");
});

test("updates the active list quantity when editing an item opened from gear room", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await page.addInitScript(() => {
    window.localStorage.setItem("zp-locale", "fr");
  });

  const library = createEditorLibrary(12, 4);
  library.items[0].name = "Nano 10k Power Bank";
  library.items[0].brand = "Anker";
  library.categories[0].categoryItems[0].qty = 1;

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  const row = page.locator(".lpItem[data-item-id]").first();
  const qtyInput = row.locator(".lpQty");
  await expect(qtyInput).toHaveValue("1");

  await page.locator(".lpGearRoomBtn").click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await page.locator(".lpGearRoom").getByText("Nano 10k Power Bank").click();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  const summaryQtyValue = dialog
    .locator(".itemDetailStat")
    .filter({ hasText: /Qty|Qté/ })
    .locator(".itemDetailStatValue");
  await expect(summaryQtyValue).toHaveText("1");

  await dialog.locator(".itemDetailEdit").click();
  const qtyField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: /Qty|Qté/ })
    .locator("input");
  await qtyField.fill("2");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(summaryQtyValue).toHaveText("2");
  await dialog.locator(".lpModalClose").click();
  await expect(qtyInput).toHaveValue("2");
});

test("shows default quantity but keeps it non-editable for gear room items outside the active list", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await page.addInitScript(() => {
    window.localStorage.setItem("zp-locale", "fr");
  });

  const library = createEditorLibrary(3, 1);
  library.items[1].name = "Standalone Power Bank";
  library.items[1].brand = "Anker";

  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator("#main")).toBeVisible();

  await page.locator(".lpGearRoomBtn").click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await page.locator(".lpGearRoom").getByText("Standalone Power Bank").click();

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  const summaryQtyValue = dialog
    .locator(".itemDetailStat")
    .filter({ hasText: /Qty|Qté/ })
    .locator(".itemDetailStatValue");
  await expect(summaryQtyValue).toHaveText("1");

  await dialog.locator(".itemDetailEdit").click();
  const qtyField = dialog
    .locator(".itemDetailField")
    .filter({ hasText: /Qty|Qté/ })
    .locator("input");
  await expect(qtyField).toBeVisible();
  await expect(qtyField).toHaveValue("-");
  await expect(qtyField).toBeDisabled();
});
