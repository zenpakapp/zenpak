import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Controls that were mouse-only: the quantity arrows have a name, the library remove link and
// list switch are buttons for the keyboard, the library "..." button shows when it has focus,
// and the "Add to..." menu rows can be reached and chosen without a mouse.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("library controls, quantity arrows and the add-to menu work from the keyboard", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `kb${now}`, "testtest", `kb+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Quantity arrows: a name, even though they stay out of the tab order.
  await expect(row.locator(".lpUp")).toHaveAttribute(
    "aria-label",
    "Increase quantity",
  );
  await expect(row.locator(".lpDown")).toHaveAttribute(
    "aria-label",
    "Decrease quantity",
  );

  // Library: the remove link and the list switch are buttons you can tab to.
  const remove = page.locator(".lpRemoveLibraryItem").first();
  await expect(remove).toHaveAttribute("role", "button");
  await expect(remove).toHaveAttribute("tabindex", "0");
  const listSwitch = page.locator(".lpLibraryListSwitch").first();
  await expect(listSwitch).toHaveAttribute("role", "button");
  await expect(listSwitch).toHaveAttribute("tabindex", "0");
  // The open list is announced, not only coloured: exactly one switch carries aria-current.
  await expect(page.locator(".lpLibraryListSwitch[aria-current]")).toHaveCount(1);
  await expect(
    page.locator(".lpLibraryList.lpActive .lpLibraryListSwitch"),
  ).toHaveAttribute("aria-current", "true");

  // The "..." button is invisible until hover, but not when it has the keyboard focus.
  const more = page.locator(".lpLibraryItemEdit").first();
  await page.keyboard.press("Tab"); // make sure the page has keyboard modality
  await more.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(more).toBeFocused();
  await expect
    .poll(() => more.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");

  // Take one article off the list so its dialog offers "Add to...".
  await row.hover();
  await row.locator(".lpRemove").click();
  await page.getByRole("button", { name: /item library/i }).click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await page.locator(".lpGearRoomChip", { hasText: "No list" }).first().click();
  await page
    .locator(".lpGearRoom tbody tr")
    .first()
    .locator("td")
    .nth(1)
    .click();
  const addTo = page.getByRole("button", { name: "Add to…" });
  await addTo.focus();
  await page.keyboard.press("Enter");

  const first = page
    .locator(".itemDetailAddDropdown .itemDetailAddOption")
    .first();
  await expect(first).toHaveAttribute("role", "button");
  await expect(first).toHaveAttribute("tabindex", "0");
  await first.focus();
  await page.keyboard.press("Enter");
  // Enter chose the list: the category step with its back row is shown.
  await expect(
    page.locator(".itemDetailAddDropdown .itemDetailAddBack"),
  ).toBeVisible();
  await page.locator(".itemDetailAddDropdown .itemDetailAddBack").focus();
  await page.keyboard.press("Enter");
  await expect(first).toBeVisible();
});
