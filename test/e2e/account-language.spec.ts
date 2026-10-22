import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The server writes emails and alerts for the account, so it keeps the language of the page:
// set at registration, and updated when the member changes it.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const storedLanguage = (page) =>
  page.evaluate(async () => {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });
    return (await response.json()).language;
  });

test("the account keeps the language of the page", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `al${now}`, "testtest", `al+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  expect(await storedLanguage(page)).toBe("en");

  // A new language on the next load is saved for the account.
  await page.evaluate(() => localStorage.setItem("zp-locale", "de"));
  await page.reload();
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect.poll(() => storedLanguage(page)).toBe("de");
});
