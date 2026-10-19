import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A moderator finds a published list by its name or its author, and features or unpublishes it
// from the moderation tab, without waiting for a report.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a moderator finds a list, features it and unpublishes it", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ml${now}`, "testtest", `ml+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search?*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  const queries = [];
  await page.route("**/moderation/search-lists*", (route) => {
    queries.push(new URL(route.request().url()).searchParams.get("q"));
    return route.fulfill({
      json: {
        results: [
          {
            externalId: "a1",
            name: "PCT 2026 summer",
            ownerUsername: "zenpak",
            featured: false,
          },
          {
            externalId: "b2",
            name: "Weekend light",
            ownerUsername: "bob",
            featured: true,
          },
        ],
      },
    });
  });
  const calls = [];
  await page.route("**/api/reports/feature/*", (route) => {
    calls.push(route.request().url().split("/").slice(-2).join("/"));
    return route.fulfill({ json: { ok: true, featured: true } });
  });
  await page.route("**/api/reports/unpublish/*", (route) => {
    calls.push(route.request().url().split("/").slice(-2).join("/"));
    return route.fulfill({ json: { ok: true } });
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  // The newest lists are there before anything is typed.
  const rows = page.locator(".lpModerationListRow");
  await expect(rows).toHaveCount(2);
  expect(queries[0]).toBe("");
  await expect(rows.nth(0)).toContainText("PCT 2026 summer");
  await expect(rows.nth(0)).toContainText("@zenpak");
  await expect(rows.nth(0).locator("a")).toHaveAttribute("href", "/p/a1");

  // A search asks the server for the typed text.
  await page.locator(".lp-moderation-list-search").fill("pct");
  await page.locator(".lpModerationLists form button").click();
  await expect.poll(() => queries.at(-1)).toBe("pct");

  // A list that is not featured can be, and the button says so.
  await expect(rows.nth(0).locator(".lp-moderation-list-featured")).toHaveCount(
    0,
  );
  await rows.nth(0).locator(".lp-moderation-list-feature").click();
  await expect(
    rows.nth(0).locator(".lp-moderation-list-featured"),
  ).toBeVisible();
  await expect(
    rows.nth(0).locator(".lp-moderation-list-feature"),
  ).toContainText("Unfeature");
  expect(calls).toContain("feature/a1");

  // Unpublishing asks first, then removes the row.
  page.once("dialog", (dialog) => dialog.accept());
  await rows.nth(1).locator(".lp-moderation-list-unpublish").click();
  await expect(rows).toHaveCount(1);
  expect(calls).toContain("unpublish/b2");
});
