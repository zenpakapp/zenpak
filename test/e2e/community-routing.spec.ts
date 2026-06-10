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
  const communityLink = page.getByRole("link", { name: "Community" });
  await communityLink.waitFor({ state: "visible" });
  await communityLink.click();
  await expect(page).toHaveURL(/\/community/);
});

test("redirects /feed to /community/feed", async ({ page }) => {
  await page.goto(`${testRoot}feed`);
  await expect(page).toHaveURL(/\/community\/feed/);
});
