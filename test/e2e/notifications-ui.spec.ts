import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The bell: a badge with what is unread, the list, a click that opens the person's profile,
// "mark all read", "clear", and the two preferences.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the bell lists alerts, opens a profile, and manages them", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `nu${now}`, "testtest", `nu+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const state = {
    notifications: [
      {
        _id: "n1",
        type: "follow",
        actorUsername: "bob",
        actorDisplayName: "Bob Trail",
        read: false,
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        _id: "n2",
        type: "copy",
        actorUsername: "carol",
        actorDisplayName: "Carol",
        listName: "PCT Section J",
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: "n3",
        type: "follow",
        actorUsername: "dave",
        actorDisplayName: "Dave",
        read: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        _id: "n4",
        type: "moderation",
        listName: "Big list",
        read: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    prefs: { follow: true, copy: true },
  };
  const calls = [];
  await page.route(/\/api\/notifications/, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/notifications/read-all") {
      calls.push("read-all");
      state.notifications.forEach((n) => (n.read = true));
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/notifications/prefs") {
      calls.push(`prefs ${request.postData()}`);
      state.prefs = JSON.parse(request.postData());
      return route.fulfill({ json: { prefs: state.prefs } });
    }
    if (request.method() === "DELETE") {
      calls.push("clear");
      state.notifications = [];
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      json: {
        notifications: state.notifications,
        unreadCount: state.notifications.filter((n) => !n.read).length,
        prefs: state.prefs,
      },
    });
  });
  // The profile page it opens.
  await page.route("**/api/public/profile/*", (route) =>
    route.fulfill({ status: 404, json: { message: "Profile not found" } }),
  );

  // Reload so the bell loads the mocked alerts.
  await page.reload();
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const bell = page.locator(".lpNotifBell");
  await expect(bell.locator(".lpNotifBadge")).toHaveText("2");

  await bell.click();
  const items = page.locator(".lpNotifItem");
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText("Bob Trail");
  await expect(items.nth(1)).toContainText("Carol");
  await expect(items.nth(1)).toContainText("PCT Section J");
  await expect(items.nth(0)).toHaveClass(/unread/);
  await expect(items.nth(2)).not.toHaveClass(/unread/);

  // A moderation notice names the list, has no person behind it, and is not a link.
  await expect(items.nth(3)).toContainText(
    'Your list "Big list" was removed from the community',
  );
  await expect(items.nth(3)).not.toHaveClass(/clickable/);

  // The preferences are saved as they are toggled.
  await page.locator(".lpNotifPrefs input").nth(1).uncheck();
  await expect.poll(() => calls.at(-1)).toContain('"copy":false');
  await expect(page.locator(".lpNotifPrefs input").nth(1)).not.toBeChecked();
  await page.locator(".lpNotifPrefs input").nth(1).check();

  // Mark all read: the badge goes, the unread tint too.
  await page.getByRole("button", { name: /mark all read/i }).click();
  await expect(bell.locator(".lpNotifBadge")).toHaveCount(0);
  await expect(page.locator(".lpNotifItem.unread")).toHaveCount(0);
  expect(calls).toContain("read-all");

  // A click on an alert opens the profile of the person, and closes the list.
  await items.nth(0).click();
  await expect(page).toHaveURL(/\/u\/bob$/);
  await expect(page.locator(".lpNotifDropdown")).toHaveCount(0);

  // Clear empties the list.
  await page.goto("/");
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await bell.click();
  await page.getByRole("button", { name: /clear/i }).click();
  await expect(items).toHaveCount(0);
  await expect(page.locator(".lpNotifEmpty")).toBeVisible();
  expect(calls).toContain("clear");
});

// No mocks: somebody follows an account, and that account sees it in its bell.
test("a follow reaches the person followed", async ({ browser }) => {
  test.setTimeout(90000);
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const followed = `nf${stamp}`;
  const follower = `nr${stamp}`;

  const followedContext = await browser.newContext({ locale: "en-US" });
  const followedPage = await followedContext.newPage();
  await registerUser(
    followedPage,
    followed,
    "testtest",
    `${followed}@lighterpack.com`,
  );
  await expect(followedPage.locator("#header")).toBeVisible({
    timeout: 35000,
  });

  const followerContext = await browser.newContext({ locale: "en-US" });
  const followerPage = await followerContext.newPage();
  await registerUser(
    followerPage,
    follower,
    "testtest",
    `${follower}@lighterpack.com`,
  );
  await expect(followerPage.locator("#header")).toBeVisible({
    timeout: 35000,
  });
  const response = await followerPage.request.post(
    `/api/community/follow/${followed}`,
    { data: { mode: "all" } },
  );
  expect(response.ok()).toBe(true);

  // The followed account sees it, with the follower's name, and one unread alert.
  await followedPage.reload();
  await expect(followedPage.locator("#header")).toBeVisible({
    timeout: 35000,
  });
  const bell = followedPage.locator(".lpNotifBell");
  await expect(bell.locator(".lpNotifBadge")).toHaveText("1", {
    timeout: 15000,
  });
  await bell.click();
  const item = followedPage.locator(".lpNotifItem");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(follower);
  await expect(item).toHaveClass(/unread/);

  // Following again straight away does not alert twice.
  await followerPage.request.delete(`/api/community/follow/${followed}`);
  await followerPage.request.post(`/api/community/follow/${followed}`, {
    data: { mode: "all" },
  });
  await followedPage.reload();
  await followedPage.locator(".lpNotifBell").click();
  await expect(followedPage.locator(".lpNotifItem")).toHaveCount(1);

  await followedContext.close();
  await followerContext.close();
});
