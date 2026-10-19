import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The ban button of a report targets an account the moderator can see: the reported user, or the
// author of the reported list. Nothing has to be typed, and a list with no author left has none.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("banning from a list report bans the list's author", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `mb${now}`, "testtest", `mb+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  const report = (id, targetType, targetId, targetOwnerUsername?) => ({
    _id: id,
    targetType,
    targetId,
    targetOwnerUsername,
    reason: "spam",
    reporterUsername: "rep",
    createdAt: new Date().toISOString(),
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({
      json: {
        reports: [
          report("r1", "list", "list1", "alice"),
          report("r2", "list", "list2", null),
          report("r3", "user", "carol"),
        ],
      },
    }),
  );
  await page.route("**/moderation/search-lists*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  const calls = [];
  await page.route("**/api/reports/ban/*", (route) => {
    calls.push(`ban/${route.request().url().split("/").pop()}`);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/reports/r*", (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    calls.push(`resolve/${route.request().url().split("/").pop()}`);
    return route.fulfill({ json: { ok: true } });
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();

  const rows = page.locator(".lpModerationReport");
  await expect(rows).toHaveCount(3);

  // The ban says who it bans. A list with no published author has no ban button.
  await expect(rows.nth(0).locator(".lp-moderation-ban")).toContainText(
    "@alice",
  );
  await expect(rows.nth(1).locator(".lp-moderation-ban")).toHaveCount(0);
  await expect(rows.nth(2).locator(".lp-moderation-ban")).toContainText(
    "@carol",
  );

  // It asks to confirm the account, without asking to type a name, then resolves the report.
  // The confirmation is the app's own box, never the browser's.
  page.on("dialog", () => {
    throw new Error("a native dialog opened");
  });
  await rows.nth(0).locator(".lp-moderation-ban").click();
  const confirmBox = page.locator("#confirmDialog");
  await expect(confirmBox).toContainText("Ban @alice?");
  expect(calls).toEqual([]);
  await confirmBox.locator(".lp-confirm-ok").click();
  await expect(rows).toHaveCount(2);
  expect(calls).toEqual(["ban/alice", "resolve/r1"]);
});
