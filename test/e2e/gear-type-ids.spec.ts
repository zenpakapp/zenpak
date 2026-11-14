import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// An item's type is stored as a stable id and shown as its label: the gear room chips, its table
// badges and the library filter read "Shelter", never "shelter".
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the type is stored as an id and shown as its label", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gt${now}`, "testtest", `gt+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  // The CSV says "Shelter": the item stores the id.
  const stored = await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const library =
      app.__vue_app__.config.globalProperties.$store.state.library;
    return library.items.map((item: any) => item.category).filter(Boolean);
  });
  expect(stored).toContain("shelter");
  expect(stored.every((id: string) => id === id.toLowerCase())).toBe(true);

  // The gear room shows labels.
  await page.getByRole("button", { name: /item library/i }).click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await expect(
    page.locator(".lpGearRoomChip", { hasText: "Shelter" }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".lpGearRoomCategoryBadge", { hasText: "Shelter" }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".lpGearRoomCategoryBadge", { hasText: /^shelter$/ }),
  ).toHaveCount(0);
});
