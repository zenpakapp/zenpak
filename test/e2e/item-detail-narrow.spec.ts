import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// On a phone the item detail dialog keeps its close button in view while the content scrolls,
// and the weight field is wide enough to read a value like 32.63.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the item detail dialog keeps its close button and a readable weight field on a phone", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `dd${now}`, "testtest", `dd+${now}@lighterpack.com`);
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

  const dialog = page.locator("#itemDetailDialog");
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await page.setViewportSize({ width: 390, height: 700 });
  const close = dialog.locator(".lpModalClose");
  await expect(close).toBeInViewport();

  // Weight sits on its own row, wide enough for a value.
  const weight = dialog.locator(".itemDetailUnitRow input");
  await expect(weight).toBeVisible();
  const box = await weight.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(100);

  // Scrolling the content leaves the close button where it was.
  const before = await close.boundingBox();
  await page.locator("#itemDetailDialog .itemDetail").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const after = await close.boundingBox();
  expect(after?.y).toBe(before?.y);
  await expect(close).toBeInViewport();
});
