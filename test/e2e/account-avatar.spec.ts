import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The account menu in the header shows an avatar next to the name (the photo if there is one,
// the initial on a coloured disc otherwise). When the header is crowded, or on a phone, the
// avatar stands alone: the name stays in the menu, in a tooltip and in the accessible name.
test.use({ locale: "en-US" });

async function signUp(page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `av${now}`;
  await registerUser(page, username, "testtest", `av+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  return username;
}

test("the account menu shows the initial when there is no photo", async ({
  page,
}) => {
  test.setTimeout(60000);
  const username = await signUp(page);
  const avatar = page.locator(".accountDropdownTarget .accountDropdownAvatar");
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveText(username.charAt(0).toUpperCase());
  const color = await avatar.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
  // With room to spare the name stays next to it.
  await expect(page.locator(".accountDropdownName")).toBeVisible();
  await expect(page.locator(".accountDropdownName")).toHaveText(username);
});

test("the account menu shows the photo when there is one", async ({ page }) => {
  test.setTimeout(60000);
  await signUp(page);
  await page.evaluate(() => {
    window.LighterPack.$store.state.library.publicProfile.avatarUrl =
      "/brand/zenpak-z-app.svg";
  });
  const photo = page.locator(".accountDropdownAvatar img");
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", "/brand/zenpak-z-app.svg");
  await expect(page.locator(".accountDropdownAvatar")).not.toHaveText(/\S/);
});

test("the avatar stands alone when the header is crowded", async ({ page }) => {
  test.setTimeout(60000);
  const username = await signUp(page, 1100);
  // Wayfarer link plus a shared list with unpublished changes: the widest header there is.
  await page.evaluate(() => {
    const { state } = window.LighterPack.$store;
    state.library.entitlements = { plan: "creator" };
    state.hasPendingSave = true;
    for (const l of Object.values(state.library.lists || {})) {
      l.visibility = "shareable";
      l.externalId = "abc123";
    }
  });
  await expect(page.locator("#header.lpHeaderAvatarOnly")).toHaveCount(1);
  await expect(page.locator(".accountDropdownAvatar")).toBeVisible();
  await expect(page.locator(".accountDropdownName")).toBeHidden();

  // The name is still available: in the accessible name, the tooltip and the menu.
  const target = page.locator(".accountDropdownTarget");
  await expect(target).toHaveAttribute("aria-label", new RegExp(username));
  await expect(target).toHaveAttribute("title", username);
  await target.hover();
  await expect(page.locator(".accountDropdownUsername")).toHaveText(username);
});

test("on a phone the account menu is the avatar", async ({ page }) => {
  test.setTimeout(60000);
  await signUp(page, 375);
  await expect(page.locator(".accountDropdownAvatar")).toBeVisible();
  await expect(page.locator(".accountDropdownName")).toBeHidden();
});
