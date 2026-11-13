import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a touch screen there is no hover, so tapping "New list" opens the menu (blank list,
// template, imports) instead of creating a blank list straight away.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("tapping New list opens the menu, from which a template can be chosen", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `nl${now}`, "testtest", `nl+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }

  await page.locator("#hamburger").tap();
  const lists = page.locator("#lists .lpLibraryList");
  await expect(lists.first()).toBeVisible();
  const before = await lists.count();

  await page.locator(".listContainerHeader .lpTarget .lpAdd").tap();

  // The tap did not create a list; it opened the menu, inside the screen.
  const template = page.getByText("New list from a template");
  await expect(template).toBeVisible();
  expect(await lists.count()).toBe(before);
  const box = await template.boundingBox();
  expect((box?.x ?? -1) >= 0).toBe(true);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);

  await template.tap();
  await expect(page.locator(".lpTemplatePicker")).toBeVisible();
});
