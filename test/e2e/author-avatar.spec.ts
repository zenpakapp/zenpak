import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";
import { testRoot } from "./utils";

// The author's photo sits beside their name on Discover cards and on the public list page.
// Without a photo, or when it does not load, their initial takes its place.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const PHOTO = "https://photos.example/alice.png";
// A 1x1 transparent PNG.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function servePhoto(page) {
  await page.route(PHOTO, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
}

const card = (externalId, name, author, authorAvatarUrl) => ({
  externalId,
  name,
  description: "",
  totalBaseWeight: 5000000,
  totalQty: 10,
  author,
  authorDisplayName: author,
  authorTier: "base",
  authorAvatarUrl,
  sourceOwnerName: "",
  sourceOwnerUsername: "",
  copyCount: 0,
  viewCount: 0,
  seasons: [],
  listTypes: [],
  durations: [],
  updatedAt: new Date().toISOString(),
  featured: false,
});

test("Discover cards show the author's photo, or their initial", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `av${now}`, "testtest", `av+${now}@lighterpack.com`);
  await verifyUserEmail(`av${now}`);
  await servePhoto(page);
  await page.route("**/api/community/discover*", (route) =>
    route.fulfill({
      json: {
        lists: [
          card("withphoto", "Alice list", "alice", PHOTO),
          card("nophoto", "Bob list", "bob", ""),
        ],
        nextCursor: null,
      },
    }),
  );
  await page.goto(`${testRoot}community`);

  const cards = page.locator(".lpCommunityCardAuthor");
  await expect(cards).toHaveCount(2);
  const withPhoto = cards.nth(0).locator(".lpPersonAvatar");
  await expect(withPhoto.locator("img")).toHaveAttribute("src", PHOTO);
  const withoutPhoto = cards.nth(1).locator(".lpPersonAvatar");
  await expect(withoutPhoto.locator("img")).toHaveCount(0);
  await expect(withoutPhoto).toHaveText("B");
  // The avatar is decoration: the author's name stays the link and the accessible text.
  await expect(withPhoto).toHaveAttribute("aria-hidden", "true");
  // "By" is no longer shown: the avatar and the name say who wrote it. Screen readers still hear it.
  const label = cards.nth(0).locator(".lpInvisible");
  await expect(label).toHaveText("By");
  expect((await label.boundingBox()).x).toBeLessThan(0);
});

const listPayload = (authorAvatarUrl) => ({
  username: "alice",
  authorDisplayName: "Alice",
  authorTier: "base",
  authorAvatarUrl,
  list: {
    id: 1,
    externalId: "abc123",
    name: "A list",
    summary: "",
    description: "",
    visibility: "shareable",
    copyable: false,
    totalWeight: 1000,
    totalWornWeight: 0,
    totalConsumableWeight: 0,
    totalBaseWeight: 1000,
    totalPackWeight: 1000,
    totalPrice: 0,
    totalConsumablePrice: 0,
    totalQty: 1,
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
});

test("the public list page shows the author's photo beside their name", async ({
  page,
}) => {
  await servePhoto(page);
  await page.route("**/api/public/list/*", (route) =>
    route.fulfill({ json: listPayload(PHOTO) }),
  );
  await page.goto(`${testRoot}p/abc123`);
  const avatar = page.locator(".lpPublicListAuthor .lpPersonAvatar");
  await expect(avatar.locator("img")).toHaveAttribute("src", PHOTO);
  await expect(page.locator(".lpPublicListAuthorLink")).toHaveText("Alice");
  const label = page.locator(".lpPublicListAuthor .lpInvisible");
  await expect(label).toHaveText("By");
  expect((await label.boundingBox()).x).toBeLessThan(0);
});

test("the public list page shows the initial when the photo does not load", async ({
  page,
}) => {
  // No route for the photo: the request fails, and the initial takes over.
  await page.route(PHOTO, (route) => route.abort());
  await page.route("**/api/public/list/*", (route) =>
    route.fulfill({ json: listPayload(PHOTO) }),
  );
  await page.goto(`${testRoot}p/abc123`);
  const avatar = page.locator(".lpPublicListAuthor .lpPersonAvatar");
  await expect(avatar).toHaveText("A");
  await expect(avatar.locator("img")).toHaveCount(0);
});
