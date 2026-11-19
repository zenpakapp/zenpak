import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The rows of the lists and of the items spanned less than the column: a 10px margin on each side
// made their separators and their hover background narrower than the filters above them.
test.use({ locale: "en-US", viewport: { width: 500, height: 812 } });

test("the rows of the sidebar span the same width as its filters", async ({
  page,
}) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.waitForSelector("#sidebar");
  if (!(await page.locator("#main.lpHasSidebar").count())) {
    await page.locator("#hamburger").click();
  }
  await expect(page.locator("#sidebar")).toBeInViewport({ ratio: 1 });

  const edges = async (selector: string) => {
    const box = (await page.locator(selector).first().boundingBox())!;
    return { left: Math.round(box.x), right: Math.round(box.x + box.width) };
  };
  const filters = await edges("#sidebar .lpLibraryFilters");
  expect(await edges("#sidebar #lists .lpLibraryList")).toEqual(filters);
  expect(await edges("#sidebar ul.library li.lpLibraryItem")).toEqual(filters);
});

test.describe("on a touch screen", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  test("creating a list does not scroll the sidebar sideways", async ({
    page,
  }) => {
    await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
    await page.goto(testRoot);
    await page.waitForSelector("#sidebar");
    if (!(await page.locator("#main.lpHasSidebar").count())) {
      await page.locator("#hamburger").tap();
    }
    await page.locator(".listContainerHeader .lpTarget .lpAdd").tap();
    await page.getByText("New blank list").first().tap();
    await expect(page.locator("#lists .lpLibraryList")).toHaveCount(2);

    const scrolled = await page
      .locator("#scrollable")
      .evaluate((el) => el.scrollLeft);
    expect(scrolled).toBe(0);
  });
});

test("the weight of a library item sits at the height of its buttons", async ({
  page,
}) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.waitForSelector("#sidebar");
  if (!(await page.locator("#main.lpHasSidebar").count())) {
    await page.locator("#hamburger").click();
  }
  const row = page.locator("#sidebar ul.library li.lpLibraryItem").first();
  await expect(row).toBeVisible();
  const middle = async (selector: string) => {
    const box = (await row.locator(selector).boundingBox())!;
    return box.y + box.height / 2;
  };
  const weight = await middle(".lpWeight");
  const button = await middle(".lpLibraryItemEdit");
  expect(Math.abs(weight - button)).toBeLessThanOrEqual(1);
});
