import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the name takes the whole line; weight then quantity follow on the next one, so the
// field order of the iOS "previous / next" bar and of Tab (name, weight, quantity) is the order
// the eye reads.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("on a phone the name has its own line and weight comes before quantity", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `nl${now}`, "testtest", `nl+${now}@lighterpack.com`);
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

  const name = await row.locator(".lpName").boundingBox();
  const weight = await row.locator(".lpWeight").boundingBox();
  const qty = await row.locator(".lpQty").boundingBox();
  const rowBox = await row.boundingBox();

  // The name is alone on its line and wide: most of the row.
  expect(name?.width ?? 0, "name width").toBeGreaterThan(
    (rowBox?.width ?? 0) * 0.6,
  );
  expect(weight?.y ?? 0, "numbers below the name").toBeGreaterThanOrEqual(
    (name?.y ?? 0) + (name?.height ?? 0) - 1,
  );

  // Weight and quantity share a line, weight first.
  expect(Math.abs((weight?.y ?? 0) - (qty?.y ?? 0)), "same line").toBeLessThan(
    20,
  );
  expect(weight?.x ?? 0, "weight left of quantity").toBeLessThan(qty?.x ?? 0);

  // The action icons sit in the middle of their line, above the numbers.
  const cell = await row.locator(".lpActionsCell").boundingBox();
  expect(
    (cell?.y ?? 0) + (cell?.height ?? 0),
    "actions above the numbers",
  ).toBeLessThanOrEqual((weight?.y ?? 0) + 1);
  const first = await row.locator(".lpWorn").boundingBox();
  const last = await row.locator(".lpEdit").boundingBox();
  const left = (first?.x ?? 0) - (cell?.x ?? 0);
  const right =
    (cell?.x ?? 0) + (cell?.width ?? 0) - ((last?.x ?? 0) + (last?.width ?? 0));
  expect(Math.abs(left - right), "icons centred").toBeLessThanOrEqual(2);

  // Text inputs in document order: name, description, weight, quantity.
  const order = await row.evaluate((li) =>
    Array.from(li.querySelectorAll("input[type=text]")).map(
      (el) => el.className.match(/lp(Name|Description|Weight|Qty)\b/)?.[1],
    ),
  );
  expect(order).toEqual(["Name", "Description", "Weight", "Qty"]);
});
