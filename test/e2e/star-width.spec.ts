import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A three-star rating must not widen the icon cell: the name and description columns stay where
// they are on every row, rated or not.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a rated row keeps the same column positions as an unrated one", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sw${now}`, "testtest", `sw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (const name of ["Camp stove", "Pot"]) {
    await page.locator(".lpAddItem").first().click();
    await page.locator(".lpAddItemInput").first().fill(name);
    await page.locator(".lpAddItemInput").first().press("Enter");
  }
  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(2, { timeout: 15000 });

  const geometry = async (i: number) =>
    rows.nth(i).evaluate((li) => {
      const x = (sel: string) =>
        Math.round(li.querySelector(sel)!.getBoundingClientRect().x);
      const w = (sel: string) =>
        Math.round(li.querySelector(sel)!.getBoundingClientRect().width);
      return {
        description: x(".lpDescription"),
        actionsX: x(".lpActionsCell"),
        actionsW: w(".lpActionsCell"),
        weight: x(".lpWeightCell"),
      };
    });

  const before = await geometry(0);
  const unrated = await geometry(1);
  expect(before).toEqual(unrated);

  // Three stars on the first row only.
  await rows.nth(0).hover();
  for (let i = 0; i < 3; i += 1) {
    await rows.nth(0).locator(".lpStar").click();
  }
  await expect(rows.nth(0).locator(".lpStar")).toHaveClass(/lpStar3/);
  await page.mouse.move(5, 5);

  expect(await geometry(0)).toEqual(unrated);
  expect(await geometry(1)).toEqual(unrated);
});
