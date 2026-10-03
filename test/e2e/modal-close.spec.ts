import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

test.use({
  hasTouch: true,
});

// The item detail dialog is a representative consumer of the base Modal
// component, so it exercises the centralized close button.
async function openDialog(page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.locator(".lpAddItemWithDetails").click();
  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("shows an accessible close button and closes on click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const dialog = await openDialog(page);

  const closeButton = dialog.locator(".lpModalClose");
  await expect(closeButton).toBeVisible();
  // Accessible name is the translated label, never the raw i18n key.
  await expect(closeButton).toHaveAttribute("aria-label", "Close");

  await closeButton.click();
  await expect(dialog).toBeHidden();
});

test("still closes when clicking the overlay", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const dialog = await openDialog(page);

  // Click a corner of the overlay, away from the centered dialog.
  await page.locator(".lpModalOverlay").click({ position: { x: 10, y: 10 } });
  await expect(dialog).toBeHidden();
});

test("still closes when pressing Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const dialog = await openDialog(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("close button is present and tappable on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openDialog(page);

  const closeButton = dialog.locator(".lpModalClose");
  await expect(closeButton).toBeVisible();
  await closeButton.tap();
  await expect(dialog).toBeHidden();
});
