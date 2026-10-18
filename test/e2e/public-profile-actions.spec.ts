import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// Follow and Report sat side by side in the profile header, the Follow button 12px lower
// than the Report link (margin-top on one only). They are now one column, centred.
test("Follow and Report are stacked and aligned on a public profile", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pa${now}`, "testtest", `pa+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({
    timeout: 35000,
  });

  // Making a profile public goes through the account settings UI: stub the profile payload.
  await page.route("**/api/public/profile/*", (route) =>
    route.fulfill({
      json: {
        username: "someoneelse",
        profile: { displayName: "Someone Else", visibility: "public" },
        entitlements: { plan: "free" },
        lists: [],
        followerCount: 0,
        followingCount: 0,
      },
    }),
  );
  await page.goto(`${testRoot}u/someoneelse`);
  await expect(page.locator(".lpFollowBtn")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lpReportBtn")).toBeVisible();

  const follow = await page.locator(".lpFollowBtn").boundingBox();
  const report = await page.locator(".lpReportBtn").boundingBox();
  const hero = await page.locator(".lpPublicHero").boundingBox();

  // One above the other, on the same vertical axis, inside the header card.
  expect(report.y).toBeGreaterThanOrEqual(follow.y + follow.height - 1);
  const followCenter = follow.x + follow.width / 2;
  const reportCenter = report.x + report.width / 2;
  expect(Math.abs(followCenter - reportCenter)).toBeLessThanOrEqual(2);
  expect(report.x + report.width).toBeLessThanOrEqual(hero.x + hero.width);
});
