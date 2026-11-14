import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// "Add to…" in the item dialog puts the open list first, so adding to it takes two taps instead
// of three.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the add-to menu starts with the current list and adds to its category", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ac${now}`, "testtest", `ac+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  // The name the menu must show for the current list.
  const listName = await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const { library } = app.__vue_app__.config.globalProperties.$store.state;
    return library.getListById(library.defaultListId).name;
  });

  // Take one article off the list: it stays in the library, now in no list, so its dialog
  // offers "Add to…" instead of "Remove from list".
  const row = page.locator(".lpItem[data-item-id]").first();
  await row.hover();
  await row.locator(".lpRemove").click();
  await expect(page.locator(".lpSpeedbump")).toHaveCount(0);

  await page.getByRole("button", { name: /item library/i }).click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await page.locator(".lpGearRoomChip", { hasText: "No list" }).first().click();
  await page.locator(".lpGearRoom tbody tr").first().locator("td").nth(1).click();
  await page.getByRole("button", { name: "Add to…" }).click();

  const options = page.locator(".itemDetailAddDropdown .itemDetailAddOption");
  await expect(options.first()).toContainText("Current list");
  await expect(options.first()).toContainText(listName || "Unnamed list");
  // The current list is not repeated further down.
  await expect(
    page.locator(".itemDetailAddDropdown .itemDetailAddOption", {
      hasText: "Current list",
    }),
  ).toHaveCount(1);

  // The arrow is its own element at the right edge of the row, not text after the name.
  const first = options.first();
  const row0 = await first.boundingBox();
  const arrow = await first.locator(".itemDetailAddNext").boundingBox();
  expect(arrow!.x + arrow!.width).toBeGreaterThan(row0!.x + row0!.width - 20);

  // One tap on it goes straight to its categories.
  await options.first().click();
  await expect(
    page.locator(".itemDetailAddDropdown .itemDetailAddBack"),
  ).toBeVisible();
  await expect(
    page.locator(".itemDetailAddDropdown .itemDetailAddOption").first(),
  ).toBeVisible();
});
