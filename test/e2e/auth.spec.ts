import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

import {
  getSharedUser,
  registerUser,
  loginUser,
  logoutUser
} from "./auth-utils";

test("has title", async ({ page }) => {
  await page.goto(testRoot);

  await expect(page).toHaveTitle(/LighterPack/);
  await expect(page).toHaveScreenshot();
});

test("welcome page prioritizes account creation while keeping sign in and skip visible", async ({
  page,
}) => {
  await page.goto(testRoot);

  await expect(
    page.getByRole("heading", { name: "Pack lighter. Hike further." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sign in" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Skip account for now" }),
  ).toBeVisible();
  await expect(
    page.getByAltText("LighterPack+ interface preview"),
  ).toBeVisible();
  await expect(
    page.getByText("Organize your gear library, compare pack setups, and keep category totals clear."),
  ).toBeVisible();
  await expect(
    page.getByText("Share lists with the community"),
  ).toBeVisible();
  await expect(page.getByText("Gear library", { exact: true })).toBeVisible();
  await expect(page.getByText("Pack analysis", { exact: true })).toBeVisible();
  await expect(page.getByText("Community sharing", { exact: true })).toBeVisible();
});

test("welcome page adapts key surfaces to dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(testRoot);

  const screenshotFrameBackground = await page
    .locator(".lpWelcomeScreenshotFrame")
    .evaluate((node) => getComputedStyle(node).backgroundImage);
  const mainTransitionBackground = await page
    .locator(".lpWelcomeMain")
    .evaluate((node) => getComputedStyle(node, "::before").backgroundImage);

  expect(screenshotFrameBackground).not.toContain("255, 255, 255");
  expect(mainTransitionBackground).not.toContain("248, 247, 245");
});

test.describe("User Authentication Tests", () => {
  test("should save default currency from account settings", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `cur${now}`;
    const email = `cur+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await page.getByText("Signed in as").hover();
    await page.getByText("Account Settings").click();

    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/saveLibrary") && response.ok(),
      { timeout: 35000 },
    );

    await page.getByLabel("Default currency").fill("€");
    await saveResponse;

    await page.reload();
    await page.getByText("Signed in as").hover();
    await page.getByText("Account Settings").click();
    await expect(page.getByLabel("Default currency")).toHaveValue("€");
  });

  test("should successfully register a new user", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `test${now}`;
    const email = `test+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await expect(page.getByText(`Signed in as ${username}`)).toBeVisible();
    await expect(page.getByText("Welcome to LighterPack!")).toBeVisible();
  });

  test("should successfully log in an existing user", async ({ page }) => {
    await page.goto(testRoot);

    const { username, password } = await getSharedUser(page);

    await loginUser(page, username, password);
    await expect(page.getByText(`Signed in as ${username}`)).toBeVisible();
    await expect(page.getByText("Welcome to LighterPack!")).toBeVisible();
    await expect(page).toHaveScreenshot();
  });

  test("should successfully log out", async ({ page }) => {
    await page.goto(testRoot);

    const { username, password } = await getSharedUser(page);

    await loginUser(page, username, password);
    await logoutUser(page);
    await expect(
      page.getByRole("heading").filter({ hasText: "Sign in" })
    ).toBeVisible();
  });

  test("should successfully change password", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `pw${now}`;
    const email = `pw+${now}@lighterpack.com`;
    const password = "testtest";
    const newPassword = "testtest2";

    await registerUser(page, username, password, email);
    await page.getByText("Signed in as").hover();
    await page.getByText("Account Settings").click();

    await page
      .getByPlaceholder("New Password", { exact: true })
      .fill(newPassword);
    await page.getByPlaceholder("Confirm New Password").fill(newPassword);

    await page.getByText("Submit").click();

    await expect(
      page.getByText("Please enter your current password.")
    ).toBeVisible();

    await page
      .locator("#accountSettings")
      .getByPlaceholder("Current password")
      .fill(password);

    await page.getByText("Submit").click();
    await expect(
      page.getByRole("heading").filter({ hasText: "Account Settings" })
    ).toBeHidden();

    await logoutUser(page);

    await expect(page.getByText("Welcome to LighterPack!")).toBeHidden();

    await loginUser(page, username, newPassword);

    await expect(page.getByText("Welcome to LighterPack!")).toBeVisible();
  });

  test("should successfully delete a user", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `del${now}`;
    const email = `del+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await page.getByText("Signed in as").hover();
    await page.getByText("Account Settings").click();
    await page.getByText("Delete Account").click();
    await page.getByText("Permanently delete account").click();

    await expect(
      page.getByText("Please enter your current password.")
    ).toBeVisible();
    await expect(
      page.getByText("Please enter the confirmation text.")
    ).toBeVisible();

    await page
      .locator("#deleteAccount")
      .getByPlaceholder("Current password")
      .fill(password);
    await page
      .locator("#deleteAccount")
      .getByPlaceholder("Confirmation text")
      .fill("delete my account");

    await page.getByText("Permanently delete account").click();
    await expect(
      page.getByRole("heading").filter({ hasText: "Sign in" })
    ).toBeVisible();
  });
});
