import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// "Pack this list" sits under the totals table, and starts packing mode.
test.use({ locale: "en-US" });

test("pack button is under the totals and starts packing mode", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pb${now}`, "testtest", `pb+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  const pack = page.locator(".lpTotalsContainer .lpPackBtn");
  await expect(pack).toBeVisible({ timeout: 15000 });

  const table = await page.locator(".lpTotals").boundingBox();
  const button = await pack.boundingBox();
  expect(button!.y).toBeGreaterThanOrEqual(table!.y + table!.height);

  await pack.click();
  await expect(page.locator(".lpPackingBar")).toBeVisible();
  await expect(page.locator(".lpTotalsContainer .lpPackBtn")).toHaveCount(0);
  await expect(page.locator(".lpPackBtnExit")).toBeVisible();
});
