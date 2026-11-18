import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The icons' hit areas reach 6px past their glyphs. The description field stops 8px before the
// icon cell on a desktop row, so its focus ring never touches the first icon; on a phone the name
// has the whole line and keeps it.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the description field keeps a gap before the row icons", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ag${now}`, "testtest", `ag+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.keyboard.press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();

  const edges = () =>
    row.evaluate((li) => {
      const right = (sel: string) =>
        li.querySelector(sel)!.getBoundingClientRect().right;
      const left = (sel: string) =>
        li.querySelector(sel)!.getBoundingClientRect().left;
      return {
        descRight: right(".lpDescription"),
        nameCellRight: right(".lpNameCell"),
        cameraBtnLeft: left(".lpCamera"),
        actionsLeft: left(".lpActionsCell"),
      };
    });

  // Desktop: the field ends 8px before the cell, and the camera's hit area (which starts 6px
  // before the cell) does not overlap the field.
  const d = await edges();
  expect(
    d.actionsLeft - d.descRight,
    "gap to the icon cell",
  ).toBeGreaterThanOrEqual(8);
  expect(
    d.cameraBtnLeft - d.descRight,
    "the camera hit area clears the field",
  ).toBeGreaterThanOrEqual(2);

  // Phone: the name keeps the whole line (no right padding).
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const padding = await row
    .locator(".lpNameCell")
    .evaluate((el) => getComputedStyle(el).paddingRight);
  expect(padding).toBe("0px");
});
