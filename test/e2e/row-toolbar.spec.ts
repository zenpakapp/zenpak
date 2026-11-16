import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The row icons are one toolbar and one Tab stop, so weight is a few presses away, not nine.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("row icons are one Tab stop with arrow keys, in both directions", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `rb${now}`, "testtest", `rb+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const active = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return {
        label: el.getAttribute("aria-label") || "",
        cls: el.className,
      };
    });

  // From the name to the weight field: a handful of Tab presses (it was nine).
  await row.locator(".lpName").focus();
  let presses = 0;
  for (; presses < 10; presses += 1) {
    await page.keyboard.press("Tab");
    if ((await active()).label.startsWith("Weight:")) break;
  }
  expect(presses + 1, "Tab presses from name to weight").toBeLessThanOrEqual(5);

  // The toolbar has a name and its icons are reached by the arrows.
  await expect(row.locator(".lpActionsCell")).toHaveAttribute(
    "role",
    "toolbar",
  );
  await row.locator(".lpDescription").focus();
  await page.keyboard.press("Tab");
  const first = await active();
  expect(first.cls).toContain("lpActionBtn");
  await page.keyboard.press("ArrowRight");
  const second = await active();
  expect(second.label).not.toBe(first.label);
  await page.keyboard.press("End");
  expect((await active()).label).toBe("More options");
  await page.keyboard.press("Home");
  expect((await active()).label).toBe(first.label);

  // Shift+Tab leaves the toolbar backwards (no trap), and Tab comes back to the icon last used.
  await page.keyboard.press("End");
  await page.keyboard.press("Shift+Tab");
  expect((await active()).cls).toContain("lpDescription");
  await page.keyboard.press("Tab");
  expect((await active()).label).toBe("More options");
});

test("on a phone the toolbar still takes the focus on a shown icon", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `rp${now}`, "testtest", `rp+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  await row.locator(".lpDescription").focus();
  await page.keyboard.press("Tab");
  // Photo and link are not shown on a phone: the focus lands on a visible icon.
  const landed = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return {
      label: el.getAttribute("aria-label"),
      shown: getComputedStyle(el).display !== "none",
    };
  });
  expect(landed.shown).toBe(true);
  expect(landed.label).toBe("Mark as worn");
});
