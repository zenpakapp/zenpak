import { test, expect } from "@playwright/test";

// The meta line of a card and the Popular Packs are translated and have the right plural; the author
// links take taps in a 24px area (they are 15 and 17px tall).
const lists = [
  {
    externalId: "a",
    name: "Liste A",
    author: "alice",
    authorDisplayName: "Alice",
    totalBaseWeight: 5200000,
    totalQty: 1,
    viewCount: 1,
    copyCount: 2,
    updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    externalId: "b",
    name: "Liste B",
    author: "bob",
    authorDisplayName: "Bob",
    totalQty: 12,
    viewCount: 3,
  },
];

async function mockDiscover(page) {
  await page.route("**/api/community/discover?*", (route) =>
    route.fulfill({ json: { lists, nextCursor: null } }),
  );
}

test.describe("in French", () => {
  test.use({ locale: "fr-FR", viewport: { width: 1280, height: 900 } });

  test("meta line and popular packs are translated with plurals", async ({
    page,
  }) => {
    await mockDiscover(page);
    await page.goto("/community");
    const results = page.locator(".lpCommunityResults");
    await expect(results).toContainText("1 article");
    await expect(results).toContainText("12 articles");
    await expect(results).toContainText("1 vue");
    await expect(results).toContainText("3 vues");
    await expect(results).toContainText("2 copies");
    await expect(results).toContainText("il y a 5 h");
    await expect(results).not.toContainText("ago");
    await expect(results).not.toContainText(/\bviews?\b|\bitems?\b/);
    const popular = page.locator(".lpCommunityPopularMeta");
    await expect(popular.first()).toContainText("vue");
    await expect(popular.first()).not.toContainText(/views/);
    // A list without weight does not end on a lone "de base".
    await expect(popular.nth(1)).not.toContainText("de base");
  });
});

test.describe("author links", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("take taps 11px above and below their centre", async ({ page }) => {
    await mockDiscover(page);
    await page.goto("/community");
    for (const selector of [
      ".lpCommunityCardAuthor a",
      ".lpCommunityPopularAuthor",
    ]) {
      const link = page.locator(selector).first();
      await expect(link).toBeVisible();
      const ok = await link.evaluate((el) => {
        const b = el.getBoundingClientRect();
        const x = b.left + b.width / 2;
        return [b.top + b.height / 2 - 11, b.top + b.height / 2 + 11].every(
          (y) => {
            const hit = document.elementFromPoint(x, y);
            return !!hit && el.contains(hit);
          },
        );
      });
      expect(ok, selector).toBe(true);
    }
  });
});
