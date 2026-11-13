import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// On a phone each row keeps the controls that matter: worn, consumable, optional, tags and
// edit. Photo, link and rating wait in the edit dialog until they hold something, and the
// delete cross sits clear of the quantity field.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("phone rows keep five controls and space the delete cross", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ir${now}`, "testtest", `ir+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Desktop shows the full strip.
  await row.hover();
  await expect(row.locator(".lpCamera")).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await expect(row.locator(".lpCamera")).toBeHidden();
  await expect(row.locator(".lpStar0")).toBeHidden();
  for (const cls of [
    ".lpWorn",
    ".lpConsumable",
    ".lpOptionDot",
    ".lpTag",
    ".lpEdit",
  ]) {
    await expect(row.locator(cls)).toBeVisible();
    // A 40px target around the icon, with the icon drawn once and centred: a wider content
    // box would repeat the sprite (two tags) and push it to one side.
    const box = await row.locator(cls).boundingBox();
    expect(box?.width ?? 0, `${cls} width`).toBeGreaterThanOrEqual(38);
    expect(box?.width ?? 0, `${cls} width`).toBeLessThanOrEqual(46);
  }

  const qty = await row.locator(".lpQtyCell").boundingBox();
  const remove = await row.locator(".lpRemoveItem").boundingBox();
  const gap = (remove?.x ?? 0) - ((qty?.x ?? 0) + (qty?.width ?? 0));
  expect(gap).toBeGreaterThanOrEqual(8);
});
