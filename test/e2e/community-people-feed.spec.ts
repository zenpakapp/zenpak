import { test, expect } from "@playwright/test";

// People: the search field has a name and does not take the focus (on a phone that opens the keyboard
// over the list). A failed load says so in the language of the page. The back link takes taps in a
// 24px area (it is 15px tall).
test.describe("in French", () => {
  test.use({ locale: "fr-FR", viewport: { width: 390, height: 844 } });

  test("people search is named and keeps the focus off", async ({ page }) => {
    await page.route("**/api/community/people*", (route) =>
      route.fulfill({ json: { users: [], nextCursor: null } }),
    );
    await page.goto("/community/people");
    const search = page
      .getByRole("searchbox")
      .or(page.locator(".lpCommunitySearchInput"));
    await expect(search.first()).toBeVisible();
    await expect(search.first()).toHaveAttribute("aria-label", /.+/);
    await expect(search.first()).not.toBeFocused();
  });

  test("a failed discover load is shown in French", async ({ page }) => {
    await page.route("**/api/community/discover?*", (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page.goto("/community");
    await expect(page.locator(".lpCommunityEmpty").first()).toHaveText(
      "Impossible de charger les listes.",
    );
  });
});

test.describe("back link", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("takes taps 11px above and below its centre", async ({ page }) => {
    await page.goto("/community");
    const link = page.locator(".lpCommunityNav a");
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
    expect(ok).toBe(true);
  });
});
