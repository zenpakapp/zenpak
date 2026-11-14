import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

test("navigates to /community from nav link", async ({ page }) => {
  const now = Date.now();
  await registerUser(
    page,
    `comm${now}`,
    "testtest",
    `comm+${now}@lighterpack.com`,
  );
  // exact: the welcome copy also has an "Explore community" link.
  const communityLink = page.getByRole("link", {
    name: "Community",
    exact: true,
  });
  await communityLink.waitFor({ state: "visible" });
  await communityLink.click();
  await expect(page).toHaveURL(/\/community/);
});

// The feed is for signed-in users: a logged-out visitor is sent to /welcome by the
// auth guard, so this checks the alias with a signed-in user.
test("redirects /feed to /community/feed", async ({ page }) => {
  const now = Date.now();
  await registerUser(
    page,
    `feed${now}`,
    "testtest",
    `feed+${now}@lighterpack.com`,
  );
  await page.locator(".accountDropdownName").waitFor();
  await page.goto(`${testRoot}feed`);
  await expect(page).toHaveURL(/\/community\/feed/);
});

// The People tab has its own address: the link opens it, a reload keeps it, and a visitor who
// is not signed in can use it too.
test("/community/people opens the People tab, signed out as well", async ({
  page,
}) => {
  await page.goto(`${testRoot}community/people`);
  await expect(page).toHaveURL(/\/community\/people$/);
  await expect(page.locator(".lpCommunitySearchInput")).toBeVisible();
  await expect(page.getByRole("button", { name: "People" })).toHaveClass(
    /active/,
  );
  await page.reload();
  await expect(page.locator(".lpCommunitySearchInput")).toBeVisible();
});

test("choosing the People tab puts its address in the URL", async ({
  page,
}) => {
  await page.goto(`${testRoot}community`);
  await page.getByRole("button", { name: "People" }).click();
  await expect(page).toHaveURL(/\/community\/people$/);
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/community$/);
});
