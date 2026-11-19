import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The category name is a field only 20px tall. With the 8px radius of the taller fields it read as a
// pill, in its hover and focus states above all. Its corners stay small.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the category name field has small corners", async ({ page }) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  const field = page.locator("input.lpCategoryName").first();
  await field.waitFor();
  await field.focus();

  const { radius, height } = await field.evaluate((el) => ({
    radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
    height: el.getBoundingClientRect().height,
  }));
  expect(radius).toBeGreaterThan(0);
  expect(radius).toBeLessThanOrEqual(4);
  expect(radius / height).toBeLessThan(0.25);
});
