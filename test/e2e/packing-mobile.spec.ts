import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Packing mode on a phone: rows are read-only, the whole row is the tap target, optional items
// (quantity 0) are not counted, and packed rows can be hidden.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("packing mode rows are read-only, tappable and skip optional items", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pm${now}`, "testtest", `pm+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  // Make the first item optional (quantity 0) from the desktop layout.
  const first = page.locator(".lpItem[data-item-id]").first();
  await expect(first).toBeVisible({ timeout: 15000 });
  await first.hover();
  const dot = first.locator(".lpOptionDot");
  if (!(await dot.evaluate((el) => el.classList.contains("lpActive")))) {
    await dot.click();
  }
  await expect(first).toHaveClass(/lpQtyZero/);

  await page.setViewportSize({ width: 375, height: 812 });
  // Alerts can overlay the page.
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpTotalsContainer .lpPackBtn").click();
  await expect(page.locator(".lpPackingBar")).toBeVisible();

  // Read-only: no editable text field in any item row.
  await expect(
    page.locator(".lpItem[data-item-id] input[type=text]"),
  ).toHaveCount(0);

  // Counter ignores optional items.
  const countable = await page
    .locator(".lpItem[data-item-id]:not(.lpQtyZero)")
    .count();
  await expect(page.locator(".lpPackingProgress")).toContainText(
    `0 / ${countable} items packed`,
  );

  // Rows are at least 44px tall, with a 24px check.
  const row = page.locator(".lpItem[data-item-id]:not(.lpQtyZero)").first();
  const box = await row.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  const check = await row.locator(".lpPackCheckbox").boundingBox();
  expect(check?.width ?? 0).toBeGreaterThanOrEqual(24);

  // An optional item has no checkbox and cannot be packed.
  await expect(first.locator(".lpPackCheckbox")).toHaveCount(0);

  // Tapping the name (not the checkbox) packs the row.
  await row.locator(".lpName").click();
  await expect(row).toHaveClass(/lpItemPacked/);
  await expect(page.locator(".lpPackingProgress")).toContainText(
    `1 / ${countable} items packed`,
  );

  // Hide packed rows, then show them again.
  await page.locator(".lpHidePackedBtn").click();
  await expect(row).toBeHidden();
  await page.locator(".lpHidePackedBtn").click();
  await expect(row).toBeVisible();
});

for (const width of [768, 1280]) {
  test(`packing rows are read-only, tall and aligned at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `pw${now}`,
      "testtest",
      `pw+${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    await importCsvFile(
      page,
      path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
    );
    await page.locator("#importConfirm").click();
    await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
      timeout: 15000,
    });

    await page.setViewportSize({ width, height: 900 });
    for (let i = 0; i < 5; i += 1) {
      const dismiss = page.locator(".lpGlobalAlertDismiss").first();
      if (!(await dismiss.isVisible().catch(() => false))) break;
      await dismiss.click();
    }
    await page.locator(".lpTotalsContainer .lpPackBtn").click();
    await expect(page.locator(".lpPackingBar")).toBeVisible();
    await expect(
      page.locator(".lpItem[data-item-id] input[type=text]"),
    ).toHaveCount(0);

    const row = page.locator(".lpItem[data-item-id]:not(.lpQtyZero)").first();
    const box = await row.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Weight stays under its column label, and nothing overflows sideways.
    const head = page.locator(".lpItemsHeader").first();
    const hw = await head.locator(".lpWeightCell").boundingBox();
    const rw = await row.locator(".lpWeightCell").boundingBox();
    const headRight = (hw?.x ?? 0) + (hw?.width ?? 0);
    const rowRight = (rw?.x ?? 0) + (rw?.width ?? 0);
    expect(Math.abs(headRight - rowRight)).toBeLessThanOrEqual(2);
    // The weight text is centred under its label and does not touch the quantity.
    const textBox = await row
      .locator(".lpWeightCell")
      .evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const b = r.getBoundingClientRect();
        return { x: b.x, w: b.width };
      });
    const labelCentre = (hw?.x ?? 0) + (hw?.width ?? 0) / 2;
    expect(Math.abs(textBox.x + textBox.w / 2 - labelCentre)).toBeLessThanOrEqual(12);
    const qtyText = await row
      .locator(".lpQtyCell")
      .evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().x;
      });
    expect(qtyText - (textBox.x + textBox.w)).toBeGreaterThanOrEqual(8);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await row.click();
    await expect(row).toHaveClass(/lpItemPacked/);
  });
}
