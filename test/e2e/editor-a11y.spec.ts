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
  const optional = row.getByRole("button", { name: "Mark as optional" });
  await expect(optional).toHaveAttribute("aria-pressed", "false");

  // Tab from the description reaches the actions, one stop each, then the number fields.
  await row.locator(".lpDescription").focus();
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el.getAttribute("aria-label") || el.className;
      }),
    );
  }
  expect(seen).toContain("Mark as worn");
  expect(seen).toContain("Mark as consumable");
  expect(seen).toContain("Mark as optional");
  expect(seen).toContain("Edit details");
  expect(seen.some((s) => s.startsWith("Weight:"))).toBe(true);
  expect(seen).toContain("Remove");

  // Space on a toggle flips it.
  await optional.focus();
  await page.keyboard.press("Space");
  await expect(optional).toHaveAttribute("aria-pressed", "true");

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
  await expect(resting).toHaveCSS("opacity", "0.5");
});
