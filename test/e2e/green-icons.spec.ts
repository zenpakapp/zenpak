import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The LighterPack sprite is blue; ZenPak is green. Active icons get a hue rotation, in both themes.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("active row icons are turned green in light and dark", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gi${now}`, "testtest", `gi+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();
  await row.locator(".lpWorn").click();
  const worn = row.locator(".lpWorn.lpActive");
  await expect(worn).toBeVisible();

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await row.hover();
    const filter = await worn.evaluate((el) => getComputedStyle(el).filter);
    expect(filter, `${scheme} filter`).toContain("hue-rotate");
    const arrow = await row
      .locator(".lpUp")
      .evaluate((el) => getComputedStyle(el).filter);
    expect(arrow, `${scheme} up arrow`).toContain("hue-rotate");
    await row.screenshot({
      path: `/private/tmp/claude-501/-Users-fxbenard-Documents-Dev-zenpak/c20a8e81-0b43-4220-8931-990c044b4ba7/scratchpad/green-${scheme}.png`,
    });
  }
});
