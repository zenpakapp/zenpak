import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// From the accounts block a moderator bans an account, sees that it is banned, and reinstates it.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a moderator bans and reinstates an account", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ba${now}`, "testtest", `ba+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search-lists*", (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route("**/moderation/search?*", (route) =>
    route.fulfill({
      json: {
        results: [
          {
            username: "alice",
            email: "a@example.com",
            library: {},
            banned: false,
            offer: null,
          },
          {
            username: "bob",
            email: "b@example.com",
            library: {},
            banned: true,
            offer: null,
          },
          {
            username: "mod",
            email: "m@example.com",
            library: {},
            banned: false,
            offer: null,
          },
        ],
      },
    }),
  );
  const calls = [];
  await page.route("**/api/reports/ban/*", (route) => {
    const name = route.request().url().split("/").pop();
    calls.push(`ban/${name}`);
    if (name === "mod") {
      return route.fulfill({
        status: 409,
        json: { message: "A moderator cannot be banned.", code: "moderator" },
      });
    }
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/reports/unban/*", (route) => {
    calls.push(`unban/${route.request().url().split("/").pop()}`);
    return route.fulfill({ json: { ok: true } });
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();
  await page.locator(".lp-moderation-search").fill("a");
  await page
    .locator(".lpModerationAccounts .lpModerationSearch button")
    .click();

  const results = page.locator(".lp-moderation-search-results");
  const account = page.locator(".lpModerationAccount");

  // An account in good standing can be banned, after a confirmation naming it.
  await results.getByText("alice").click();
  await expect(account.locator(".lp-moderation-banned")).toHaveCount(0);
  await expect(account.locator(".lp-moderation-unban-account")).toHaveCount(0);
  const messages = [];
  page.on("dialog", (dialog) => {
    messages.push(dialog.message());
    return dialog.accept();
  });
  await account.locator(".lp-moderation-ban-account").click();
  await expect(account.locator(".lp-moderation-banned")).toBeVisible();
  await expect(account.locator(".lp-moderation-ban-account")).toHaveCount(0);
  expect(messages).toEqual(["Ban @alice?"]);
  expect(calls).toEqual(["ban/alice"]);

  // A banned account is marked, and can be reinstated.
  await results.getByText("bob").click();
  await expect(account.locator(".lp-moderation-banned")).toBeVisible();
  await account.locator(".lp-moderation-unban-account").click();
  await expect(account.locator(".lp-moderation-banned")).toHaveCount(0);
  await expect(account.locator(".lp-moderation-ban-account")).toBeVisible();
  expect(calls).toEqual(["ban/alice", "unban/bob"]);

  // A moderator cannot be banned: the refusal is shown and the account stays as it was.
  await results.getByText("mod", { exact: true }).click();
  await account.locator(".lp-moderation-ban-account").click();
  await expect(page.locator(".lp-moderation-error")).toContainText(
    "moderator cannot be banned",
  );
  await expect(account.locator(".lp-moderation-banned")).toHaveCount(0);
});
