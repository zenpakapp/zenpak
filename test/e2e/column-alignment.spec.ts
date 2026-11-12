import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// In edit mode the column labels and the category totals end where the numbers typed in the
// rows end.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("column labels and totals line up with the row numbers", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ca${now}`, "testtest", `ca+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }

  const measure = () =>
    page.evaluate(() => {
      const textRight = (root: Element, sel: string) => {
        const el = root.querySelector(sel)!;
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().right;
      };
      const head = document.querySelector(".lpItemsHeader")!;
      const foot = document.querySelector(".lpItemsFooter")!;
      const row = document.querySelector(
        ".lpItem[data-item-id]:not(.lpQtyZero)",
      )!;
      const weightInput = row.querySelector(".lpWeight")!;
      const qtyInput = row.querySelector(".lpQty")!;
      const qtyPad = parseFloat(getComputedStyle(qtyInput).paddingRight);
      return {
        rowWeight: weightInput.getBoundingClientRect().right,
        rowQty: qtyInput.getBoundingClientRect().right - qtyPad,
        headWeight: textRight(head, ".lpWeightCell"),
        headQty: textRight(head, ".lpQtyCell"),
        footWeight: textRight(foot, ".lpDisplaySubtotal"),
        footQty: textRight(foot, ".lpQtySubtotal"),
      };
    });

  const wide = await measure();
  expect(
    Math.abs(wide.headWeight - wide.rowWeight),
    "head weight",
  ).toBeLessThanOrEqual(3);
  expect(
    Math.abs(wide.footWeight - wide.rowWeight),
    "foot weight",
  ).toBeLessThanOrEqual(3);
  expect(Math.abs(wide.headQty - wide.rowQty), "head qty").toBeLessThanOrEqual(
    3,
  );
  expect(Math.abs(wide.footQty - wide.rowQty), "foot qty").toBeLessThanOrEqual(
    3,
  );

  // On a phone the labels are hidden, and the quantity total sits under the quantity numbers.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const narrow = await measure();
  expect(
    Math.abs(narrow.footQty - narrow.rowQty),
    "phone foot qty",
  ).toBeLessThanOrEqual(3);
});
