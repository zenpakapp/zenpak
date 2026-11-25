import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

test("the visitor can use the profile navigation on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/public/profile/someoneelse", (route) => route.fulfill({
    json: { username: "someoneelse", profile: { displayName: "Someone Else" }, lists: [] },
  }));
  await page.goto(`${testRoot}u/someoneelse`);
  const nav = page.getByRole("navigation");
  const theme = nav.getByRole("button", { name: /theme/i });
  await expect(theme).toBeVisible();
  for (const control of [theme, ...await nav.getByRole("link").all()]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

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
        followerCount: 1,
        followingCount: 1,
      },
    }),
  );
  await page.goto(`${testRoot}u/someoneelse`);
  await expect(page.locator(".lpFollowBtn")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lpReportBtn")).toBeVisible();
  await expect(page.locator(".lpPublicStats > span")).toHaveText(["0 lists", "1 follower", "1 following"]);

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
            destination: "GR5",
            seasons: ["4-season", "spring", "summer", "fall", "winter"],
            durations: ["weekend"],
            listTypes: ["hiking"],
            description: "A description that goes on and on about the gear, ".repeat(12),
            totalBaseWeight: 3300000,
            totalQty: 46,
            viewCount: 12,
            copyCount: 2,
            updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        followerCount: 0,
        followingCount: 0,
      },
    }),
  );
  await page.goto(`${testRoot}u/someoneelse`);
  const listCard = page.locator(".lpPublicListCard");
  const descriptionText = listCard.locator(".lpPublicListDesc").filter({ hasText: "A description" });
  await expect(descriptionText).toBeVisible({ timeout: 15000 });

  const tags = listCard.locator(".lpPublicListTags");
  const destination = tags.locator(".lpListCardTag").first();
  await expect(destination).toContainText("GR5");
  for (const tag of ["4-Season", "Weekend", "Hiking"]) {
    await expect(tags.getByText(tag, { exact: true })).toBeVisible();
  }
  await expect(tags.locator('svg[aria-hidden="true"]')).toHaveCount(4);
  await expect(tags).not.toContainText("Summer");
  const locationBox = (await destination.boundingBox())!;
  const pinBox = (await destination.locator("svg").boundingBox())!;
  expect(Math.abs(pinBox.y + pinBox.height / 2 - locationBox.y - locationBox.height / 2)).toBeLessThanOrEqual(1);

  const metrics = listCard.locator(".lpPublicListMeta");
  const icons = metrics.locator('svg[aria-hidden="true"]');
  await expect(icons).toHaveCount(2);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveCSS("width", "12px");
    await expect(icon).toHaveCSS("height", "12px");
  }
  const cardLink = listCard.getByRole("link");
  await expect(cardLink).toHaveAccessibleName("A long list");
  for (const value of ["Base Weight", "3.3 kg", "46 items"]) {
    await expect(metrics).toContainText(value);
  }
  await expect(page.locator(".lpPublicStats > span")).toHaveText(["1 list", "0 followers", "0 following"]);
  await expect(listCard.getByText("12 views", { exact: true })).toBeVisible();
  await expect(listCard.getByText("2 copies", { exact: true })).toBeVisible();
  await expect(listCard.locator("time")).toHaveText("1 wk. ago");
  const metricCenters = await metrics.locator(".lpPublicListMetric, span:text-is('12 views'), span:text-is('2 copies'), time").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.y + rect.height / 2;
    }),
  );
  expect(metricCenters).toHaveLength(5);
  expect(Math.max(...metricCenters) - Math.min(...metricCenters)).toBeLessThanOrEqual(1);

  const card = await listCard.boundingBox();
  const description = await descriptionText.boundingBox();
  // More than 58ch (about 410px), but still a readable line, not the whole 1000px.
  expect(description.width).toBeGreaterThan(560);
  expect(description.width).toBeLessThan(card.width - 100);

  const idleColor = await icons.first().evaluate((icon) => getComputedStyle(icon).color);
  await listCard.hover();
  expect((await listCard.boundingBox())!.height).toBeCloseTo(card.height, 0);
  const highlights = metrics.locator(".lpPublicListMetric, svg");
  await expect(highlights).toHaveCount(4);
  for (const highlight of await highlights.all()) {
    await expect(highlight).not.toHaveCSS("color", idleColor);
    await expect.poll(async () => {
      const descriptionColor = await descriptionText.evaluate((el) => getComputedStyle(el).color);
      const highlightColor = await highlight.evaluate((el) => getComputedStyle(el).color);
      return highlightColor === descriptionColor;
    }).toBe(true);
  }
  await page.mouse.move(0, 0);
  await cardLink.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(cardLink).toBeFocused();
  expect((await listCard.boundingBox())!.height).toBeCloseTo(card.height, 0);
  await listCard.click({ position: { x: 20, y: card.height - 18 } });
  await expect(page).toHaveURL(/\/p\/abc123(?:\?|$)/);
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
