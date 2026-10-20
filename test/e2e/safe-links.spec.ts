import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

// Links written by users on a public list: item links say whether they are affiliate links,
// every one of them tells search engines not to follow it, and URLs in the description are
// clickable, up to three.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const item = (id, name, publicUrl, hasAffiliateLink) => ({
  id,
  name,
  brand: "",
  description: "",
  weight: 1000,
  authorUnit: "g",
  price: 0,
  image: "",
  imageUrl: "",
  shop: "",
  tags: [],
  publicUrl,
  promoCode: "",
  promoLabel: "",
  hasAffiliateLink,
  qty: 1,
  worn: 0,
  consumable: false,
  star: 0,
});

const DESCRIPTION =
  "Source: https://one.example/a, see https://two.example/b. Also (https://three.example/c) " +
  "and https://four.example/d plus https://five.example/e and javascript:alert(1)";

async function openList(page, description = DESCRIPTION) {
  await page.route("**/api/public/list/*", (route) =>
    route.fulfill({
      json: {
        username: "someone",
        authorDisplayName: "Someone",
        authorTier: "creator",
        list: {
          id: 1,
          externalId: "abc123",
          name: "Links list",
          summary: "",
          description,
          visibility: "shareable",
          copyable: false,
          totalWeight: 2000,
          totalWornWeight: 0,
          totalConsumableWeight: 0,
          totalBaseWeight: 2000,
          totalPackWeight: 2000,
          totalPrice: 0,
          totalConsumablePrice: 0,
          totalQty: 2,
          seasons: [],
          listTypes: [],
        },
        forkedFrom: null,
        totalUnit: "kg",
        itemUnit: "g",
        currencySymbol: "€",
        publicFields: {
          price: false,
          links: true,
          images: false,
          downloadable: false,
        },
        categories: [
          {
            id: 1,
            name: "Gear",
            subtotalWeight: 2000,
            subtotalWornWeight: 0,
            subtotalConsumableWeight: 0,
            subtotalPrice: 0,
            subtotalConsumablePrice: 0,
            subtotalQty: 2,
            items: [
              item(
                1,
                "Affiliate tent",
                "https://shop.example/tent?tag=me",
                true,
              ),
              item(2, "Plain stove", "https://example.org/stove", false),
            ],
          },
        ],
        hasAffiliateLinks: true,
        affiliateDisclosure: "Some links earn the author a commission.",
        creatorCodes: [
          {
            name: "Shop",
            code: "ZEN10",
            label: "",
            url: "https://shop.example",
          },
        ],
      },
    }),
  );
  await page.goto(`${testRoot}p/abc123`);
  await expect(page.locator(".lpPublicListItem").first()).toBeVisible();
}

test("item and promo links carry the right rel", async ({ page }) => {
  await openList(page);
  const links = page.locator(".lpPublicListItemLink");
  await expect(links).toHaveCount(2);

  const affiliate = await links.nth(0).getAttribute("rel");
  expect(affiliate.split(" ").sort()).toEqual([
    "nofollow",
    "noopener",
    "noreferrer",
    "sponsored",
  ]);
  const plain = await links.nth(1).getAttribute("rel");
  expect(plain.split(" ").sort()).toEqual([
    "nofollow",
    "noopener",
    "noreferrer",
    "ugc",
  ]);

  const promo = await page
    .locator(".lpPublicDisclosure a")
    .first()
    .getAttribute("rel");
  expect(promo.split(" ")).toContain("sponsored");
  expect(promo.split(" ")).toContain("nofollow");
});

test("URLs in the description are clickable, three at most", async ({
  page,
}) => {
  await openList(page);
  const summary = page.locator(".lpPublicListSummary");
  const links = summary.locator("a");
  await expect(links).toHaveCount(3);

  // Punctuation around a URL is not part of it.
  expect(
    await links.evaluateAll((els) => els.map((el) => el.getAttribute("href"))),
  ).toEqual([
    "https://one.example/a",
    "https://two.example/b",
    "https://three.example/c",
  ]);
  for (const index of [0, 1, 2]) {
    await expect(links.nth(index)).toHaveAttribute("target", "_blank");
    const rel = (await links.nth(index).getAttribute("rel")).split(" ").sort();
    expect(rel).toEqual([
      "nofollow",
      "noopener",
      "noreferrer",
      "sponsored",
      "ugc",
    ]);
  }

  // Past the third, and anything that is not http(s), stays plain text.
  await expect(summary).toContainText("https://four.example/d");
  await expect(summary).toContainText("https://five.example/e");
  await expect(summary).toContainText("javascript:alert(1)");
});

test("links and promo codes on a public profile carry the right rel", async ({
  page,
}) => {
  await page.route("**/api/public/profile/*", (route) =>
    route.fulfill({
      json: {
        username: "someone",
        profile: {
          displayName: "Someone",
          visibility: "public",
          links: [{ label: "My site", url: "https://mysite.example" }],
        },
        entitlements: { plan: "creator" },
        lists: [],
        followerCount: 0,
        followingCount: 0,
        creatorCodes: [
          { name: "Shop", code: "ZEN10", label: "", url: "https://shop.example" },
        ],
      },
    }),
  );
  await page.goto(`${testRoot}u/someone`);
  const siteLink = page.locator(".lpPublicLinks a").first();
  await expect(siteLink).toBeVisible();
  // A creator can put an affiliate link in the profile, so these are sponsored too.
  expect((await siteLink.getAttribute("rel")).split(" ").sort()).toEqual([
    "nofollow",
    "noopener",
    "noreferrer",
    "sponsored",
    "ugc",
  ]);
  const promo = page.locator(".lpPublicCreatorCodes a").first();
  await expect(promo).toBeVisible();
  const promoRel = (await promo.getAttribute("rel")).split(" ");
  expect(promoRel).toContain("sponsored");
  expect(promoRel).toContain("nofollow");
});

test("an address typed without https is a link, the text stays as typed", async ({
  page,
}) => {
  await openList(
    page,
    "Community adaptation shared by Kinred (https://www.youtube.com/@kinred, @instagram.com/kinredgta). " +
      "Notes in tent.png and example.com stay plain.",
  );
  const summary = page.locator(".lpPublicListSummary");
  const links = summary.locator("a");
  await expect(links).toHaveCount(2);
  expect(
    await links.evaluateAll((els) => els.map((el) => el.getAttribute("href"))),
  ).toEqual(["https://www.youtube.com/@kinred", "https://instagram.com/kinredgta"]);
  // The link is the address; the "@" in front of it and the ")" after it are not part of it.
  await expect(links.nth(1)).toHaveText("instagram.com/kinredgta");
  await expect(summary).toContainText("@instagram.com/kinredgta).");
  await expect(summary).toContainText("tent.png and example.com stay plain");
});

test("line breaks in a description are kept on the public list", async ({
  page,
}) => {
  await openList(
    page,
    "First line (https://one.example/a)\nSecond line\n\nThird paragraph after a blank line",
  );
  const summary = page.locator(".lpPublicListSummary");
  // innerText follows the rendering: collapsed newlines would come out as spaces.
  const rendered = await summary.innerText();
  expect(rendered).toContain("First line (https://one.example/a)\nSecond line");
  expect(rendered).toMatch(/Second line\n+Third paragraph/);
  await expect(summary.locator("a")).toHaveCount(1);
});

test("a run of line breaks shows as one blank line", async ({ page }) => {
  await openList(
    page,
    `First line${"\n".repeat(50)}Second line\n\n\n\nThird line`,
  );
  const summary = page.locator(".lpPublicListSummary");
  const rendered = await summary.innerText();
  expect(rendered.trim()).toBe("First line\n\nSecond line\n\nThird line");
  // And the paragraph stays a few lines tall, not a screenful.
  const box = await summary.boundingBox();
  expect(box.height).toBeLessThan(120);
});
