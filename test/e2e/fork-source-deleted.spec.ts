import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isPublish = (response) =>
  response.url().endsWith("/publish") &&
  response.request().method() === "POST" &&
  response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

// A publishes a list and B copies it. A then deletes their account. B keeps the whole copy, and the
// source line says the source is gone instead of linking to a page that cannot open.
test("a copy keeps its content and says its source is gone after the author deletes their account", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const author = `srca${now}`;
  const copier = `srcb${now}`;
  const password = "testtest";

  const authorContext = await browser.newContext();
  const copierContext = await browser.newContext();
  const authorPage = await authorContext.newPage();
  const copierPage = await copierContext.newPage();

  try {
    await registerUser(
      authorPage,
      author,
      password,
      `src+a${now}@lighterpack.com`,
    );
    await verifyUserEmail(author);
    await authorPage.getByPlaceholder("List Name").fill("Source list");
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

    const published = authorPage.waitForResponse(isPublish, { timeout: 35000 });
    await authorPage.getByText("Share", { exact: true }).hover();
    await published;
    await expect(authorPage.locator(".sharePublishState")).toHaveText(
      "Published v1",
      { timeout: 15000 },
    );
    const copyAllowed = authorPage.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await authorPage.getByLabel("Allow others to copy this list").check();
    await copyAllowed;
    const shareUrlLocator = authorPage.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\/p\//, { timeout: 35000 });
    const shareUrl = await shareUrlLocator.inputValue();

    // B copies it with the real button.
    await registerUser(
      copierPage,
      copier,
      password,
      `src+b${now}@lighterpack.com`,
    );
    await expect(copierPage.locator(".accountDropdownName")).toBeVisible();
    await verifyUserEmail(copier);
    await copierPage.goto(shareUrl);
    const copySaved = copierPage.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await copierPage.getByRole("button", { name: /Copy list/ }).click();
    await expect(copierPage.getByPlaceholder("List Name")).toHaveValue(
      "Source list",
      { timeout: 20000 },
    );
    await copySaved;

    // While the author exists, the source is a link.
    await copierPage.goto("/");
    await expect(copierPage.locator(".lpForkSource")).toContainText(
      "Source list",
    );
    await expect(copierPage.locator(".lpForkSourceLink").first()).toBeVisible();
    await expect(copierPage.locator(".lpForkSourceGone")).toHaveCount(0);

    // A deletes their account.
    const deleted = await authorPage.request.post("/delete-account", {
      data: { username: author, password },
    });
    expect(deleted.status()).toBe(200);

    // B reloads: the copy and its item are intact, the source is plain text and says it is gone.
    await copierPage.goto("/");
    await expect(copierPage.locator(".lpForkSourceGone")).toHaveText(
      "(no longer available)",
      { timeout: 20000 },
    );
    await expect(
      copierPage.locator(".lpForkSource .lpForkSourceLink"),
    ).toHaveCount(0);
    await expect(copierPage.locator(".lpForkSource")).toContainText(
      "Source list",
    );
    await expect(copierPage.getByPlaceholder("List Name")).toHaveValue(
      "Source list",
    );
    await expect(copierPage.locator(".lpItem .lpName").first()).toHaveValue(
      "Tent",
    );

    // B publishes the copy: its public page says the same, with no link to the gone source.
    await copierPage.getByText("Share", { exact: true }).hover();
    await expect(copierPage.locator(".sharePublishState")).toHaveText(
      /Published v1/,
      { timeout: 35000 },
    );
    const copyUrlLocator = copierPage.locator("#shareUrl");
    await expect(copyUrlLocator).toHaveValue(/\/p\//, { timeout: 35000 });
    await copierPage.goto(await copyUrlLocator.inputValue());
    await expect(copierPage.locator(".lpPublicForkSource")).toContainText(
      "Source list",
      { timeout: 20000 },
    );
    await expect(
      copierPage.locator(".lpPublicForkSource .lpForkSourceGone"),
    ).toHaveText("(no longer available)");
    await expect(
      copierPage.locator(".lpPublicForkSource .lpPublicForkSourceLink"),
    ).toHaveCount(0);
  } finally {
    await authorContext.close();
    await copierContext.close();
  }
});
