import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Fields and text buttons are at least 24px tall (WCAG 2.5.8): four were 21 or 22px.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

async function height(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();
  const b = await locator.boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return b.height;
}

async function openEditor(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
}

test("category name field and menu button are 24px tall", async ({ page }) => {
  await openEditor(page);
  expect(await height(page, "input.lpCategoryName")).toBeGreaterThanOrEqual(24);
  expect(await height(page, "#hamburger")).toBeGreaterThanOrEqual(24);
});

test("item name in the gear room is 24px tall", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit(
      "setGearRoomOpen",
      true,
    );
  });
  expect(await height(page, ".lpGearRoomItemName")).toBeGreaterThanOrEqual(24);
});

test("'used in' badge in the item dialog is 24px tall", async ({ page }) => {
  await openEditor(page);
  await page.locator(".lpItem[data-item-id]").first().dblclick();
  expect(await height(page, ".itemDetailUsedInBadge")).toBeGreaterThanOrEqual(
    24,
  );
});
