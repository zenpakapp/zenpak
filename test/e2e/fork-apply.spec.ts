import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isPublish = (response) =>
  response.url().endsWith("/publish") &&
  response.request().method() === "POST" &&
  response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

// A publishes v1 (Tent 880), B copies it, A changes the weight to 800 and publishes v2.
// `copierEdit` runs on B's page before v2 is published.
async function setup(browser, prefix, copierEdit?) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const author = `${prefix}a${now}`;
  const copier = `${prefix}b${now}`;
  const password = "testtest";

  const authorContext = await browser.newContext();
  const copierContext = await browser.newContext();
  const authorPage = await authorContext.newPage();
  const copierPage = await copierContext.newPage();
  const close = async () => {
    await authorContext.close();
    await copierContext.close();
  };

  await registerUser(
    authorPage,
    author,
    password,
    `${prefix}+a${now}@lighterpack.com`,
  );
  await verifyUserEmail(author);
  await authorPage.getByPlaceholder("List Name").fill("Fork apply list");
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

  await registerUser(
    copierPage,
    copier,
    password,
    `${prefix}+b${now}@lighterpack.com`,
  );
  await expect(copierPage.locator(".accountDropdownName")).toBeVisible();
  await copierPage.goto(shareUrl);
  const copySaved = copierPage.waitForResponse(isSuccessfulSave, {
    timeout: 35000,
  });
  await copierPage.getByRole("button", { name: /Copy list/ }).click();
  await expect(copierPage.getByPlaceholder("List Name")).toHaveValue(
    "Fork apply list",
    { timeout: 20000 },
  );
  await copySaved;
  await expect(copierPage.locator(".lpForkUpdateBanner")).toHaveCount(0);

  if (copierEdit) await copierEdit(copierPage);

  const editSaved = authorPage.waitForResponse(isSuccessfulSave, {
    timeout: 35000,
  });
  await authorPage.locator(".lpItem .lpWeight").first().fill("800");
  await editSaved;
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

  return { copierPage, close };
}

test.describe("Fork apply", () => {
  test("applies an update to an untouched copy, then undoes it", async ({
    browser,
  }) => {
    test.setTimeout(150000);
    const { copierPage, close } = await setup(browser, "applya");
    try {
      await copierPage.reload();
      const banner = copierPage.locator(".lpForkUpdateBanner");
      await expect(banner).toBeVisible({ timeout: 20000 });
      const updateButton = banner.getByRole("button", {
        name: /Update to v2/,
      });
      await expect(updateButton).toBeEnabled();
      const applySaved = copierPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await updateButton.click();
      await applySaved;
      await expect(banner).toBeHidden();
      await expect(copierPage.locator(".lpForkUndoBanner")).toContainText(
        "Updated to v2",
      );
      await expect(copierPage.locator(".lpItem .lpWeight").first()).toHaveValue(
        "800",
      );

      await copierPage.reload();
      await expect(copierPage.locator(".lpItem .lpWeight").first()).toHaveValue(
        "800",
        { timeout: 20000 },
      );
      await expect(banner).toBeHidden();

      const undoSaved = copierPage.waitForResponse(isSuccessfulSave, {
        timeout: 35000,
      });
      await copierPage
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      await copierPage
        .locator("#speedbump")
        .getByRole("button", { name: "Yes", exact: true })
        .click();
      await expect(copierPage.locator(".lpItem .lpWeight").first()).toHaveValue(
        "880",
      );
      await undoSaved;

      await copierPage.reload();
      await expect(copierPage.locator(".lpItem .lpWeight").first()).toHaveValue(
        "880",
        { timeout: 20000 },
      );
      await expect(banner).toBeVisible({ timeout: 20000 });
    } finally {
      await close();
    }
  });

  test("a modified copy cannot be updated but can still view changes", async ({
    browser,
  }) => {
    test.setTimeout(150000);
    const { copierPage, close } = await setup(
      browser,
      "applyb",
      async (page) => {
        const saved = page.waitForResponse(isSuccessfulSave, {
          timeout: 35000,
        });
        await page.locator(".lpItem .lpWeight").first().fill("700");
        await saved;
      },
    );
    try {
      await copierPage.reload();
      const banner = copierPage.locator(".lpForkUpdateBanner");
      await expect(banner).toBeVisible({ timeout: 20000 });
      await expect(
        banner.getByRole("button", { name: /Update to v2/ }),
      ).toBeDisabled();
      await expect(banner.locator(".lpForkApplyNote")).toContainText(
        "You changed this list",
      );
      await banner.getByRole("button", { name: "View changes" }).click();
      await expect(copierPage.locator("#forkDiffDialog")).toBeVisible();
    } finally {
      await close();
    }
  });
});
