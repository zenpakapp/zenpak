import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// With no hover, the handles and delete crosses must not stay hidden: sidebar lists, category
// header and library items.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("handles and delete crosses are visible without hover on a touch screen", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `tc${now}`, "testtest", `tc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }

  // Category header: the handle shows, and so does the cross.
  const header = page.locator(".lpCategory .lpHeader").first();
  await expect(header.locator(".lpCategoryHandle")).toBeVisible();
  await expect(header.locator(".lpRemoveCategory")).toBeVisible();

  // Sidebar: a second list gives a non-active row, which carries a cross.
  await page.locator("#hamburger").tap();
  await page.locator(".listContainerHeader .lpTarget .lpAdd").tap();
  await page.getByText("New blank list", { exact: false }).first().tap();
  const lists = page.locator("#lists .lpLibraryList");
  await expect(lists).toHaveCount(2, { timeout: 10000 });
  const idle = page.locator("#lists .lpLibraryList:not(.lpActive)").first();
  await expect(idle.locator(".lpHandle")).toBeVisible();
  await expect(idle.locator(".lpRemove")).toBeVisible();

  const size = async (loc: ReturnType<typeof page.locator>) => {
    const box = await loc.boundingBox();
    return { w: Math.round(box!.width), h: Math.round(box!.height) };
  };
  // Hit areas a finger can hit: 24px for handles, 32px for the delete crosses.
  for (const loc of [
    idle.locator(".lpHandle"),
    header.locator(".lpCategoryHandle"),
  ]) {
    const { w, h } = await size(loc);
    expect(w).toBeGreaterThanOrEqual(24);
    expect(h).toBeGreaterThanOrEqual(24);
  }
  for (const loc of [
    idle.locator(".lpRemove"),
    header.locator(".lpRemoveCategory"),
  ]) {
    const { w, h } = await size(loc);
    expect(w).toBeGreaterThanOrEqual(32);
    expect(h).toBeGreaterThanOrEqual(32);
  }
});
