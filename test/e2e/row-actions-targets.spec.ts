import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Row action buttons are big enough to tap on a phone, and the worn, consumable and optional
// toggles show their state with a ring, not only a colour.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("row toggles have phone-size targets on a phone and a ring when on", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ra${now}`, "testtest", `ra+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // Turn "optional" on from the desktop layout, then look at the phone layout.
  await row.hover();
  const worn = row.locator(".lpOptionDot");
  if (!(await worn.evaluate((el) => el.classList.contains("lpActive")))) {
    await worn.click();
  }
  await expect(worn).toHaveClass(/lpActive/);

  await page.setViewportSize({ width: 375, height: 812 });
  for (const sel of [".lpWorn", ".lpConsumable", ".lpEdit"]) {
    const box = await row.locator(sel).boundingBox();
    expect(box?.width ?? 0, `${sel} width`).toBeGreaterThanOrEqual(28);
    expect(box?.height ?? 0, `${sel} height`).toBeGreaterThanOrEqual(28);
  }

  // The whole bar stays inside the row and clear of the weight field.
  const rowBox = await row.boundingBox();
  const edit = await row.locator(".lpEdit").boundingBox();
  const weight = await row.locator(".lpWeightCell").boundingBox();
  expect((edit?.x ?? 0) + (edit?.width ?? 0)).toBeLessThanOrEqual(
    (rowBox?.x ?? 0) + (rowBox?.width ?? 0),
  );
  expect(
    (edit?.y ?? 0) >= (weight?.y ?? 0) + (weight?.height ?? 0) - 1 ||
      (edit?.x ?? 0) + (edit?.width ?? 0) <= (weight?.x ?? 0),
  ).toBe(true);

  // On: a ring that does not depend on the icon colour.
  const ring = await worn.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ring).not.toBe("none");
});
