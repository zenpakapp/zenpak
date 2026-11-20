import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The screen follows every change made to the library, with no reload and no help from the callers:
// each case commits a store mutation and reads what the editor shows. (The rows, the totals, the gear
// room and the donut used to be told to redraw by hand-bumped version counters.)
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

// Two categories. Items weigh id-2 g: First = items 3..6 (1+2+3+4 g), Second = items 7 and 8 (5+6 g).
async function openEditor(page: Page) {
  const library = createEditorLibrary(12, 4);
  const second = JSON.parse(JSON.stringify(library.categories[0]));
  second.id = 100;
  second.name = "Second gear";
  second.categoryItems = [7, 8].map((itemId) => ({
    qty: 1,
    worn: 0,
    consumable: false,
    star: 0,
    itemId,
  }));
  library.categories.push(second);
  library.lists[0].categoryIds = [2, 100];
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(6);
}

// Runs `code` with `store` and `library` in scope, in the page.
const run = (page: Page, code: string) =>
  page.evaluate((source) => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const store = app.__vue_app__.config.globalProperties.$store;
    return new Function("store", "library", source)(store, store.state.library);
  }, code);

const row = (page: Page, id: number) =>
  page.locator(`.lpItem[data-item-id="${id}"]`);

// Each slice's share of the base weight, as the tooltips show it (data-shares on the canvas).
const shares = async (page: Page) => {
  const raw =
    (await page.locator("canvas.lpChart").getAttribute("data-shares")) || "";
  return raw ? raw.split(",").map(Number) : [];
};

test("an item changed in the library updates its row", async ({ page }) => {
  await openEditor(page);
  await expect(row(page, 3).locator("input.lpName")).toHaveValue(
    "Fixture item 001",
  );
  await expect(row(page, 3).locator("input.lpWeight")).toHaveValue("1");

  await run(
    page,
    `store.commit('updateItem', { ...library.getItemById(3), name: 'Renamed tent', weight: 9000 })`,
  );
  await expect(row(page, 3).locator("input.lpName")).toHaveValue(
    "Renamed tent",
  );
  await expect(row(page, 3).locator("input.lpWeight")).toHaveValue("9");

  await run(
    page,
    `store.commit('updateItemMetadata', { ...library.getItemById(3), brand: 'Acme', tags: ['winter'] })`,
  );
  await expect(row(page, 3).locator(".lpItemBrand")).toHaveText("Acme");
  await expect(row(page, 3).locator(".lpItemTag")).toHaveText("winter");

  await run(
    page,
    `store.commit('updateItemsMetadata', [4, 5].map((id) => ({ ...library.getItemById(id), brand: 'Batch ' + id })))`,
  );
  await expect(row(page, 4).locator(".lpItemBrand")).toHaveText("Batch 4");
  await expect(row(page, 5).locator(".lpItemBrand")).toHaveText("Batch 5");
});

test("a Placement changed in a Category updates its row", async ({ page }) => {
  await openEditor(page);
  await run(
    page,
    `store.commit('updateCategoryItem', { category: library.getCategoryById(2), categoryItem: { itemId: 3, qty: 3, worn: 1, star: 2 } })`,
  );
  await expect(row(page, 3).locator("input.lpQty")).toHaveValue("3");
  await expect(row(page, 3).locator(".lpWorn")).toHaveClass(/lpActive/);
  await expect(row(page, 3).locator(".lpStar")).toHaveClass(/lpStar2/);

  await run(
    page,
    `store.commit('toggleOptionalItem', { category: library.getCategoryById(2), itemId: 4 })`,
  );
  await expect(row(page, 4).locator(".lpItemOptionalBadge")).toBeVisible();
});

test("an item added to, removed from or restored in a Category shows or leaves its row", async ({
  page,
}) => {
  await openEditor(page);
  const first = page.locator('.lpCategory[data-category-id="2"]');
  await run(
    page,
    `store.commit('addItemToCategory', { itemId: 9, categoryId: 2, dropIndex: 0 })`,
  );
  await expect(first.locator(".lpItem[data-item-id]")).toHaveCount(5);
  await expect(
    first.locator(".lpItem[data-item-id]").first().locator("input.lpName"),
  ).toHaveValue("Fixture item 007");

  await run(
    page,
    `const category = library.getCategoryById(2); const categoryItem = { ...category.getCategoryItemById(5) }; window.__removed = { category, categoryItem, index: category.categoryItems.findIndex((c) => c.itemId === 5) }; store.commit('removeItemFromCategory', { category, itemId: 5 })`,
  );
  await expect(row(page, 5)).toHaveCount(0);

  await run(page, `store.commit('restoreItemInCategory', window.__removed)`);
  await expect(row(page, 5)).toHaveCount(1);
});

test("a new Category with an item shows up", async ({ page }) => {
  await openEditor(page);
  await run(
    page,
    `store.commit('createCategoryAndAddItem', { itemId: 10, name: 'Brand new' })`,
  );
  await expect(page.locator(".lpCategory")).toHaveCount(3);
  await expect(
    page.locator(".lpCategory").nth(2).locator("input.lpCategoryName"),
  ).toHaveValue("Brand new");
  await expect(
    page.locator(".lpCategory").nth(2).locator(".lpItem[data-item-id]"),
  ).toHaveCount(1);
});

test("merging and deleting items takes their rows away", async ({ page }) => {
  await openEditor(page);
  await run(page, `store.commit('mergeItems', { keepId: 3, removeId: 4 })`);
  await expect(row(page, 4)).toHaveCount(0);
  await expect(row(page, 3).locator("input.lpQty")).toHaveValue("2");

  await run(page, `store.commit('removeItem', library.getItemById(6))`);
  await expect(row(page, 6)).toHaveCount(0);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
});

test("moving an item to another Category moves its row and the donut shares", async ({
  page,
}) => {
  await openEditor(page);
  // First weighs 1+2+3+4 = 10 g, Second 5+6 = 11 g: 48% and 52% of the base weight.
  await expect.poll(() => shares(page)).toEqual([48, 52]);

  await run(
    page,
    `store.commit('reorderItem', { itemId: 3, categoryId: 100, dropIndex: 0, list: library.getListById(library.defaultListId) })`,
  );
  const second = page.locator('.lpCategory[data-category-id="100"]');
  await expect(row(page, 3)).toHaveCount(1);
  await expect(second.locator('.lpItem[data-item-id="3"]')).toHaveCount(1);

  // The total weight is still 21 g: only the shares changed (9 g and 12 g: 43% and 57%).
  await expect.poll(() => shares(page)).toEqual([43, 57]);
});

test.describe("the gear room", () => {
  test("follows the items of the library", async ({ page }) => {
    await openEditor(page);
    await run(page, `store.commit('setGearRoomOpen', true)`);
    const rows = page.locator(".lpGearRoomTable tbody tr");
    await expect(rows).toHaveCount(12);

    await run(
      page,
      `store.commit('updateItem', { ...library.getItemById(3), name: 'Renamed in the library' })`,
    );
    await expect(
      page.locator(".lpGearRoomTable tbody", {
        hasText: "Renamed in the library",
      }),
    ).toBeVisible();

    await run(page, `store.commit('removeItem', library.getItemById(8))`);
    await expect(rows).toHaveCount(11);
  });
});
