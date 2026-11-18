import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// One rule for the hover of an icon-only button. Deleting something the user made is red; closing,
// clearing or dismissing is a neutral grey tile; and none of them is the accent green.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const bg = (el: Element, pseudo?: string) =>
  getComputedStyle(el, pseudo || null).backgroundColor;
const TRANSPARENT = "rgba(0, 0, 0, 0)";

test("closing is neutral, deleting is red, nothing hovers green", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ih${now}`, "testtest", `ih+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // The neutral tile and the danger red, read from the page's own tokens.
  const tokens = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    const resolve = (name: string) => {
      probe.style.background = `var(${name})`;
      return getComputedStyle(probe).backgroundColor;
    };
    const out = {
      neutral: resolve("--color-control-muted"),
      danger: resolve("--color-danger"),
    };
    probe.remove();
    return out;
  });

  // A close button on an alert: it shows a tile when hovered (it used to change only its opacity).
  const dismiss = page.locator(".lpGlobalAlertDismiss").first();
  await expect(dismiss).toBeVisible();
  await dismiss.hover();
  await page.waitForTimeout(300);
  expect(await dismiss.evaluate(bg), "alert dismiss shows a tile").not.toBe(
    TRANSPARENT,
  );
  await dismiss.click();

  // The dialog's close button: neutral, not the green tint it had.
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.keyboard.press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();
  await row.locator(".lpEdit").click();
  const close = page.locator(".lpModalClose").first();
  await expect(close).toBeVisible();
  await close.hover();
  await page.waitForTimeout(300);
  expect(await close.evaluate(bg), "dialog close is the neutral tile").toBe(
    tokens.neutral,
  );

  // Taking a tag off an item is a removal: red.
  const tags = page.locator("#itemEditTags");
  await tags.fill("camp");
  await tags.press("Enter");
  const remove = page.locator(".itemDetailTagRemove").first();
  await expect(remove).toBeVisible();
  await remove.hover();
  await page.waitForTimeout(300);
  expect(await remove.evaluate(bg), "tag remove is red").toBe(tokens.danger);
  await page.keyboard.press("Escape");

  // The delete cross of a row: red.
  await row.hover();
  const cross = row.locator(".lpRemoveItem");
  await cross.hover();
  await page.waitForTimeout(300);
  expect(
    await cross.evaluate((el) => getComputedStyle(el, "::before").backgroundColor),
    "row cross is red",
  ).toBe(tokens.danger);

  // The search clear button of the library: neutral.
  const search = page.locator("input.librarySearch").first();
  await search.fill("x");
  const clear = page.locator(".librarySearchClear");
  await expect(clear).toBeVisible();
  await clear.hover();
  await page.waitForTimeout(300);
  expect(await clear.evaluate(bg), "search clear is the neutral tile").toBe(
    tokens.neutral,
  );
});
