import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

test.use({
  hasTouch: true,
});

test("adds an item with details and discards the draft on cancel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(4);
  await page.locator(".lpAddItemWithDetails").click();
  await expect(page.locator("#itemDetailDialog")).toBeVisible();
  await expect(
    page
      .locator("#itemDetailDialog .itemDetailField")
      .filter({ hasText: "Name" })
      .locator("input"),
  ).toBeFocused();
  await expect(rows).toHaveCount(5);

  await page.locator("#itemDetailDialog .itemDetailEditFooter .close").click();
  await expect(page.locator("#itemDetailDialog")).toBeHidden();
  await expect(rows).toHaveCount(4);
});

test("saves an item created with the detailed editor", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator(".lpAddItemWithDetails").click();
  const dialog = page.locator("#itemDetailDialog");
  await dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Name" })
    .locator("input")
    .fill("Detailed stove");
  await dialog
    .locator(".itemDetailField")
    .filter({ hasText: "Weight" })
    .locator("input")
    .fill("320");
  await dialog.locator(".itemDetailEditFooter .lpButton").click();

  await expect(page.locator(".lpItem .lpName").last()).toHaveValue(
    "Detailed stove",
  );
  await expect(page.locator(".lpItem .lpWeight").last()).toHaveValue("320");
  await dialog.locator(".lpModalClose").click();
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(5);
});

test("opens the detailed editor with the inline name on Control+Enter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator(".lpAddItem").click();
  const input = page.locator(".lpAddItemInput");
  await expect(input).toHaveAttribute(
    "aria-keyshortcuts",
    "Meta+Enter Control+Enter",
  );
  await input.fill("Shortcut stove");
  await input.press("Control+Enter");

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .locator(".itemDetailField")
      .filter({ hasText: "Name" })
      .locator("input"),
  ).toHaveValue("Shortcut stove");
  await expect(
    dialog
      .locator(".itemDetailField")
      .filter({ hasText: "Description" })
      .locator("textarea"),
  ).toBeFocused();
  await expect(page.locator(".lpAddItemInput")).toBeHidden();
  await expect(page.locator(".lpSuggestions")).toBeHidden();
});

test("keeps quick add and existing-item cancellation unchanged", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator(".lpAddItem").click();
  await page.locator(".lpAddItemInput").fill("Quick stove");
  await page.locator(".lpAddItemInput").press("Enter");
  await expect(page.locator(".lpItem .lpName").last()).toHaveValue(
    "Quick stove",
  );
  await expect(page.locator("#itemDetailDialog")).toBeHidden();

  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(5);
  await rows.first().locator(".lpEdit").click();
  await expect(page.locator("#itemDetailDialog")).toBeVisible();
  await page.locator("#itemDetailDialog .itemDetailEditFooter .close").click();
  await expect(page.locator("#itemDetailDialog")).toBeHidden();
  await expect(rows).toHaveCount(5);
  await expect(rows.first().locator(".lpName")).toHaveValue("Fixture item 001");
});

test("keeps existing-item suggestions on the quick-add path", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator(".lpAddItem").click();
  await page.locator(".lpAddItemInput").fill("Fixture item 005");
  const suggestion = page
    .locator(".lpSuggestion")
    .filter({ hasText: "Fixture item 005" });
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(5);
  await expect(page.locator(".lpItem .lpName").last()).toHaveValue(
    "Fixture item 005",
  );
  await expect(page.locator("#itemDetailDialog")).toBeHidden();
});

test("closes the sidebar when the editor crosses into the mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await expect(page.locator("#main")).toHaveClass(/lpHasSidebar/);
  const desktopChart = await page.locator(".lpChart").boundingBox();
  expect(
    Math.abs(desktopChart.width - desktopChart.height),
  ).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 500, height: 812 });
  await expect(page.locator("#main")).not.toHaveClass(/lpHasSidebar/);
  await expect(page.locator("#hamburger")).toBeVisible();

  await page.locator("#hamburger").click();
  await expect(page.locator("#main")).toHaveClass(/lpHasSidebar/);
});

test("closes the mobile sidebar when opening the item library", async ({
  page,
}) => {
  await page.setViewportSize({ width: 500, height: 812 });
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator("#hamburger").click();
  await expect(page.locator("#main")).toHaveClass(/lpHasSidebar/);
  await page.locator(".lpGearRoomBtn").click();

  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await expect(page.locator("#main")).not.toHaveClass(/lpHasSidebar/);
});

test("keeps a closed sidebar offscreen while entering the mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  const library = createEditorLibrary(12, 4);
  library.showSidebar = false;
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);

  await expect(page.locator("#main")).not.toHaveClass(/lpHasSidebar/);
  await expect(page.locator("#sidebar")).toBeAttached();
  await page.setViewportSize({ width: 500, height: 812 });

  const sidebarFrames = await page.evaluate(async () => {
    const frames = [];
    for (let frame = 0; frame < 20; frame += 1) {
      await new Promise(requestAnimationFrame);
      const sidebar = document.querySelector("#sidebar");
      frames.push({
        opacity: parseFloat(getComputedStyle(sidebar).opacity),
        right: sidebar.getBoundingClientRect().right,
      });
    }
    return frames;
  });

  expect(
    sidebarFrames.some(({ opacity, right }) => opacity > 0.01 && right > 0),
  ).toBe(false);
});

for (const width of [320, 375, 500, 640, 768]) {
  test(`keeps the list editor usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const library = createEditorLibrary(12, 4);
    library.lists[0].name = "Responsive editor list with a long title";
    library.categories[0].name = "A long category name";
    library.items[0].name = "A long item name that remains editable";

    await mockSuccessfulEditorInitialization(page, library);
    await page.goto(testRoot);
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator("#main")).not.toHaveClass(/lpHasSidebar/);

    const layout = await page.evaluate(() => {
      const list = document.querySelector(".lpList").getBoundingClientRect();
      const category = document
        .querySelector(".lpCategory")
        .getBoundingClientRect();
      const item = document.querySelector(".lpItem").getBoundingClientRect();
      const edit = document.querySelector(".lpItem .lpEdit");
      const name = document
        .querySelector(".lpItem .lpNameCell")
        .getBoundingClientRect();
      const actions = document
        .querySelector(".lpItem .lpActionsCell")
        .getBoundingClientRect();
      const weight = document
        .querySelector(".lpItem .lpWeightCell")
        .getBoundingClientRect();
      const qty = document
        .querySelector(".lpItem .lpQtyCell")
        .getBoundingClientRect();
      const chart = document.querySelector(".lpChart").getBoundingClientRect();
      const overflowingElements = [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element: `${element.tagName.toLowerCase()}#${element.id}.${element.className}`,
            parent: `${element.parentElement?.tagName.toLowerCase()}#${element.parentElement?.id}.${element.parentElement?.className}`,
            boxSizing: getComputedStyle(element).boxSizing,
            computedLeft: getComputedStyle(element).left,
            computedRight: getComputedStyle(element).right,
            computedWidth: getComputedStyle(element).width,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            scrollWidth: element.scrollWidth,
            width: Math.round(rect.width),
          };
        })
        .filter(({ right }) => right > document.documentElement.clientWidth);
      const scrollingElements = [...document.querySelectorAll("body *")]
        .map((element) => ({
          element: `${element.tagName.toLowerCase()}#${element.id}.${element.className}`,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }))
        .filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth)
        .sort(
          (a, b) =>
            b.scrollWidth - b.clientWidth - (a.scrollWidth - a.clientWidth),
        )
        .slice(0, 12);

      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        listWidth: Math.round(list.width),
        categoryLeft: Math.round(category.left),
        categoryRight: Math.round(category.right),
        itemLeft: Math.round(item.left),
        itemRight: Math.round(item.right),
        editVisibility: getComputedStyle(edit).visibility,
        nameBottom: Math.round(name.bottom),
        actionsTop: Math.round(actions.top),
        actionsCenter: Math.round(actions.top + actions.height / 2),
        actionsRight: Math.round(actions.right),
        weightLeft: Math.round(weight.left),
        weightRight: Math.round(weight.right),
        weightCenter: Math.round(weight.top + weight.height / 2),
        qtyLeft: Math.round(qty.left),
        qtyCenter: Math.round(qty.top + qty.height / 2),
        nameCenter: Math.round(name.top + name.height / 2),
        chartWidth: Math.round(chart.width),
        chartHeight: Math.round(chart.height),
        overflowingElements,
        scrollingElements,
      };
    });

    expect(
      layout.documentWidth,
      JSON.stringify({
        overflowingElements: layout.overflowingElements,
        scrollingElements: layout.scrollingElements,
      }),
    ).toBe(layout.viewportWidth);
    expect(layout.listWidth).toBeGreaterThanOrEqual(layout.viewportWidth - 1);
    expect(layout.categoryLeft).toBeGreaterThanOrEqual(0);
    expect(layout.categoryRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.itemLeft).toBeGreaterThanOrEqual(0);
    expect(layout.itemRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.editVisibility, JSON.stringify(layout)).toBe("visible");
    expect(
      Math.abs(layout.chartWidth - layout.chartHeight),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".lpItem .lpRemove").first()).toBeVisible();
    await expect(page.locator(".lpAddItem")).toBeVisible();
    await expect(page.locator(".lpAddItemWithDetails")).toBeVisible();

    if (width === 640) {
      expect(layout.actionsRight).toBeLessThanOrEqual(layout.weightLeft);
      expect(layout.weightRight).toBeLessThanOrEqual(layout.qtyLeft);
    }

    if (width <= 500) {
      expect(layout.actionsTop).toBeGreaterThanOrEqual(layout.nameBottom);
      expect(layout.actionsRight).toBeLessThanOrEqual(layout.weightLeft);
      expect(
        Math.abs(layout.actionsCenter - layout.weightCenter),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(layout.nameCenter - layout.qtyCenter),
      ).toBeLessThanOrEqual(1);
    }

    await page.locator("#hamburger").click();
    await expect(page.locator("#main")).toHaveClass(/lpHasSidebar/);
  });
}
