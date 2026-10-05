import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isSuccessfulExternalId = (response) =>
  response.url().includes("/externalId") && response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

test.describe("List tests", () => {
  test("should successfully get an external ID", async ({ page }) => {
    const now = Date.now();
    const username = `id${now}`;
    const email = `id+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    // Unverified accounts cannot make lists public, so sharing would 403.
    await verifyUserEmail(username);

    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, {
      timeout: 35000,
    });
    await page.getByText("Share", { exact: true }).hover();
    await externalIdResponse;

    const shareUrlLocator = page.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });
    const shareUrl = await shareUrlLocator.inputValue();

    await expect(async () => {
      const response = await page.request.get(shareUrl);
      expect(response.status()).toBe(200);
    }).toPass();
    await page.goto(shareUrl);
  });

  test("should save list name", async ({ page }) => {
    const now = Date.now();
    const username = `name${now}`;
    const email = `name+${now}@lighterpack.com`;
    const password = "testtest";
    const listName = "Test List Name";

    await registerUser(page, username, password, email);
    // Unverified accounts cannot make lists public, so sharing would 403.
    await verifyUserEmail(username);

    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, {
      timeout: 35000,
    });
    await page.getByText("Share", { exact: true }).hover();
    await externalIdResponse;

    const shareUrlLocator = page.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });
    const shareUrl = await shareUrlLocator.inputValue();

    const saveResponse = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.getByPlaceholder("List Name").fill(listName);
    await saveResponse;

    // The public page serves the last published version: a rename is public only after Publish.
    await page.getByText("Share", { exact: true }).hover();
    const publishResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/publish") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 35000 },
    );
    await page.locator(".sharePublishButton").click();
    await publishResponse;

    await expect(async () => {
      const response = await page.request.get(shareUrl);
      expect(response.status()).toBe(200);
    }).toPass();

    await page.goto(shareUrl);
    await expect(
      page.getByRole("heading").filter({ hasText: listName }),
    ).toBeVisible();
  });
});
