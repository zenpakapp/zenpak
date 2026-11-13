import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// Packing mode keeps its progress bar under the header while the list scrolls, and shows the
// base weight there instead of the donut and totals block.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("packing bar stays under the header and carries the base weight", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sp${now}`, "testtest", `sp+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  await page.setViewportSize({ width: 375, height: 812 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpTotalsContainer .lpPackBtn").click();
  const bar = page.locator(".lpPackingBar");
  await expect(bar).toBeVisible();

  // The donut and totals block gives way to a one-line base weight in the bar.
  await expect(page.locator(".lpListSummary")).toHaveCount(0);
  await expect(bar.locator(".lpPackingBase")).toContainText("Base weight:");

  // On a phone it takes two short rows, not a third of the screen.
  const bar0 = await bar.boundingBox();
  expect(bar0?.height ?? 999).toBeLessThanOrEqual(80);

  // A long list scrolls; the bar stays right under the header.
  // The bar sticks within the list body, so give the short fixture list the height of a long one.
  await page.evaluate(() => {
    const body = document.querySelector("#lpListBody") as HTMLElement;
    body.style.minHeight = "3000px";
  });
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(bar).toBeInViewport();
  const header = await page.locator("#header").boundingBox();
  const barBox = await bar.boundingBox();
  const headerBottom = (header?.y ?? 0) + (header?.height ?? 0);
  expect(Math.abs((barBox?.y ?? 0) - headerBottom)).toBeLessThanOrEqual(4);
});
