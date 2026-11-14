import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Firefox on Android has no next/previous arrows on its keyboard: Enter must move to the next
// field in the item details, and every field must have a name a screen reader can read.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("Enter moves through the item details and the fields are labelled", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `de${now}`, "testtest", `de+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();
  await row.locator(".lpEdit").click();

  const form = page.locator(".itemDetailEditForm");
  await expect(form).toBeVisible({ timeout: 10000 });

  // Every control has a label.
  for (const name of [
    "Name",
    "Description",
    "Brand",
    "Type",
    "Weight",
    "Price",
    "Qty",
  ]) {
    await expect(
      form.getByLabel(name, { exact: false }).first(),
      `label ${name}`,
    ).toBeVisible();
  }

  const focusedId = () => page.evaluate(() => document.activeElement?.id || "");

  await page.locator("#itemEditName").focus();
  await page.keyboard.press("Enter");
  expect(await focusedId()).toBe("itemEditDescription");

  await page.locator("#itemEditBrand").focus();
  await page.keyboard.press("Enter");
  expect(await focusedId()).toBe("itemEditType");

  await page.locator("#itemEditWeight").focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
    "SELECT",
  );

  await page.locator("#itemEditPrice").focus();
  await page.keyboard.press("Enter");
  expect(await focusedId()).toBe("itemEditQty");

  // Enter in the field is not a submit: the dialog is still open.
  await expect(form).toBeVisible();
});
