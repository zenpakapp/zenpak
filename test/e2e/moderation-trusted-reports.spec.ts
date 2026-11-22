import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The moderator sees how many of a target's reports come from verified, established accounts, so a
// crowd of new accounts shows up as one.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a target reported by new accounts says how few of its reports count", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `mt${now}`, "testtest", `mt+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/moderation/stats", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route(
    (url) => url.pathname === "/api/reports",
    (route) =>
      route.fulfill({
        json: {
          total: 2,
          reports: [
            {
              targetType: "list",
              targetId: "crowd",
              targetOwnerUsername: "owner-crowd",
              count: 5,
              trustedCount: 0,
              reasons: { spam: 5 },
              reporters: ["n1", "n2", "n3"],
              latestAt: new Date().toISOString(),
            },
            {
              targetType: "list",
              targetId: "solid",
              targetOwnerUsername: "owner-solid",
              count: 2,
              trustedCount: 2,
              reasons: { spam: 2 },
              reporters: ["v1", "v2"],
              latestAt: new Date().toISOString(),
            },
          ],
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

  // The heading counts the pending reports with a translated label, not a raw key.
  await expect(page.getByRole("heading", { name: /Reports/ })).toContainText("(2 pending)");

  const crowd = page.locator(".lpModerationReport", { hasText: "crowd" });
  await expect(crowd).toContainText("5 reports");
  await expect(crowd).toContainText("0 from verified, established accounts");
  const solid = page.locator(".lpModerationReport", { hasText: "solid" });
  await expect(solid).toContainText("2 reports");
  await expect(solid).not.toContainText("established accounts");
});
