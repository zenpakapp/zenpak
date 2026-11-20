import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Creating an Item from the screen gives the created Item to what comes next (the dialog, the row):
// the screen no longer finds it as "the last one in the array". Each flow ends with the right Item.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

async function openEditor(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
}

const store = <T>(page: Page, code: string): Promise<T> =>
  page.evaluate((source) => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const s = app.__vue_app__.config.globalProperties.$store;
    return new Function("store", "library", source)(s, s.state.library);
  }, code);

test("Add with details creates the Item in the Category and opens it for editing", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator(".lpAddItemWithDetails").first().click();

  await expect(page.locator(".lpModal").first()).toBeVisible();
  // The dialog is editing the new Item, which has no name yet: not another one of the library.
  await expect(page.locator("#itemEditName")).toHaveValue("");
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(5);
  expect(await store<number>(page, `return library.items.length`)).toBe(13);
  // The dialog edits the new Item, which sits in the first Category.
  const opened = await store<string>(
    page,
    `const created = library.items.reduce((a, b) => (a.id > b.id ? a : b)); return String(library.getCategoryById(2).getCategoryItemById(created.id) ? created.id : 'not in category')`,
  );
  expect(opened).not.toBe("not in category");
});

test.describe("the gear room", () => {
  test("New item creates an Item in the library and opens it", async ({
    page,
  }) => {
    await openEditor(page);
    await store(page, `store.commit('setGearRoomOpen', true)`);
    await expect(page.locator(".lpGearRoom")).toBeVisible();

    await page.getByRole("button", { name: /New item/ }).click();
    await expect(page.locator(".lpModal").first()).toBeVisible();
    await expect(page.locator("#itemEditName")).toHaveValue("");
    expect(await store<number>(page, `return library.items.length`)).toBe(13);
    // A library-only Item: it is in no Category.
    expect(
      await store<boolean>(
        page,
        `const created = library.items.reduce((a, b) => (a.id > b.id ? a : b)); return library.categories.some((c) => c.getCategoryItemById(created.id))`,
      ),
    ).toBe(false);
  });

  test("a search with no result can create an Item with that name", async ({
    page,
  }) => {
    await openEditor(page);
    await store(page, `store.commit('setGearRoomOpen', true)`);
    await page.locator(".lpGearRoomSearch").fill("Titanium spork");
    await page.locator(".lpGearRoomCreateFromSearch").click();

    await expect(page.locator(".lpModal").first()).toBeVisible();
    await expect(page.locator("#itemEditName")).toHaveValue("Titanium spork");
    expect(
      await store<string[]>(
        page,
        `return library.items.filter((i) => i.name === 'Titanium spork').map((i) => i.name)`,
      ),
    ).toEqual(["Titanium spork"]);
  });
});

test("Duplicate in an Item's dialog makes a copy and opens it for editing", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator('.lpItem[data-item-id="3"]').dblclick();
  await expect(page.locator(".itemDetailDuplicate")).toBeVisible();
  await page.locator(".itemDetailDuplicate").click();

  expect(await store<number>(page, `return library.items.length`)).toBe(13);
  await expect(page.locator("#itemEditName")).toHaveValue("Fixture item 001");
  const copy = await store<{ same: boolean; others: number }>(
    page,
    `const created = library.items.reduce((a, b) => (a.id > b.id ? a : b)); const original = library.getItemById(3); return { same: created.name === original.name && created.weight === original.weight && created.id !== original.id, others: library.items.filter((i) => i.name === original.name).length }`,
  );
  expect(copy.same).toBe(true);
  expect(copy.others).toBe(2);
});
