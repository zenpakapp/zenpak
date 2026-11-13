import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The "verify your email" notices work on a phone: the alert spans the screen and the controls
// are big enough to tap.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("verify-email notices are readable and tappable on a phone", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `vn${now}`, "testtest", `vn+${now}@lighterpack.com`);

  const alert = page.locator(".lpGlobalAlerts");
  await expect(alert).toBeVisible({ timeout: 35000 });
  const box = await alert.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(340);
  // At the bottom of the screen, clear of the header.
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(700);
  const header = await page.locator("#header").boundingBox();
  expect(box?.y ?? 0).toBeGreaterThan((header?.y ?? 0) + (header?.height ?? 0));
  const x = await page.locator(".lpGlobalAlertDismiss").first().boundingBox();
  expect(x?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(x?.height ?? 0).toBeGreaterThanOrEqual(44);

  const banner = page.locator(".lpVerifyBanner");
  await expect(banner).toBeVisible({ timeout: 35000 });
  const bx = await banner.locator(".lpVerifyBannerDismiss").boundingBox();
  expect(bx?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(bx?.height ?? 0).toBeGreaterThanOrEqual(44);
  const resend = await banner.locator(".lpVerifyBannerBtn").boundingBox();
  expect(resend?.height ?? 0).toBeGreaterThanOrEqual(44);
});
