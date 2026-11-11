import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// Wayfarer insights live on the guide page, not under the list. The share popover shows the
// numbers of the open list. The server answers are stubbed and the plan is set in the browser.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("insights are on the guide page, and the share popover shows this list's numbers", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route("**/api/community/insights", (route) =>
    route.fulfill({
      json: {
        totals: { followers: 3, views: 124, copies: 9 },
        lists: [
          { externalId: "abc123", name: "Alps", viewCount: 124, copyCount: 9 },
        ],
      },
    }),
  );
  await page.route("**/api/guide/profile", (route) =>
    route.fulfill({
      json: { bio: "", links: [], gearPhilosophy: [], affiliateRules: [] },
    }),
  );
  await page.route("**/api/guide/items", (route) =>
    route.fulfill({ json: [] }),
  );

  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gn${now}`, "testtest", `gn+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.evaluate(() => {
    const { state } = window.LighterPack.$store;
    state.library.entitlements = { plan: "creator" };
    for (const l of Object.values(state.library.lists || {})) {
      l.visibility = "shareable";
      l.externalId = "abc123";
    }
  });

  // Not under the list any more.
  await expect(page.locator(".lpInsights")).toHaveCount(0);

  // This list's numbers, in the share popover.
  await page
    .locator("#header [title='Share'] svg")
    .first()
    .hover({ force: true });
  const line = page.locator(".lpListInsights");
  await expect(line).toContainText("Views 124", { timeout: 15000 });
  await expect(line).toContainText("Copies 9");

  // The full table is on the guide page.
  await page.evaluate(() => window.LighterPack.$router.push("/guide"));
  const insights = page.locator(".lpInsights");
  await expect(insights).toBeVisible({ timeout: 15000 });
  await expect(insights).toContainText("124");
  await expect(insights).toContainText("Alps");
});
