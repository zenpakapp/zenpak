import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Closing the verify-email banner must not leave an unverified account without a way to get
// the link again: the account settings show the state and a resend button.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("an unverified account can resend the link from the account settings", async ({
  page,
}) => {
  test.setTimeout(90000);
  let resends = 0;
  await page.route("**/resendVerification", async (route) => {
    resends += 1;
    await route.fulfill({ json: { success: true } });
  });

  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ve${now}`, "testtest", `ve+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // Closing the banner is permanent, so it does not nag on every visit...
  const banner = page.locator(".lpVerifyBanner");
  await expect(banner).toBeVisible({ timeout: 35000 });
  await banner.locator(".lpVerifyBannerDismiss").click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(banner).toBeHidden();

  // ...and the settings still offer the way out.
  await page.locator(".accountDropdownName").hover();
  await page.getByText("Account Settings").click();
  const status = page.locator("#accountSettings .accountEmailField");
  await expect(status).toContainText("Not verified");
  await status.getByRole("button", { name: "Resend email" }).click();
  await expect(status).toContainText("Verification email sent");
  expect(resends).toBe(1);
});
