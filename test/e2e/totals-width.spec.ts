import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The totals are a table whose number column takes the width of its widest cell, the base weight
// in large type. When the base weight gains or loses a digit, the unit and every other row must not
// slide sideways.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("the totals do not slide when the base weight changes width", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `tw${now}`, "testtest", `tw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.tap();
  }

  const rows = page.locator(".lpItem[data-item-id]");
  const addItem = async (name: string, weight: string, index: number) => {
    await page.locator(".lpAddItem").first().tap();
    await page.locator(".lpAddItemInput").first().fill(name);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const target = rows.nth(index);
    await target.locator(".lpWeight").fill(weight);
    await target.locator(".lpWeight").blur();
    return target;
  };

  // 24 oz and 8 oz: 2 lb in all.
  const first = await addItem("Tent", "24", 0);
  const second = await addItem("Stove", "8", 1);
  await expect(page.locator(".lpTotalUnit").first()).toBeVisible();

  // The "lb" of the total row, and the base weight shown.
  const unitX = () =>
    page.evaluate(() => {
      const el = document.querySelector(".lpTotals .lpTotalUnit")!;
      return Math.round(el.getBoundingClientRect().left);
    });
  const baseText = () =>
    page.locator(".lpBaseWeight .lpDisplaySubtotal").first().innerText();

  // Stove worn: base weight is the tent alone, "1.5". Tent worn too: base weight "0".
  await second.locator(".lpWorn").tap();
  await expect(page.locator(".lpBaseWeight")).toBeVisible();
  await page.waitForTimeout(600);
  const wide = await unitX();
  const wideText = (await baseText()).trim();

  await first.locator(".lpWorn").tap();
  await page.waitForTimeout(600);
  const narrow = await unitX();
  const narrowText = (await baseText()).trim();

  expect(narrowText.length, "the base weight really lost digits").toBeLessThan(
    wideText.length,
  );
  expect(narrow, "the unit stays where it was").toBe(wide);
});
