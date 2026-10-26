import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

// The verification link is often opened on another device (the phone that reads the mail). The tab
// that registered must notice when it comes back, without a reload.
test.use({ locale: "en-US" });

test("the verify banner goes away when the tab regains focus after verification elsewhere", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `vd${now}`;
  await registerUser(page, username, "testtest", `vd+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".lpVerifyBanner")).toBeVisible();

  // The link is opened elsewhere: the account becomes verified in the database.
  await verifyUserEmail(username);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(page.locator(".lpVerifyBanner")).toBeHidden({ timeout: 10000 });
});
