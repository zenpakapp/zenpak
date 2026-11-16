import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the weight sits above the quantity, so the field order of the iOS "previous / next"
// bar and of Tab (name, weight, quantity) is the order the eye reads.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("on a phone the weight is above the quantity and comes first in focus order", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `wq${now}`, "testtest", `wq+${now}@lighterpack.com`);
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

  const weight = await row.locator(".lpWeight").boundingBox();
  const qty = await row.locator(".lpQty").boundingBox();
  expect(weight?.y ?? 0, "weight above quantity").toBeLessThan(qty?.y ?? 0);

  // Text inputs in document order: name, description, weight, quantity.
  const order = await row.evaluate((li) =>
    Array.from(li.querySelectorAll("input[type=text]")).map(
      (el) => el.className.match(/lp(Name|Description|Weight|Qty)\b/)?.[1],
    ),
  );
  expect(order).toEqual(["Name", "Description", "Weight", "Qty"]);
});
