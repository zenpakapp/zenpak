import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";
import { verifyUserEmail } from "./auth-utils";

const isSuccessfulExternalId = (response) =>
  response.url().includes("/externalId") && response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

test.describe("LighterPack+ public sharing", () => {
  test("publishes an indexable list through the improved public route", async ({
    page,
  }) => {
    test.setTimeout(60000);

    const now = Date.now();
    const username = `plus${now}`;
    const email = `plus+${now}@lighterpack.com`;
    const password = "testtest";

    const registerResponse = await page.request.post(`${testRoot}register`, {
      data: { username, email, password },
    });
    expect(registerResponse.ok()).toBeTruthy();
    // Unverified accounts cannot make lists public, so verify before the editor loads.
    await verifyUserEmail(username);

    await page.goto(testRoot);
    await expect(page.locator(".accountDropdownName")).toHaveText(username, {
      timeout: 35000,
    });
    await expect(page.getByPlaceholder("List Name")).toBeVisible({
      timeout: 35000,
    });

    // A list created through the API starts unnamed; name it so the public heading has text.
    const nameSaved = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.getByPlaceholder("List Name").fill("Plus public list");
    await nameSaved;

    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, {
      timeout: 35000,
    });
    await page.getByText("Share", { exact: true }).hover();
    await externalIdResponse;

    const shareUrlLocator = page.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });

    // "Public + Search engines" is the indexable visibility.
    const visibilitySave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#listVisibility").selectOption("indexable");
    await visibilitySave;

    const shareUrl = await shareUrlLocator.inputValue();
    expect(shareUrl).toContain("/p/");

    await page.goto(shareUrl);
    await expect(
      page.getByRole("heading", { name: "Plus public list" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
});
