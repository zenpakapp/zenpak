import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The "Add to…" menu is a real menu: the button says it opens one and whether it is open, the
// keyboard goes into it on opening and moves with the arrows, Escape closes only the menu and
// gives the focus back to the button.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("Add to… is an accessible menu driven from the keyboard", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `am${now}`, "testtest", `am+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Take one article off its list so its dialog offers "Add to…".
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

  const trigger = page.getByRole("button", { name: "Add to…" });
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  // Open it with the keyboard.
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("menu", { name: "Add to…" });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute(
    "aria-controls",
    (await menu.getAttribute("id")) || "",
  );

  // The focus is already in the menu, on its first entry (the current list).
  const items = menu.getByRole("menuitem");
  await expect(items.first()).toBeFocused();
  const firstLabel = await items.first().innerText();

  // The arrows move, and wrap.
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).not.toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(items.first()).toBeFocused();
  expect(firstLabel).toContain("Current list");

  // Escape closes the menu only: the dialog stays and the button has the focus back.
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  // The dialog closes on the keyup of Escape, about 200 ms later: wait it out.
  await page.waitForTimeout(600);
  await expect(page.locator("#itemDetailDialog")).toBeVisible();

  // Enter on the current list goes to its categories; one more Enter adds the item.
  await page.keyboard.press("Enter");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Enter");
  const back = menu.getByRole("menuitem").first();
  await expect(back).toContainText("Back");
});
