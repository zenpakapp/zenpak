import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isPublish = (response) =>
  response.url().endsWith("/publish") &&
  response.request().method() === "POST" &&
  response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

// A publishes a list, B copies it with the real button, A edits and publishes v2,
// B opens "View changes" from the banner. Everything goes through the UI.
test.describe("Fork diff", () => {
  test("a copy sees what changed in the original between v1 and v2", async ({
    browser,
  }) => {
    test.setTimeout(150000);
    // Random suffix: parallel runs of this test can start in the same millisecond.
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const author = `diffa${now}`;
    const copier = `diffb${now}`;
    const password = "testtest";

    const authorContext = await browser.newContext();
    const copierContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    const copierPage = await copierContext.newPage();

    try {
      // A: a list with one item, shared and published as v1, copying allowed
      await registerUser(
        authorPage,
        author,
        password,
        `diff+a${now}@lighterpack.com`,
      );
      await verifyUserEmail(author);
      await authorPage.getByPlaceholder("List Name").fill("Fork diff list");
      await authorPage.locator(".lpAddItem").first().click();
      await authorPage.locator(".lpAddItemInput").first().fill("Tent");
      await authorPage.locator(".lpAddItemInput").first().press("Enter");
      await expect(authorPage.locator(".lpItem .lpName").first()).toHaveValue(
        "Tent",
      );
      const weightSaved = authorPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await authorPage.locator(".lpItem .lpWeight").first().fill("880");
      await weightSaved;

      const firstPublish = authorPage.waitForResponse(isPublish, {
        timeout: 35000,
      });
      await authorPage.getByText("Share", { exact: true }).hover();
      await firstPublish;
      const publishState = authorPage.locator(".sharePublishState");
      await expect(publishState).toHaveText("Published v1", { timeout: 15000 });
      const copyAllowed = authorPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await authorPage.getByLabel("Allow others to copy this list").check();
      await copyAllowed;
      const shareUrlLocator = authorPage.locator("#shareUrl");
      await expect(shareUrlLocator).toHaveValue(/\/p\//, { timeout: 35000 });
      const shareUrl = await shareUrlLocator.inputValue();

      // B: copies the list with the real button
      await registerUser(
        copierPage,
        copier,
        password,
        `diff+b${now}@lighterpack.com`,
      );
      await expect(copierPage.locator(".accountDropdownName")).toBeVisible();
      await copierPage.goto(shareUrl);
      const copySaved = copierPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await copierPage.getByRole("button", { name: /Copy list/ }).click();
      await expect(copierPage.getByPlaceholder("List Name")).toHaveValue(
        "Fork diff list",
        { timeout: 20000 },
      );
      await copySaved;
      await expect(copierPage.locator(".lpForkUpdateBanner")).toHaveCount(0);

      // A: edits the tent weight, adds a pad, republishes as v2
      const editSaved = authorPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await authorPage.locator(".lpItem .lpWeight").first().fill("700");
      await editSaved;
      await authorPage.locator(".lpAddItem").first().click();
      await authorPage.locator(".lpAddItemInput").first().fill("Pad");
      const padSaved = authorPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await authorPage.locator(".lpAddItemInput").first().press("Enter");
      await padSaved;
      await expect(publishState).toHaveText("Unpublished changes", {
        timeout: 15000,
      });
      await authorPage.getByText("Share", { exact: true }).hover();
      const secondPublish = authorPage.waitForResponse(isPublish, {
        timeout: 35000,
      });
      await authorPage.locator(".sharePublishButton").click();
      await secondPublish;
      await expect(publishState).toHaveText("Published v2", { timeout: 15000 });

      // B: banner, then the diff dialog
      await copierPage.goto("/");
      await expect(copierPage.locator(".lpForkUpdateBanner")).toBeVisible({
        timeout: 20000,
      });
      await copierPage.getByRole("button", { name: "View changes" }).click();
      await expect(
        copierPage.getByRole("heading", { name: "Changes from v1 to v2" }),
      ).toBeVisible();
      const dialogText = await copierPage.locator("body").innerText();
      expect(dialogText).toContain("Added");
      expect(dialogText).toContain("Pad");
      expect(dialogText).toContain("Modified");
      expect(dialogText).toMatch(/Weight: 880(\.\d+)? oz → 700(\.\d+)? oz/);

      // A unshares: B reopens the dialog without reloading and gets an error, not a spinner
      await copierPage.keyboard.press("Escape");
      await authorPage.getByText("Share", { exact: true }).hover();
      const unshared = authorPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await authorPage.locator("#listVisibility").selectOption("private");
      await unshared;
      await copierPage.getByRole("button", { name: "View changes" }).click();
      await expect(
        copierPage.getByText("Could not load the changes"),
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await authorContext.close();
      await copierContext.close();
    }
  });
});
