import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Worn, consumable and optional change the weight maths, so they show on every row without
// hovering (faint at rest, full when on); the other row actions still wait for the pointer.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the weight toggles are visible at rest and the rest wait for hover", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `tv${now}`, "testtest", `tv+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  const row = page.locator(".lpItem[data-item-id]").nth(1);
  await expect(row).toBeVisible({ timeout: 15000 });

  const opacity = (cls: string) =>
    row.locator(cls).evaluate((el) => Number(getComputedStyle(el).opacity));

  // Pointer away from the list: toggles faint but there, other actions hidden.
  await page.mouse.move(5, 5);
  for (const cls of [".lpWorn", ".lpConsumable", ".lpOptionDot"]) {
    const rest = await opacity(cls);
    const on = await row
      .locator(cls)
      .evaluate((el) => el.classList.contains("lpActive"));
    if (!on) expect(rest, `${cls} at rest`).toBeGreaterThanOrEqual(0.4);
  }
  expect(await opacity(".lpCamera")).toBe(0);

  // Under the pointer, the toggles come up.
  await row.hover();
  await expect
    .poll(() => opacity(".lpWorn"), { message: "worn under the pointer" })
    .toBeGreaterThanOrEqual(0.6);

  // On a phone there is no hover: the toggles are stronger than the other icons.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.mouse.move(5, 5);
  await expect
    .poll(() => opacity(".lpConsumable"), { message: "toggle on a phone" })
    .toBeGreaterThanOrEqual(0.7);
  expect(await opacity(".lpConsumable")).toBeGreaterThan(await opacity(".lpTag"));
});
