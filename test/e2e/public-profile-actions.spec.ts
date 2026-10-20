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

// The list description was capped at 58ch, sized for the old 680px column: on the 1040px page
// it left more than half of the card empty.
test("a list description uses the width of its card on a public profile", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1600, height: 900 });
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pt${now}`, "testtest", `pt+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({
    timeout: 35000,
  });

  await page.route("**/api/public/profile/*", (route) =>
    route.fulfill({
      json: {
        username: "someoneelse",
        profile: { displayName: "Someone Else", visibility: "public" },
        entitlements: { plan: "free" },
        lists: [
          {
            externalId: "abc123",
            name: "A long list",
            description: "A description that goes on and on about the gear, ".repeat(12),
            totalBaseWeight: 3300000,
            totalQty: 46,
          },
        ],
        followerCount: 0,
        followingCount: 0,
      },
    }),
  );
  await page.goto(`${testRoot}u/someoneelse`);
  await expect(page.locator(".lpPublicListDesc")).toBeVisible({ timeout: 15000 });

  const card = await page.locator(".lpPublicListCard").boundingBox();
  const description = await page.locator(".lpPublicListDesc").boundingBox();
  // More than 58ch (about 410px), but still a readable line, not the whole 1000px.
  expect(description.width).toBeGreaterThan(560);
  expect(description.width).toBeLessThan(card.width - 100);
});

// A creator can put an affiliate link or a partner code in the profile links, so those links
// carry `sponsored` like the links of a list description.
test("the links of a creator profile are marked sponsored", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ps${now}`, "testtest", `ps+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({
    timeout: 35000,
  });

  await page.route("**/api/public/profile/*", (route) =>
    route.fulfill({
      json: {
        username: "creator",
        profile: {
          displayName: "A Creator",
          visibility: "public",
          links: [{ label: "Shop", url: "https://example.com/shop" }],
        },
        entitlements: { plan: "creator" },
        lists: [],
        followerCount: 0,
        followingCount: 0,
      },
    }),
  );
  await page.goto(`${testRoot}u/creator`);
  const link = page.locator(".lpPublicLinks a");
  await expect(link).toBeVisible({ timeout: 15000 });
  const rel = (await link.getAttribute("rel")) || "";
  expect(rel).toContain("sponsored");
  expect(rel).toContain("ugc");
  expect(rel).toContain("nofollow");
  expect(rel).toContain("noopener");
});
