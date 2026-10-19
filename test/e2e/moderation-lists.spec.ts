import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A moderator finds a published list by its name or its author, sees which ones are featured,
// and features or unpublishes them from the moderation tab, without waiting for a report.
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

  // A small catalogue the mocked server filters like the real one.
  const state = { a1: false, b2: true };
  const names = { a1: "PCT 2026 summer", b2: "Weekend light" };
  const authors = { a1: "zenpak", b2: "bob" };
  const queries = [];
  const featuredFilters = [];
  await page.route("**/moderation/search-lists*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    queries.push(params.get("q"));
    featuredFilters.push(params.get("featured"));
    const results = Object.keys(state)
      .filter((id) => params.get("featured") !== "1" || state[id])
      .map((id) => ({
        externalId: id,
        name: names[id],
        ownerUsername: authors[id],
        featured: state[id],
      }));
    return route.fulfill({ json: { results } });
  });
  const calls = [];
  await page.route("**/api/reports/feature/*", (route) => {
    const id = route.request().url().split("/").pop();
    calls.push(`feature/${id}`);
    state[id] = !state[id];
    return route.fulfill({ json: { ok: true, featured: state[id] } });
  });
  await page.route("**/api/reports/unpublish/*", (route) => {
    calls.push(`unpublish/${route.request().url().split("/").pop()}`);
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

  // The featured lists are marked, and the others can be featured.
  const star = ".lp-moderation-list-featured";
  await expect(rows.nth(0).locator(star)).toHaveCount(0);
  await expect(rows.nth(1).locator(star)).toBeVisible();
  await rows.nth(0).locator(".lp-moderation-list-feature").click();
  await expect(rows.nth(0).locator(star)).toBeVisible();
  await expect(
    rows.nth(0).locator(".lp-moderation-list-feature"),
  ).toContainText("Unfeature");
  expect(calls).toContain("feature/a1");

  // The featured view lists only the featured lists, and one that stops being featured leaves it.
  await page.locator(".lp-moderation-list-featured-only").check();
  await expect.poll(() => featuredFilters.at(-1)).toBe("1");
  await expect(rows).toHaveCount(2);
  await rows.nth(0).locator(".lp-moderation-list-feature").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("Weekend light");
  await page.locator(".lp-moderation-list-featured-only").uncheck();
  await expect(rows).toHaveCount(2);

  // Unpublishing asks first, then removes the row.
  page.once("dialog", (dialog) => dialog.accept());
  await rows.nth(1).locator(".lp-moderation-list-unpublish").click();
  await expect(rows).toHaveCount(1);
  expect(calls).toContain("unpublish/b2");
});
