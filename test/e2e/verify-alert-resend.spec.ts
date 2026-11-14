import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A user who closed the verify banner still gets a way to resend the e-mail: the alert shown when
// they try to make a list public carries a resend button.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the verify-before-public alert has a working resend button", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `vr${now}`, "testtest", `vr+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // The banner was dismissed for good, and the welcome toast is gone.
  await page.evaluate(() => localStorage.setItem("verifyBannerDismissed", "1"));
  await page.reload();
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".lpVerifyBanner")).toHaveCount(0);

  // The message the server sends when an unverified account makes a list public.
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit(
      "pushGlobalAlert",
      { message: "Please verify your email before making lists public." },
    );
  });

  const resend = page.locator(".lpGlobalAlertAction");
  await expect(resend).toBeVisible();
  await expect(resend).toHaveText("Resend email");
  await resend.click();
  await expect(resend).toHaveText(/Verification email sent/);
});
