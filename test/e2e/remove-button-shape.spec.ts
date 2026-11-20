import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The delete cross draws a 28px rounded square on hover, the same shape in a tall sidebar row and
// in an item row (it was an oval in a tall row), and on a touch screen it draws nothing on hover
// (a tap leaves the hover on, and the tile was cut by the screen edge).
const tile = (el: Element) => {
  const c = getComputedStyle(el, "::before");
  return {
    w: c.width,
    h: c.height,
    radius: c.borderTopLeftRadius,
    bg: c.backgroundColor,
  };
};

test.describe("desktop", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("the delete cross is a rounded square, in an item row and in a tall list row", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `rb${now}`,
      "testtest",
      `rb+${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    await page.locator(".lpAddItem").first().click();
    await page.locator(".lpAddItemInput").first().fill("Camp stove");
    await page.keyboard.press("Enter");
    const row = page.locator(".lpItem[data-item-id]").first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // A second list with a long name, so its sidebar row is two lines tall.
    await page.evaluate(() => {
      const app = (document.querySelector("#app") ||
        document.body.firstElementChild) as any;
      app.__vue_app__.config.globalProperties.$store.commit(
        "newListNamed",
        {
          name: "A long list name that wraps over two lines in the narrow sidebar column",
        },
      );
    });
    const other = page.locator("#lists .lpLibraryList").last();
    await expect(other).toBeVisible();
    // The new list is the open one: go back to the first, so the long one can show its cross.
    await page.locator("#lists .lpLibraryList").first().click();

    for (const [label, hoverTarget, cross] of [
      ["item row", row, row.locator(".lpRemoveItem")],
      ["tall list row", other, other.locator(".lpRemove")],
    ] as const) {
      await hoverTarget.hover();
      await cross.hover();
      await page.waitForTimeout(300);
      const t = await cross.evaluate(tile);
      expect(t.w, `${label} width`).toBe("28px");
      expect(t.h, `${label} height`).toBe("28px");
      expect(t.radius, `${label} corner`).toBe("8px");
      expect(t.bg, `${label} is red on hover`).not.toBe("rgba(0, 0, 0, 0)");
    }
  });
});

test.describe("touch", () => {
  test.use({
    locale: "en-US",
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  test("on a touch screen the cross draws no hover tile", async ({ page }) => {
    test.setTimeout(90000);
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `rt${now}`,
      "testtest",
      `rt+${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    for (let i = 0; i < 5; i += 1) {
      const dismiss = page.locator(".lpGlobalAlertDismiss").first();
      if (!(await dismiss.isVisible().catch(() => false))) break;
      await dismiss.tap();
    }
    await page.locator(".lpAddItem").first().tap();
    await page.locator(".lpAddItemInput").first().fill("Camp stove");
    await page.keyboard.press("Enter");
    const row = page.locator(".lpItem[data-item-id]").first();
    await expect(row).toBeVisible({ timeout: 15000 });

    const cross = row.locator(".lpRemoveItem");
    await cross.hover();
    await page.waitForTimeout(300);
    const t = await cross.evaluate(tile);
    const own = await cross.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(t.bg, "no red tile left behind by a tap").toBe("rgba(0, 0, 0, 0)");
    expect(own, "nor a red background on the element").toBe("rgba(0, 0, 0, 0)");
  });
});
