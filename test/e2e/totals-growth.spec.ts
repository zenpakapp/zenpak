import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The first worn item adds the worn and base weight rows to the totals. They ease in: the height of
// the totals container goes through values between the old and the new one, it does not jump.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the totals grow smoothly when the first item is marked worn", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `tg${now}`, "testtest", `tg+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Tent");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page
    .locator(".lpCategory")
    .first()
    .locator(".lpItem[data-item-id]")
    .first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.locator(".lpWeight").fill("1000");
  await row.locator(".lpWeight").blur();

  const totals = page.locator(".lpTotalsContainer");
  await expect(page.locator(".lpWornWeight")).toHaveCount(0);
  const before = await totals.evaluate(
    (el) => el.getBoundingClientRect().height,
  );

  // Record the height on every frame from the click until the rows are in.
  await page.evaluate(() => {
    const el = document.querySelector(".lpTotalsContainer") as HTMLElement;
    (window as any).__heights = [];
    const tick = () => {
      (window as any).__heights.push(el.getBoundingClientRect().height);
      (window as any).__raf = requestAnimationFrame(tick);
    };
    tick();
  });
  await row.hover();
  await row.locator(".lpWorn").click();
  await expect(page.locator(".lpWornWeight")).toHaveCount(1);
  await page.waitForTimeout(500);
  const heights: number[] = await page.evaluate(() => {
    cancelAnimationFrame((window as any).__raf);
    return (window as any).__heights;
  });
  const after = await totals.evaluate(
    (el) => el.getBoundingClientRect().height,
  );

  expect(after).toBeGreaterThan(before + 20);
  const between = heights.filter((h) => h > before + 1 && h < after - 1);
  expect(between.length, `heights seen: ${heights.join(", ")}`).toBeGreaterThan(
    0,
  );
  // Once the animation ends, the inline height is released.
  expect(await totals.evaluate((el) => (el as HTMLElement).style.height)).toBe(
    "",
  );
});
