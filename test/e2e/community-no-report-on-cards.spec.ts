import { test, expect } from "@playwright/test";

// A card shows the name, the author and the tags, not what is in the list: Report belongs on the list
// page, where the content can be read.
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

test("a signed-in member sees no Report on the cards of the community", async ({
  page,
}) => {
  await page.route("**/api/community/discover?*", (route) =>
    route.fulfill({
      json: {
        nextCursor: null,
        lists: [
          { externalId: "a", name: "Liste A", author: "alice", totalQty: 3 },
        ],
      },
    }),
  );
  await page.goto("/community");
  await expect(page.locator(".lpCommunityCard").first()).toBeVisible();
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit("setLoggedIn", "fx");
  });
  // Signed in is in effect: the area that needs it (the feed tab) is enabled.
  await expect(page.locator('[data-tab="feed"]')).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.locator(".lpReportBtn")).toHaveCount(0);
});
