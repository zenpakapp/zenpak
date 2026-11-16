import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a touch screen the row controls are 44px tall (the size iOS and Android ask for), and the
// delete cross never overlaps the weight field next to it.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("row controls are 44px tall on a phone and the delete cross keeps clear of the weight", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `rt${now}`, "testtest", `rt+${now}@lighterpack.com`);
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

  for (const sel of [
    ".lpWorn",
    ".lpConsumable",
    ".lpEdit",
    ".lpUp",
    ".lpDown",
    ".lpRemoveItem",
  ]) {
    const box = await row.locator(sel).boundingBox();
    expect(box?.height ?? 0, `${sel} height`).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0, `${sel} width`).toBeGreaterThanOrEqual(40);
  }

  const cross = await row.locator(".lpRemoveItem").boundingBox();
  const weight = await row.locator(".lpWeightCell").boundingBox();
  expect(
    (weight?.x ?? 0) + (weight?.width ?? 0),
    "weight ends before the cross",
  ).toBeLessThanOrEqual(cross?.x ?? 0);

  // Nothing pushes the page sideways.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
