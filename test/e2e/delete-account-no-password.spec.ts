import { test, expect } from "@playwright/test";
import config from "config";
import { MongoClient } from "mongodb";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// A Google account has no password. Its delete dialog asks only for the confirmation phrase, so the
// person can still erase their account.
test.use({ locale: "en-US" });

test("an account without a password deletes with the confirmation phrase only", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `np${now}`, "testtest", `np+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // The server says this account has no password; the deletion itself is answered by a stand-in.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: { username: `np${now}`, emailVerified: true, hasPassword: false },
    }),
  );
  let sentBody = null;
  await page.route("**/delete-account", (route) => {
    sentBody = route.request().postDataJSON();
    return route.fulfill({ json: { message: "success" } });
  });

  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");
  await page.getByText("Delete account").click();

  const dialog = page.locator("#deleteAccount");
  await expect(dialog.getByPlaceholder("Confirmation text")).toBeVisible();
  await expect(dialog.getByPlaceholder("Current password")).toHaveCount(0);

  await dialog.getByPlaceholder("Confirmation text").fill("delete my account");
  await page.getByText("Permanently delete account").click();

  await expect(
    page.getByRole("heading").filter({ hasText: "Sign in" }),
  ).toBeVisible();
  expect(sentBody.username).toBe(`np${now}`);
  expect(sentBody.password).toBe("");
});

// The real server, with a real account that has no password (what a Google sign-up creates).
test("the server deletes an account without a password, only for its own username", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `gg${now}`;
  const token = `tok${now}`;
  const databaseUrl = config.get("databaseUrl") as string;
  const client = new MongoClient(`mongodb://${databaseUrl}`);
  const users = client.db(databaseUrl.split("/").pop()).collection("users");
  try {
    await client.connect();
    await users.insertOne({
      username,
      email: `gg+${now}@lighterpack.com`,
      googleId: `google-${now}`,
      token,
      emailVerified: true,
      library: { version: "0.3", lists: [], categories: [], items: [] },
    });
    await page
      .context()
      .addCookies([{ name: "lp", value: token, url: testRoot }]);

    // Someone else's username is refused and nothing is deleted.
    const refused = await page.request.post(`${testRoot}delete-account`, {
      data: { username: "not-me", password: "" },
    });
    expect(refused.status()).toBe(400);
    expect(await users.countDocuments({ username })).toBe(1);

    // Its own username deletes it.
    const deleted = await page.request.post(`${testRoot}delete-account`, {
      data: { username, password: "" },
    });
    expect(deleted.status()).toBe(200);
    await expect
      .poll(() => users.countDocuments({ username }), { timeout: 10000 })
      .toBe(0);
  } finally {
    await users.deleteOne({ username });
    await client.close();
  }
});
