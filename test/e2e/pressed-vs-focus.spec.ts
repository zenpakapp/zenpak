import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// "On" (worn, consumable) is the shape: the pictogram filled in green, against an outline when it
// is off, so it reads without telling green from grey. It is not a box. Keyboard focus is a ring in
// the text colour, drawn apart from the button. Nothing that is on looks like the focus ring.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a pressed toggle and a focused toggle do not look alike", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pf${now}`, "testtest", `pf+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Jacket");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const worn = row.locator(".lpWorn");
  const consumable = row.locator(".lpConsumable");
  const style = (loc: typeof worn) =>
    loc.evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        bg: c.backgroundColor,
        outlineWidth: c.outlineWidth,
        outlineStyle: c.outlineStyle,
        outlineColor: c.outlineColor,
        outlineOffset: c.outlineOffset,
        shadow: c.boxShadow,
        color: c.color,
        fill: el.querySelector("svg")?.getAttribute("fill"),
      };
    });

  // Worn is on, and the pointer is away: no box at all, the pictogram is filled green.
  await row.hover();
  await worn.click();
  await expect(worn).toHaveClass(/lpActive/);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const on = await style(worn);
  expect(on.shadow, "pressed is not a ringed box").toBe("none");
  expect(on.fill, "pressed is the solid pictogram").toBe("currentColor");
  expect(on.color, "pressed is ZenPak green").toBe("rgb(45, 122, 79)");
  expect(on.outlineStyle, "pressed has no focus outline").toBe("none");
  expect(on.bg, "no fill behind the icon").toBe("rgba(0, 0, 0, 0)");

  // Consumable is off but has the keyboard focus: an outline in the text colour, set apart from
  // the button, and its pictogram is still the outline one, not the filled one.
  await page.keyboard.press("Tab");
  await consumable.focus();
  await page.waitForTimeout(300);
  const focused = await style(consumable);
  expect(focused.outlineStyle).toBe("solid");
  expect(focused.outlineWidth).toBe("2px");
  expect(
    parseFloat(focused.outlineOffset),
    "the ring is drawn apart from the button",
  ).toBeGreaterThanOrEqual(3);
  expect(
    focused.outlineColor,
    "not the green of the pressed ring",
  ).not.toContain("45, 122, 79");
  expect(focused.shadow, "focus alone has no box shadow").toBe("none");
  expect(focused.fill, "off is the outline pictogram").toBe("none");
  expect(focused.color, "off is not green").not.toBe("rgb(45, 122, 79)");
});
