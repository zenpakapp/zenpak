import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

import {
  getSharedUser,
  registerUser,
  loginUser,
  logoutUser,
} from "./auth-utils";

async function openAccountSettings(page) {
  await page.locator(".accountDropdownName").hover();
  await page.getByText("Account Settings").click();
}

test("has title", async ({ page }) => {
  await page.goto(testRoot);

  await expect(page).toHaveTitle(/ZenPak/);
  await expect(page).toHaveScreenshot();
});

test("welcome page prioritizes account creation while keeping sign in and skip visible", async ({
  page,
}) => {
  await page.goto(testRoot);

  await expect(
    page.getByRole("heading", { name: "Pack ready. Leave light." }),
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
  await expect(page.getByAltText("Gear library")).toBeVisible();
  await expect(
    page.getByText(
      "Create clear lists to organize your gear and share them with the community.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Gear library" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pack lists" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Community" })).toBeVisible();
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
  test("should save default currency from account settings", async ({
    page,
  }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `cur${now}`;
    const email = `cur+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await openAccountSettings(page);

    // Default currency is a custom select (lp-select) inside the "Default currency" field.
    const currencyField = page
      .locator("#accountSettings .profileSettingsField")
      .filter({ hasText: "Default currency" });
    const currencyDropdown = currencyField;
    const currencySelect = currencyField.locator("select");

    const saveResponse = page.waitForResponse(
      (response) => response.url().includes("/saveLibrary") && response.ok(),
      { timeout: 35000 },
    );
    await currencyDropdown.locator(".lpSelectTrigger").click();
    await currencyDropdown.locator(".lpSelectOption", { hasText: "€" }).click();
    await saveResponse;

    await page.reload();
    await openAccountSettings(page);
    await expect(currencySelect).toHaveValue("€");
  });

  test("should successfully register a new user", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `test${now}`;
    const email = `test+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await expect(page.locator(".accountDropdownName")).toHaveText(username);
    await expect(page.getByText(`Welcome ${username} to ZenPak`)).toBeVisible();
  });

  test("should successfully log in an existing user", async ({ page }) => {
    await page.goto(testRoot);

    const { username, password } = await getSharedUser(page);

    await loginUser(page, username, password);
    await expect(page.locator(".accountDropdownName")).toHaveText(username);
    await expect(page.getByText(`Welcome ${username} to ZenPak`)).toBeVisible();
    await expect(page).toHaveScreenshot();
  });

  test("should successfully log out", async ({ page }) => {
    await page.goto(testRoot);

    const { username, password } = await getSharedUser(page);

    await loginUser(page, username, password);
    await logoutUser(page);
    await expect(
      page.getByRole("heading").filter({ hasText: "Sign in" }),
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
    await openAccountSettings(page);

    const account = page.locator("#accountSettings");
    await account.locator('input[name="newPassword"]').fill(newPassword);
    await account.locator('input[name="confirmNewPassword"]').fill(newPassword);

    await account.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText("Please enter your current password."),
    ).toBeVisible();

    await account.locator('input[name="currentPassword"]').fill(password);

    await account.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading").filter({ hasText: "Account Settings" }),
    ).toBeHidden();

    await logoutUser(page);

    await expect(page.getByText(`Welcome ${username} to ZenPak`)).toBeHidden();

    await loginUser(page, username, newPassword);

    await expect(page.getByText(`Welcome ${username} to ZenPak`)).toBeVisible();
  });

  test("should successfully delete a user", async ({ page }) => {
    await page.goto(testRoot);

    const now = Date.now();
    const username = `del${now}`;
    const email = `del+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await openAccountSettings(page);
    await page.getByText("Delete account").click();
    await page.getByText("Permanently delete account").click();

    await expect(
      page.getByText("Please enter your current password."),
    ).toBeVisible();
    await expect(
      page.getByText("Please enter the confirmation text."),
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
      page.getByRole("heading").filter({ hasText: "Sign in" }),
    ).toBeVisible();
  });
});
