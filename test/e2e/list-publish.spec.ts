import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isPublish = (response) =>
  response.url().endsWith("/publish") &&
  response.request().method() === "POST" &&
  response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

async function publicListName(page, externalId) {
  const response = await page.request.get(`/api/public/list/${externalId}`);
  expect(response.status()).toBe(200);
  return (await response.json()).list.name;
}

test.describe("List publishing", () => {
  test("flags unpublished changes after an edit and republishes as v2", async ({
    page,
  }) => {
    const now = Date.now();
    const username = `pub${now}`;
    await registerUser(
      page,
      username,
      "testtest",
      `pub+${now}@lighterpack.com`,
    );
    // Unverified accounts cannot make lists public, so sharing would 403.
    await verifyUserEmail(username);

    const firstPublish = page.waitForResponse(isPublish, { timeout: 35000 });
    await page.getByText("Share", { exact: true }).hover();
    await firstPublish;

    const state = page.locator(".sharePublishState");
    await expect(state).toHaveText("Published v1", { timeout: 15000 });

    const shareUrlLocator = page.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });
    const externalId = (await shareUrlLocator.inputValue()).split("/p/")[1];
    const publishedName = await publicListName(page, externalId);

    const saveResponse = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.getByPlaceholder("List Name").fill("Edited after publish");
    await saveResponse;

    await expect(state).toHaveText("Unpublished changes", { timeout: 15000 });
    expect(await publicListName(page, externalId)).toBe(publishedName);

    await page.getByText("Share", { exact: true }).hover();
    const secondPublish = page.waitForResponse(isPublish, { timeout: 35000 });
    await page.locator(".sharePublishButton").click();
    await secondPublish;

    await expect(state).toHaveText("Published v2", { timeout: 15000 });
    expect(await publicListName(page, externalId)).toBe("Edited after publish");
  });
});
