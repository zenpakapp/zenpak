import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The row actions are real buttons with names, reachable with Tab even when hidden at rest, and
// the number fields say which item they belong to.
test.use({ locale: "en-US" });

test("item row actions and fields are reachable and named for the keyboard", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ea${now}`, "testtest", `ea+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  const row = page.locator(".lpItem").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Number fields name the item.
  await expect(row.locator(".lpWeight")).toHaveAttribute(
    "aria-label",
    /^Weight: .+/,
  );
  await expect(row.locator(".lpQty")).toHaveAttribute(
    "aria-label",
    /^Quantity: .+/,
  );

  // The toggles are buttons with a pressed state.
  // Worn and consumable exclude each other: pick the one that is not blocked.
  const toggle = row
    .locator('.lpWorn:not([aria-disabled="true"]), .lpConsumable:not([aria-disabled="true"])')
    .first();
  const pressedBefore = await toggle.getAttribute("aria-pressed");
  expect(["true", "false"]).toContain(pressedBefore);

  // The icons are one toolbar and one Tab stop: Tab goes description, icons, price, weight,
  // quantity, delete (not one stop per icon), and the arrows move between the icons.
  const label = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el.getAttribute("aria-label") || el.className;
    });
  await row.locator(".lpDescription").focus();
  const tabs: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    tabs.push(await label());
  }
  // Icon (any), price (if shown), weight, quantity, delete: five stops, not twelve.
  expect(tabs.some((s) => s.startsWith("Weight:"))).toBe(true);
  expect(tabs).toContain("Remove from list");

  // Back into the toolbar with the arrows reaching every icon.
  await row.locator(".lpDescription").focus();
  await page.keyboard.press("Tab");
  const icons: string[] = [await label()];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowRight");
    icons.push(await label());
  }
  expect(icons).toContain("Mark as worn");
  expect(icons).toContain("Mark as consumable");
  expect(icons).toContain("More options");

  // Space on a toggle flips it.
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute(
    "aria-pressed",
    pressedBefore === "true" ? "false" : "true",
  );

  // Each action has a hit area of at least 24px, as WCAG 2.2 asks.
  const boxes = await row
    .locator(".lpActionsCell .lpActionBtn")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return Math.min(r.width, r.height);
      }),
    );
  for (const size of boxes) expect(size).toBeGreaterThanOrEqual(24);

  // The details control is visible at rest, without hover or focus.
  await page.mouse.move(2, 2);
  await page
    .locator("#header")
    .focus()
    .catch(() => {});
  const resting = page.locator(".lpItem").nth(1).locator(".lpEdit");
  // 0.75 keeps the dots above 3:1 on the card (see row-controls-contrast).
  await expect(resting).toHaveCSS("opacity", "0.75");
});
