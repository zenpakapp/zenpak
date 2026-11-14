import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Controls that show only an icon or a symbol need a name a screen reader can read, and the
// close crosses must not be faded below readable contrast.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("icon-only controls have accessible names and the close crosses are not faded", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `an${now}`, "testtest", `an+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // Verify banner cross: named, and at full strength.
  const bannerClose = page.locator(".lpVerifyBannerDismiss").first();
  await expect(bannerClose).toBeVisible({ timeout: 35000 });
  await expect(bannerClose).toHaveAttribute("aria-label", "Dismiss alert");
  expect(
    await bannerClose.evaluate((el) => Number(getComputedStyle(el).opacity)),
  ).toBe(1);

  // The welcome toast cross is dark on yellow or neutral: never below 0.85.
  const toastClose = page.locator(".lpGlobalAlertDismiss").first();
  if (await toastClose.isVisible()) {
    expect(
      await toastClose.evaluate((el) => Number(getComputedStyle(el).opacity)),
    ).toBeGreaterThanOrEqual(0.85);
  }

  await expect(page.getByRole("textbox", { name: "List name" })).toBeVisible();

  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  await expect(
    page.getByRole("button", { name: "Choose a colour" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /search/i }).first(),
  ).toBeAttached();
});
