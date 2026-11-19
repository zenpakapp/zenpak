import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// On a phone a long press on a row of the sidebar selected its text and opened the system menu
// (Copy, Look up, Translate). The rows are not selectable on a touch screen; with a mouse they stay so.
async function openSidebar(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.waitForSelector("#sidebar");
  if (!(await page.locator("#main.lpHasSidebar").count())) {
    await page.locator("#hamburger").click();
  }
  await expect(
    page.locator("#sidebar ul.library li.lpLibraryItem").first(),
  ).toBeVisible();
}

const userSelect = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).userSelect);

test.describe("on a touch screen", () => {
  test.use({
    locale: "en-US",
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  test("the rows of the sidebar are not selectable", async ({ page }) => {
    await openSidebar(page);
    expect(await userSelect(page, "#sidebar li.lpLibraryItem")).toBe("none");
    expect(await userSelect(page, "#sidebar li.lpLibraryList")).toBe("none");
  });

  test("a field is still selectable and editable", async ({ page }) => {
    await openSidebar(page);
    expect(await userSelect(page, "#sidebar .librarySearch")).not.toBe("none");
  });
});

test.describe("with a mouse", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("the rows of the sidebar stay selectable", async ({ page }) => {
    await openSidebar(page);
    expect(await userSelect(page, "#sidebar li.lpLibraryItem")).not.toBe(
      "none",
    );
  });
});
