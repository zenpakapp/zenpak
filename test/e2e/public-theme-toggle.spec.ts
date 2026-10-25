import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// A visitor of a shared list has no account and no app: a small button in the page header lets
// them pick light or dark instead of only following the system.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const payload = {
  username: "someone",
  authorDisplayName: "Someone",
  authorTier: "creator",
  list: {
    id: 1,
    externalId: "abc123",
    name: "Theme list",
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
  categories: [
    {
      id: 1,
      name: "Gear",
      subtotalWeight: 1000,
      subtotalWornWeight: 0,
      subtotalConsumableWeight: 0,
      subtotalPrice: 0,
      subtotalConsumablePrice: 0,
      subtotalQty: 1,
      items: [
        {
          id: 1,
          name: "Tent",
          brand: "",
          description: "",
          weight: 1000,
          authorUnit: "g",
          price: 0,
          image: "",
          imageUrl: "",
          shop: "",
          tags: [],
          publicUrl: "",
          promoCode: "",
          promoLabel: "",
          hasAffiliateLink: false,
          qty: 1,
          worn: 0,
          consumable: false,
          star: 0,
        },
      ],
    },
  ],
  hasAffiliateLinks: false,
  affiliateDisclosure: "",
  creatorCodes: [],
};

async function openList(page) {
  await page.route("**/api/public/list/*", (route) =>
    route.fulfill({ json: payload }),
  );
  await page.goto(`${testRoot}p/abc123`);
  await expect(page.locator(".lpPublicListItem").first()).toBeVisible();
}

test("a visitor can switch the theme of a shared list and it is remembered", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openList(page);

  const toggle = page.locator(".lpPublicNav .lpThemeItem");
  await expect(toggle).toBeVisible();
  const html = page.locator("html");

  // Starts on "auto": no forced theme, the system decides, and the button says so.
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
  await expect(toggle).toHaveAttribute("aria-label", "Theme: follow system");
  // The words are visible next to the icon, so it cannot be mistaken for an app link.
  await expect(toggle).toContainText("Theme: auto");

  // auto -> light -> dark
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-label", "Theme: light");
  await expect(toggle).toContainText("Theme: light");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-label", "Theme: dark");
  await expect(toggle).toContainText("Theme: dark");

  // The choice survives a reload, whatever the system says.
  await page.reload();
  await expect(page.locator(".lpPublicListItem").first()).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // And back to auto.
  await page.locator(".lpPublicNav .lpThemeItem").click();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
});

test("the theme button works with the keyboard", async ({ page }) => {
  await openList(page);
  const toggle = page.locator(".lpPublicNav .lpThemeItem");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

// Someone signed in already has the theme setting in the app, so the page does not repeat it.
test("a signed-in user does not get the theme button on a shared list", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `th${now}`, "testtest", `th+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({ timeout: 35000 });

  await openList(page);
  await expect(page.locator(".lpPublicNav")).toBeVisible();
  await expect(page.locator(".lpPublicNav .lpThemeItem")).toHaveCount(0);
});
