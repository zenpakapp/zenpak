import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

test("public list shows Report to other users and the copy count; profile has Report", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const author = `repa${now}`;
  const visitor = `repb${now}`;
  const password = "testtest";

  const authorContext = await browser.newContext();
  const visitorContext = await browser.newContext();
  const authorPage = await authorContext.newPage();
  const visitorPage = await visitorContext.newPage();

  try {
    await registerUser(
      authorPage,
      author,
      password,
      `rep+a${now}@lighterpack.com`,
    );
    await verifyUserEmail(author);
    await authorPage.getByPlaceholder("List Name").fill("Report list");

    const publish = authorPage.waitForResponse(
      (r) =>
        r.url().endsWith("/publish") &&
        r.request().method() === "POST" &&
        r.ok(),
      { timeout: 35000 },
    );
    await authorPage.getByText("Share", { exact: true }).hover();
    await publish;
    await expect(authorPage.locator(".sharePublishState")).toHaveText(
      "Published v1",
      { timeout: 15000 },
    );
    const shareUrlInput = authorPage.locator("#shareUrl");
    const copyAllowed = authorPage.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await authorPage.getByLabel("Allow others to copy this list").check();
    await copyAllowed;
    const shareUrl = await shareUrlInput.inputValue();

    // The author never sees Report on their own list, and no count while nobody copied it.
    await authorPage.goto(shareUrl);
    await expect(authorPage.locator(".lpPublicListTitle")).toBeVisible({
      timeout: 15000,
    });
    await expect(authorPage.locator(".lpReportBtn")).toHaveCount(0);
    await expect(authorPage.locator(".lpPublicListCopies")).toHaveCount(0);

    await registerUser(
      visitorPage,
      visitor,
      password,
      `rep+b${now}@lighterpack.com`,
    );
    await expect(visitorPage.locator(".accountDropdownName")).toBeVisible({
      timeout: 35000,
    });
    await visitorPage.goto(shareUrl);
    await expect(visitorPage.locator(".lpPublicListTitle")).toBeVisible({
      timeout: 15000,
    });

    // Report the list
    // The session is restored asynchronously after a full page load.
    await expect(visitorPage.locator(".lpReportBtn")).toBeVisible({
      timeout: 15000,
    });
    const listReport = visitorPage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/reports") && r.request().method() === "POST",
      { timeout: 15000 },
    );
    await visitorPage.locator(".lpReportBtn").click();
    await visitorPage.getByLabel("Spam").check();
    await visitorPage.locator(".lpReportSubmit").click();
    const listReportResponse = await listReport;
    expect(listReportResponse.request().postDataJSON()).toMatchObject({
      targetType: "list",
    });
    await expect(visitorPage.locator(".lpReportConfirm")).toBeVisible();

    // Copy it: the source list now shows one copy
    const copied = visitorPage.waitForResponse(
      (r) => r.url().includes("/copy-list") && r.ok(),
      { timeout: 35000 },
    );
    await visitorPage.locator(".lpCopyListBtn").click();
    await copied;
    await visitorPage.goto(shareUrl);
    await expect(visitorPage.locator(".lpPublicListCopies")).toHaveText(/1/, {
      timeout: 15000,
    });

    // Report the author from their public profile
    // Making a profile public goes through the account settings UI: stub the profile payload.
    await visitorPage.route("**/api/public/profile/*", (route) =>
      route.fulfill({
        json: {
          username: author,
          profile: { displayName: author, visibility: "public" },
          entitlements: { plan: "free" },
          lists: [],
          followerCount: 0,
          followingCount: 0,
        },
      }),
    );
    await visitorPage.goto(`${shareUrl.split("/p/")[0]}/u/${author}`);
    await expect(visitorPage.locator(".lpReportBtn")).toBeVisible({
      timeout: 15000,
    });
    const userReport = visitorPage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/reports") && r.request().method() === "POST",
      { timeout: 15000 },
    );
    await visitorPage.locator(".lpReportBtn").click();
    await visitorPage.getByLabel("Spam").check();
    await visitorPage.locator(".lpReportSubmit").click();
    const userReportResponse = await userReport;
    expect(userReportResponse.request().postDataJSON()).toMatchObject({
      targetType: "user",
      targetId: author,
    });
  } finally {
    await authorContext.close();
    await visitorContext.close();
  }
});
