import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// Every screen uses one of three column widths (client/css/_globals.scss), so moving between
// pages does not change the width of the content:
//   reading  720px  About, Guide (the Feed view is not used: /feed shows Discover)
//   content 1040px  Discover, public list, public profile
//   app     1200px  editor (sidebar open or hidden), moderation
const READING = "720px";
const CONTENT = "1040px";
const APP = "1200px";

test.use({ locale: "en-US", viewport: { width: 1600, height: 900 } });

const maxWidth = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).maxWidth);

test("pages share three column widths", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pw${now}`, "testtest", `pw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // Editor: the same cap with the sidebar open and hidden.
  expect(await maxWidth(page, ".lpList")).toBe(APP);
  await page.locator("#hamburger").dispatchEvent("click");
  await expect(page.locator("#main.lpHasSidebar")).toHaveCount(0);
  expect(await maxWidth(page, ".lpList")).toBe(APP);

  await page.goto(`${testRoot}about`);
  await expect(page.locator(".lpAbout")).toBeVisible();
  expect(await maxWidth(page, ".lpAbout")).toBe(READING);

  // The Guide page sends other plans away, and a reload would drop the plan set in the store.
  await page.goto(testRoot);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.evaluate(() => {
    const app = window.LighterPack;
    app.$store.state.library.entitlements = { plan: "creator" };
    app.$router.push("/guide");
  });
  await expect(page.locator(".lpGuide")).toBeVisible();
  expect(await maxWidth(page, ".lpGuide")).toBe(READING);

  await page.goto(`${testRoot}community`);
  await expect(page.locator(".lpCommunity")).toBeVisible();
  expect(await maxWidth(page, ".lpCommunity")).toBe(CONTENT);

  // Public profile and list: stub the API, as making them public takes the account UI.
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
  await expect(page.locator(".lpPublicProfile")).toBeVisible();
  expect(await maxWidth(page, ".lpPublicProfile")).toBe(CONTENT);

  await page.route("**/api/public/list/*", (route) =>
    route.fulfill({
      json: {
        username: "someone",
        authorDisplayName: "Someone",
        authorTier: "free",
        list: {
          id: 1,
          externalId: "abc123",
          name: "A list",
          summary: "",
          description: "",
          visibility: "shareable",
          copyable: false,
          totalWeight: 0,
          totalWornWeight: 0,
          totalConsumableWeight: 0,
          totalBaseWeight: 0,
          totalPackWeight: 0,
          totalPrice: 0,
          totalConsumablePrice: 0,
          totalQty: 0,
          seasons: [],
          listTypes: [],
        },
        forkedFrom: null,
        totalUnit: "kg",
        itemUnit: "g",
        currencySymbol: "€",
        publicFields: {
          price: false,
          links: false,
          images: false,
          downloadable: false,
        },
        categories: [],
        hasAffiliateLinks: false,
        creatorCodes: [],
      },
    }),
  );
  await page.goto(`${testRoot}p/abc123`);
  await expect(page.locator(".lpPublicList")).toBeVisible();
  expect(await maxWidth(page, ".lpPublicList")).toBe(CONTENT);
});
