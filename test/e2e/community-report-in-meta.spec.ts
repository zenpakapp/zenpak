import { test, expect } from "@playwright/test";

// "Report" ends the meta line of a card instead of taking a line of its own, and its panel stays on
// the screen on a phone.
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

const lists = [
  {
    externalId: "a",
    name: "Liste A",
    author: "alice",
    authorDisplayName: "Alice",
    totalBaseWeight: 14200000,
    totalQty: 1,
    viewCount: 3,
    updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  { externalId: "b", name: "Liste B", author: "bob", authorDisplayName: "Bob" },
];

async function openCommunityLoggedIn(page) {
  await page.route("**/api/community/discover?*", (route) =>
    route.fulfill({ json: { lists, nextCursor: null } }),
  );
  await page.goto("/community");
  await expect(page.locator(".lpCommunityCard").first()).toBeVisible();
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit("setLoggedIn", "fx");
  });
  await expect(page.locator(".lpReportBtn").first()).toBeVisible();
}

test("report is on the meta line, to the right, and adds no line to the card", async ({
  page,
}) => {
  await openCommunityLoggedIn(page);
  const card = page.locator(".lpCommunityCard").first();
  const geometry = await card.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const meta = el
      .querySelector(".lpCommunityCardMeta")!
      .getBoundingClientRect();
    const report = el.querySelector(".lpReportBtn")!.getBoundingClientRect();
    return {
      inMeta: !!el.querySelector(".lpCommunityCardMeta .lpReportBtn"),
      sameLine: report.top >= meta.top - 1 && report.bottom <= meta.bottom + 1,
      rightGap: Math.round(box.right - report.right),
      cardHeight: Math.round(box.height),
    };
  });
  expect(geometry.inMeta).toBe(true);
  expect(geometry.sameLine).toBe(true);
  expect(geometry.rightGap).toBeLessThanOrEqual(24);
});

test("the report panel stays inside the screen", async ({ page }) => {
  await openCommunityLoggedIn(page);
  await page.locator(".lpReportBtn").first().click();
  const modal = page.locator(".lpReportModal");
  await expect(modal).toBeVisible();
  const box = (await modal.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});
