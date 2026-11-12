import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Small feedback gaps: a blocked worn/consumable click says why, a bad number says so, and the
// category name is plain text in packing mode.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("blocked toggles and bad numbers explain themselves", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sf${now}`, "testtest", `sf+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();

  // The first item is consumable, so "worn" is blocked and says why.
  await expect(row.locator(".lpConsumable")).toHaveClass(/lpActive/);
  // aria-disabled marks it as blocked, but a tap still has to answer.
  await row.locator(".lpWorn").click({ force: true });
  await expect(page.locator(".lpGlobalAlerts")).toContainText(
    "can't be marked as worn",
  );

  // A bad weight shows a short message and flags the field.
  const weight = row.locator("input.lpWeight");
  await weight.fill("abc");
  await expect(weight).toHaveAttribute("aria-invalid", "true");
  await expect(row.locator(".lpFieldError")).toHaveText("Enter a number");
  await weight.fill("12");
  await expect(row.locator(".lpFieldError")).toHaveCount(0);

  // In packing mode the category name is plain text, not a field.
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpTotalsContainer .lpPackBtn").click();
  await expect(page.locator(".lpPackingBar")).toBeVisible();
  await expect(page.locator(".lpItemsHeader input")).toHaveCount(0);
  await expect(
    page.locator(".lpItemsHeader .lpPackCategoryName").first(),
  ).toBeVisible();

  // On a phone the name sits in the middle of its header, and the category totals end where
  // the rows end.
  await page.setViewportSize({ width: 375, height: 812 });
  const head = await page.locator(".lpItemsHeader").first().boundingBox();
  const name = await page
    .locator(".lpItemsHeader .lpPackCategoryName")
    .first()
    .boundingBox();
  expect(
    Math.abs(
      (name?.y ?? 0) +
        (name?.height ?? 0) / 2 -
        ((head?.y ?? 0) + (head?.height ?? 0) / 2),
    ),
  ).toBeLessThanOrEqual(3);
  // Compare the text itself, not the boxes around it.
  const textRight = (selector: string) =>
    page.locator(selector).first().evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    });
  const footRight = await textRight(".lpItemsFooter .lpQtyCell");
  const rowRight = await textRight(
    ".lpItem[data-item-id]:not(.lpQtyZero) .lpQtyCell",
  );
  expect(Math.abs(footRight - rowRight)).toBeLessThanOrEqual(2);
});
