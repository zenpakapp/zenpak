import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The moderation tab opens on the numbers: accounts, plans, public lists and activity.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a moderator sees the numbers of the community", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ms${now}`, "testtest", `ms+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search?*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route("**/moderation/search-lists*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route("**/moderation/stats", (route) =>
    route.fulfill({
      json: {
        users: {
          total: 1234,
          last7Days: 12,
          last30Days: 80,
          verified: 900,
          banned: 2,
        },
        plans: { free: 1200, supporter: 20, creator: 14, offered: 3 },
        lists: { shareable: 40, discoverable: 25, indexable: 10, featured: 0 },
        activity: { views: 98765, copies: 321, pendingReports: 4 },
      },
    }),
  );

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  const stat = (key: string) => page.locator(`.lp-moderation-stat-${key}`);
  await expect(page.locator(".lpModerationStatsCard")).toHaveCount(4);
  await expect(stat("users-total")).toHaveText("1,234");
  await expect(stat("users-7")).toHaveText("12");
  await expect(stat("users-banned")).toHaveText("2");
  await expect(stat("plans-free")).toHaveText("1,200");
  await expect(stat("plans-creator")).toHaveText("14");
  await expect(stat("lists-discoverable")).toHaveText("25");
  await expect(stat("activity-views")).toHaveText("98,765");
  await expect(stat("activity-reports")).toHaveText("4");

  // The labels name what the numbers are.
  await expect(page.locator(".lpModerationStatsCard").first()).toContainText(
    "Accounts",
  );
  await expect(page.locator(".lpModerationStatsCard").nth(1)).toContainText(
    "Wayfarer",
  );
});

test("the numbers say so when they cannot be loaded", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `mf${now}`, "testtest", `mf+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search?*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route("**/moderation/search-lists*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route("**/moderation/stats", (route) =>
    route.fulfill({ status: 500, json: { message: "An error occurred" } }),
  );

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  await expect(page.locator(".lp-moderation-stats-error")).toHaveText(
    "Unable to load the numbers.",
  );
  await expect(page.locator(".lpModerationStatsCard")).toHaveCount(0);
});
