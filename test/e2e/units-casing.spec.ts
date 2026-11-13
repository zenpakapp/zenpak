import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Unit symbols are case-sensitive: the column header is upper-cased, the unit must not be.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the weight column header keeps the unit lower-case; exit packing is sentence case", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `uc${now}`, "testtest", `uc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  const unit = page.locator(".lpHeaderUnit").first();
  await expect(unit).toBeVisible({ timeout: 15000 });
  expect(await unit.evaluate((el) => getComputedStyle(el).textTransform)).toBe(
    "none",
  );
  expect(await unit.textContent()).toMatch(/^\((g|kg|oz|lb)\)$/);

  await page
    .getByRole("button", { name: /pack this list/i })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Exit packing" }),
  ).toBeVisible();
});
