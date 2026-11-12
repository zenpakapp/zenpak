import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// On a phone the first category must come early: the summary above it stays compact.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the first category shows on an iPhone mini and the category table folds", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `fp${now}`, "testtest", `fp+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpListSummary")).toBeVisible({ timeout: 15000 });

  await page.setViewportSize({ width: 375, height: 640 });
  await page.evaluate(() => window.scrollTo(0, 0));
  // An iPhone mini under Safari shows about 640px: the first category starts well inside it.
  const heading = await page.locator(".lpItemsHeader").first().boundingBox();
  expect(heading?.y ?? 9999).toBeLessThan(520);

  // The category table is folded behind a toggle, and opens on tap.
  const toggle = page.locator(".lpCategoriesToggle");
  await expect(toggle).toBeVisible();
  await expect(page.locator(".lpTotalCategory").first()).toBeHidden();
  await toggle.click();
  await expect(page.locator(".lpTotalCategory").first()).toBeVisible();

  // Touching a slice names it in a readable line, since the canvas tooltip is too small here.
  // The account toasts sit over the header and the donut: dismiss them first.
  const dismiss = page.locator(".lpGlobalAlertDismiss");
  while (await dismiss.count()) await dismiss.first().click();
  await expect(page.locator(".lpGlobalAlerts")).toHaveCount(0);
  const canvas = await page.locator(".lpChart").boundingBox();
  // Off the top joint between two slices.
  const cx = (canvas?.x ?? 0) + (canvas?.width ?? 0) * 0.65;
  const top = (canvas?.y ?? 0) + (canvas?.height ?? 0) * 0.12;
  await expect(async () => {
    await page.mouse.move(cx - 20, top);
    await page.mouse.move(cx + 3, top, { steps: 5 });
    await expect(page.locator(".lpChartReadout")).toContainText(/\d/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  const font = await page
    .locator(".lpChartReadout")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(font).toBeGreaterThanOrEqual(12);
});
