import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A failed load of the reports shows its translated message, not the key it is stored under.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a failed load of the reports shows its message", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ml${now}`, "testtest", `ml+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.route("**/moderation/stats", (route) =>
    route.fulfill({ status: 500, json: {} }),
  );

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  await expect(
    page.locator(".lpCommunityEmpty", { hasText: "Unable to load reports." }),
  ).toBeVisible();
});
