import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// An optional item (quantity 0) says what that means in plain words: it is not counted.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("an optional item is labelled as not counted", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ob${now}`, "testtest", `ob+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();
  const dot = row.locator(".lpOptionDot");
  if (!(await dot.evaluate((el) => el.classList.contains("lpActive")))) {
    await dot.click();
  }
  await expect(row.locator(".lpItemOptionalBadge")).toHaveText("Not counted");
});
