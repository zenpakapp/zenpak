import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The "more options" dots are the only way into brand, tags and "Option" from a row: they stay
// at least 3:1 against the card at rest, in both themes, and the phone delete cross is not faint.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

const contrastOf = (el: Element) => {
  const parse = (c: string) =>
    (c.match(/[\d.]+/g) || []).map(Number) as number[];
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // Nearest opaque background behind the control.
  let bg = [255, 255, 255];
  for (let n: Element | null = el; n; n = n.parentElement) {
    const c = parse(getComputedStyle(n).backgroundColor);
    if (c.length >= 3 && (c.length === 3 || c[3] === 1)) {
      bg = c.slice(0, 3);
      break;
    }
  }
  const style = getComputedStyle(el);
  const fg = parse(style.color).slice(0, 3);
  const a = Number(style.opacity);
  const mix = fg.map((v, i) => v * a + bg[i] * (1 - a));
  const [hi, lo] = [lum(mix), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("the details dots keep 3:1 in light and dark, and the delete cross is not faint", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `rc${now}`, "testtest", `rc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.tap();
  }
  await page.locator(".lpAddItem").first().tap();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const dots = row.locator(".lpEdit");
    const ratio = await dots.evaluate(contrastOf);
    expect(ratio, `${scheme} dots`).toBeGreaterThanOrEqual(3);
  }

  const cross = await row
    .locator(".lpRemoveItem")
    .evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(cross).toBeGreaterThanOrEqual(0.7);
});
