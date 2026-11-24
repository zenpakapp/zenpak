import { test, expect } from "@playwright/test";

// The meta line of a card and the Popular Packs are translated and have the right plural; the author
// links take taps in a 24px area (they are 15 and 17px tall).
const lists = [
  {
    externalId: "a",
    name: "Liste A",
    author: "alice",
    authorDisplayName: "Alice",
    destination: "GR5",
    seasons: ["3-season", "fall", "summer", "spring"],
    durations: ["long"],
    listTypes: ["hiking"],
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
    seasons: ["3-season", "summer"],
    totalQty: 12,
    viewCount: 3,
    updatedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    externalId: "c",
    name: "Liste C : " + "LongueÉtapeSansEspace".repeat(6),
    author: "bob",
    totalBaseWeight: 800000,
    totalQty: 1,
    updatedAt: "1970-01-01T00:00:00.000Z",
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
    const tripInfo = results.locator(".lpCommunityTags");
    await expect(tripInfo.first().locator(".lpListCardTag")).toHaveText([
      "GR5", "3 saisons", "Plus de 10 jours", "Randonnée",
    ]);
    await expect(tripInfo.first().locator('svg[aria-hidden="true"] path')).not.toHaveCount(0);
    await expect(tripInfo.first().locator('svg[aria-hidden="true"]')).toHaveCount(4);
    await expect(tripInfo.nth(1)).toHaveText("3 saisons, Été");
    await expect(tripInfo).toHaveCount(2);
    const popular = page.locator(".lpCommunityPopularMeta");
    await expect(popular.first()).toContainText("vue");
    await expect(popular.first()).not.toContainText(/views/);
    await expect(popular.first().locator("svg path")).not.toHaveCount(0);
    await expect(popular.first().getByText("5.2 kg", { exact: true })).toBeVisible();
    await expect(popular.nth(1).locator("svg")).toHaveCount(0);
  });
});

for (const width of [390, 820, 1280]) {
  test(`Discover cards prioritize base weight and avoid duplicate rankings at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockDiscover(page);
    await page.goto("/community");
    const results = page.locator(".lpCommunityResults");
    const cards = results.locator(".lpCommunityCard");
    const weight = cards.first().locator(".lpCommunityCardWeight");
    const meta = cards.first().getByText("1 item", { exact: true });
    const title = cards.first().getByText("Liste A", { exact: true });
    await expect(weight).toBeVisible();
    await expect(weight.locator("svg path")).not.toHaveCount(0);
    await expect(weight.locator("svg")).toHaveCSS("width", "12px");
    await expect(weight.locator("svg")).toHaveCSS("height", "12px");
    await expect(weight.getByText("5.2 kg", { exact: true })).toBeVisible();
    await expect(cards.first()).toHaveAccessibleName(/base weight.*5\.2 kg/i);
    const fontSize = (locator) => locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const weightSize = await fontSize(weight);
    expect(weightSize).toBeLessThan(await fontSize(title));
    expect(weightSize).toBeGreaterThan(await fontSize(meta));
    expect((await weight.boundingBox()).y).toBeLessThan((await meta.boundingBox()).y);
    const titleBox = (await title.boundingBox())!;
    const weightBox = (await weight.boundingBox())!;
    if (width === 390) {
      expect(weightBox.x).toBeCloseTo(titleBox.x, 0);
      expect(weightBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
    } else {
      expect(weightBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
      expect(weightBox.y).toBeCloseTo(titleBox.y, 0);
    }
    expect(await cards.nth(2).evaluate((card) => card.scrollWidth <= card.clientWidth)).toBe(true);
    await expect(cards.nth(1).locator("time")).toHaveText("1 wk. ago");
    await expect(cards.nth(2).locator("time")).toHaveCount(0);

    const sidebar = page.locator(".lpCommunityPopular");
    await expect(sidebar).toBeVisible();
    await page.locator('[data-sort="popular"]').click();
    await expect(cards.first()).toBeVisible();
    await expect(sidebar).toHaveCount(0);
    const layout = page.locator(".lpCommunityDiscoverLayout");
    expect((await results.boundingBox()).width).toBeCloseTo((await layout.boundingBox()).width, 0);
    await page.locator('[data-sort="recent"]').click();
    await expect(sidebar).toBeVisible();
  });
}

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
