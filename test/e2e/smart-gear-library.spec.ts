import { test, expect } from "@playwright/test";
import path from "path";
import { registerUser, importCsvFile } from "./auth-utils";

const isSuccessfulSave = (response: any) =>
  response.url().includes("/saveLibrary") && response.ok();

test.describe("Smart Gear Library", () => {
  test("CSV import with brand column deduplicates matching items", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `dedup${now}`,
      "testtest",
      `dedup+${now}@lighterpack.com`,
    );

    const csvPath = path.join(
      process.cwd(),
      "test/fixtures/csv/brand-dedup.csv",
    );

    // First import to populate library
    await importCsvFile(page, csvPath);
    await expect(page.locator("#importValidate")).toBeVisible();
    const firstSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#importConfirm").click();
    await firstSave;

    // Second import of same file — should detect duplicates
    await importCsvFile(page, csvPath);
    await expect(page.locator("#importValidate")).toBeVisible();
    await expect(page.locator("#importValidate")).toContainText(
      "will merge with existing gear",
    );
  });

  test("library sidebar has category filter select", async ({ page }) => {
    const now = Date.now();
    await registerUser(
      page,
      `filter${now}`,
      "testtest",
      `filter+${now}@lighterpack.com`,
    );

    // Category filter select should be visible in sidebar
    await expect(page.locator(".lpLibraryFilterSelect")).toBeVisible();
  });

  test("library sidebar category filter select can be changed", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `catfil${now}`,
      "testtest",
      `catfil+${now}@lighterpack.com`,
    );

    const csvPath = path.join(
      process.cwd(),
      "test/fixtures/csv/brand-dedup.csv",
    );
    await importCsvFile(page, csvPath);
    await expect(page.locator("#importValidate")).toBeVisible();
    const importSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#importConfirm").click();
    await importSave;

    await expect(page.locator(".lpLibraryFilterSelect")).toBeVisible();
    await page.locator(".lpLibraryFilterSelect").selectOption("Sleep");
    await expect(page.locator(".lpLibraryFilterSelect")).toHaveValue("Sleep");
    await expect(page.locator(".library .lpLibraryItem")).toHaveCount(1);
    await expect(page.locator(".library .lpLibraryItem .lpName")).toContainText(
      ["Sleeping Bag"],
    );
  });

  test("typing a new item name and tabbing creates the item then focuses description", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `inline${now}`,
      "testtest",
      `inline+${now}@lighterpack.com`,
    );

    await page.getByText("Add new item").click();
    const newItemInput = page.locator(".lpAddItemInput");
    await newItemInput.fill("Trail spoon");
    await newItemInput.press("Tab");

    const createdItem = page.locator(".lpItem[data-item-id] .lpName").last();
    await expect(createdItem).toHaveValue("Trail spoon");

    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.activeElement?.classList.contains("lpDescription"),
        ),
      )
      .toBe(true);
  });

  test("gear room can create a new library item", async ({ page }) => {
    const now = Date.now();
    await registerUser(
      page,
      `gearroom${now}`,
      "testtest",
      `gearroom+${now}@lighterpack.com`,
    );

    await page.getByRole("button", { name: /item library/i }).click();
    await expect(page.locator(".lpGearRoom")).toBeVisible();

    await page.getByRole("button", { name: /\+ new item/i }).click();
    await expect(page.locator("#itemDetailDialog")).toBeVisible();
    await page
      .locator("#itemDetailDialog")
      .getByPlaceholder("Item name")
      .fill("Trail mug");
    await page
      .locator("#itemDetailDialog")
      .getByRole("button", { name: "Save" })
      .click();

    await expect(page.locator("#itemDetailDialog")).toBeHidden();
    await expect(
      page.locator(".lpGearRoom tbody tr", { hasText: "Trail mug" }).first(),
    ).toBeVisible();
  });

  test("gear room offers to create an item from a search that finds nothing", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `gearsearch${now}`,
      "testtest",
      `gearsearch+${now}@lighterpack.com`,
    );

    await page.getByRole("button", { name: /item library/i }).click();
    await expect(page.locator(".lpGearRoom")).toBeVisible();

    // Nothing to offer before searching, and "+ New item" still opens an empty item.
    await expect(page.locator(".lpGearRoomNoResults")).toHaveCount(0);

    await page.locator(".lpGearRoomSearch").fill("  Zzquux   spork ");
    const createButton = page.locator(".lpGearRoomCreateFromSearch");
    await expect(createButton).toBeVisible();
    await expect(createButton).toHaveText("Create “Zzquux spork”");
    await expect(page.locator(".lpGearRoomNoResults")).toContainText(
      "No gear matches “Zzquux spork”.",
    );

    await createButton.click();
    await expect(page.locator("#itemDetailDialog")).toBeVisible();
    const nameInput = page
      .locator("#itemDetailDialog")
      .getByPlaceholder("Item name");
    await expect(nameInput).toHaveValue("Zzquux spork");
    await page
      .locator("#itemDetailDialog")
      .getByRole("button", { name: "Save" })
      .click();
    await expect(page.locator("#itemDetailDialog")).toBeHidden();

    // The new item now matches the search, so the offer goes away.
    await expect(page.locator(".lpGearRoomNoResults")).toHaveCount(0);
    await expect(
      page.locator(".lpGearRoom tbody tr", { hasText: "Zzquux spork" }).first(),
    ).toBeVisible();
  });

  test("gear room does not offer to create an item while a search has results", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `gearsearchhit${now}`,
      "testtest",
      `gearsearchhit+${now}@lighterpack.com`,
    );

    await page.getByRole("button", { name: /item library/i }).click();
    await expect(page.locator(".lpGearRoom")).toBeVisible();

    await page.getByRole("button", { name: /\+ new item/i }).click();
    const nameInput = page
      .locator("#itemDetailDialog")
      .getByPlaceholder("Item name");
    await nameInput.fill("Alpine stove");
    await page
      .locator("#itemDetailDialog")
      .getByRole("button", { name: "Save" })
      .click();
    await expect(page.locator("#itemDetailDialog")).toBeHidden();

    await page.locator(".lpGearRoomSearch").fill("stove");
    await expect(
      page.locator(".lpGearRoom tbody tr", { hasText: "Alpine stove" }).first(),
    ).toBeVisible();
    await expect(page.locator(".lpGearRoomNoResults")).toHaveCount(0);

    // The header button still opens an item with an empty name, whatever is typed in the search.
    await page.getByRole("button", { name: /\+ new item/i }).click();
    await expect(
      page.locator("#itemDetailDialog").getByPlaceholder("Item name"),
    ).toHaveValue("");
  });

  test("gear room batch dropdowns support keyboard option selection", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `batchkeys${now}`,
      "testtest",
      `batchkeys+${now}@lighterpack.com`,
    );

    const csvPath = path.join(
      process.cwd(),
      "test/fixtures/csv/brand-dedup.csv",
    );
    await importCsvFile(page, csvPath);
    await expect(page.locator("#importValidate")).toBeVisible();
    const importSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#importConfirm").click();
    await importSave;

    await page.getByRole("button", { name: /item library/i }).click();
    await expect(page.locator(".lpGearRoom")).toBeVisible();
    await page
      .locator(".lpGearRoom tbody input[type='checkbox']")
      .nth(0)
      .check();
    await page
      .locator(".lpGearRoom tbody input[type='checkbox']")
      .nth(1)
      .check();

    await page.getByRole("button", { name: /set brand/i }).click();
    const brandInput = page.locator(".lpGearRoomBatchPanelInput").first();
    await brandInput.fill("sea");
    await brandInput.press("ArrowDown");
    await expect(page.locator(".lpBrandSuggestions li.active")).toContainText(
      "Sea to Summit",
    );
    await brandInput.press("Enter");
    await expect(brandInput).toHaveValue("Sea to Summit");

    await page.getByRole("button", { name: /add to list/i }).click();
    const listInput = page.locator(".lpGearRoomBatchPanelInput").first();
    await listInput.press("ArrowDown");
    await expect(page.locator(".lpBrandSuggestions li.active")).toBeVisible();
    await listInput.press("Enter");

    const categoryInput = page.locator(".lpGearRoomBatchPanelInput").nth(1);
    await expect(categoryInput).toBeVisible();
    await categoryInput.press("ArrowDown");
    await expect(page.locator(".lpBrandSuggestions li.active")).toBeVisible();
    await categoryInput.press("Enter");
    await expect(categoryInput).not.toHaveValue("");
  });

  test("gear search has a clear button that resets the input and keeps focus", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `clear${now}`,
      "testtest",
      `clear+${now}@lighterpack.com`,
    );

    const search = page.locator(".librarySearch").first();
    await search.fill("ser");
    await page.getByRole("button", { name: /clear gear search/i }).click();

    await expect(search).toHaveValue("");
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.activeElement?.classList.contains("librarySearch"),
        ),
      )
      .toBe(true);
  });

  test("item detail can add gear to a brand new category in the current list", async ({
    page,
  }) => {
    const now = Date.now();
    await registerUser(
      page,
      `newcat${now}`,
      "testtest",
      `newcat+${now}@lighterpack.com`,
    );

    // Create the item in the Item Library, then reopen it to add it to a list.
    await page.getByRole("button", { name: /item library/i }).click();
    await page.getByRole("button", { name: /\+ new item/i }).click();
    await expect(page.locator("#itemDetailDialog")).toBeVisible();
    await page
      .locator("#itemDetailDialog")
      .getByPlaceholder("Item name")
      .fill("Camp cup");
    await page
      .locator("#itemDetailDialog")
      .getByRole("button", { name: "Save" })
      .click();
    await expect(page.locator("#itemDetailDialog")).toBeHidden();

    await page
      .locator(".lpGearRoom tbody tr", { hasText: "Camp cup" })
      .first()
      .click();
    await expect(page.locator("#itemDetailDialog")).toBeVisible();
    await page.getByRole("button", { name: /add to/i }).click();
    await page.locator(".itemDetailAddOption", { hasText: "New list" }).click();
    await page.getByPlaceholder("New category").fill("Kitchen");
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page.locator("#itemDetailDialog")).toBeHidden();
    await page.getByRole("button", { name: /back to lists/i }).click();
    await expect(page.locator(".lpCategoryName").last()).toHaveValue("Kitchen");
    await expect(page.locator(".lpItem .lpName").last()).toHaveValue(
      "Camp cup",
    );
  });
});
