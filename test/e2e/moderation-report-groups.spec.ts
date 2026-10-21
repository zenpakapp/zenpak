import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Reports are grouped by target: the moderator sees how many reports a list or an account has and
// why, can filter by type and reason, load more than one page, and close a target in one click.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("reports are grouped, filtered and paged", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `mg${now}`, "testtest", `mg+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });

  const group = (targetType, targetId, count, reasons) => ({
    targetType,
    targetId,
    targetOwnerUsername:
      targetType === "list" ? `owner-${targetId}` : undefined,
    count,
    reasons,
    reporters: ["rep1", "rep2"],
    latestAt: new Date().toISOString(),
  });
  const firstPage = [
    group("list", "popular", 3, { spam: 2, fake: 1 }),
    group("user", "badguy", 1, { other: 1 }),
  ];
  const secondPage = [group("list", "later", 1, { inappropriate: 1 })];

  const requests = [];
  await page.route(
    (url) => url.pathname === "/api/reports",
    (route) => {
      const url = new URL(route.request().url());
      requests.push(url.search);
      if (url.searchParams.get("skip") === "2") {
        return route.fulfill({
          json: { reports: secondPage, total: 3, hasMore: false },
        });
      }
      if (url.searchParams.get("type") === "user") {
        return route.fulfill({
          json: { reports: [firstPage[1]], total: 1, hasMore: false },
        });
      }
      return route.fulfill({
        json: { reports: firstPage, total: 3, hasMore: true },
      });
    },
  );
  await page.route("**/moderation/search-lists*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  const resolved = [];
  await page.route("**/api/reports/target", (route) => {
    const { targetType, targetId, status } = route.request().postDataJSON();
    resolved.push(`${status}/${targetType}/${targetId}`);
    return route.fulfill({ json: { ok: true, updated: 3 } });
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  const rows = page.locator(".lpModerationReport");
  await expect(rows).toHaveCount(2);

  // A target reported several times shows its count and its reasons; a single report shows no count.
  await expect(rows.nth(0).locator(".lpModerationReportCount")).toHaveText(
    "3 reports",
  );
  await expect(rows.nth(0)).toContainText("Spam ×2 · Fake or misleading");
  await expect(rows.nth(0)).toContainText("by rep1, rep2");
  await expect(rows.nth(1).locator(".lpModerationReportCount")).toHaveCount(0);

  // Load more adds the next page and the button goes away on the last page.
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("later");
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  expect(requests).toContain("?skip=2");

  // The type filter reloads from the first page with the filter in the request.
  await page.getByLabel("Filter reports by type").selectOption("user");
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("badguy");
  expect(requests[requests.length - 1]).toBe("?type=user");

  // Closing a target closes all its reports in one call.
  await rows.nth(0).getByRole("button", { name: "✓ Resolve" }).click();
  await expect(rows).toHaveCount(0);
  expect(resolved).toEqual(["resolved/user/badguy"]);
});
