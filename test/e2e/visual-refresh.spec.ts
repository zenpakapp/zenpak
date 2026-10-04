import { test, expect } from "@playwright/test";
import path from "path";

import { registerUser, verifyUserEmail, importCsvFile } from "./auth-utils";

const isSuccessfulExternalId = (response) =>
  response.url().includes("/externalId") && response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

test.describe("Visual refresh", () => {
  test("empty state is shown for authenticated user with blank list", async ({
    page,
  }) => {
    const now = Date.now();
    const username = `empty${now}`;
    const email = `empty+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);

    await expect(page.locator(".accountDropdownName")).toHaveText(username);
    await expect(page.locator("#getStarted")).toBeVisible();
    await expect(page.getByText(`Welcome ${username} to ZenPak`)).toBeVisible();
  });

  test("should de-emphasize zero-quantity rows in edit and share views", async ({
    page,
    browser,
  }) => {
    const now = Date.now();
    const username = `visual${now}`;
    const email = `visual+${now}@lighterpack.com`;
    const password = "testtest";
    const csvPath = path.join(
      process.cwd(),
      "test/fixtures/csv/roundtrip-rich.csv",
    );

    await registerUser(page, username, password, email);
    // Unverified accounts cannot make lists public, so sharing would 403.
    await verifyUserEmail(username);

    await importCsvFile(page, csvPath);
    const importSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#importConfirm").click();
    await importSave;

    await expect(page.locator(".lpItem .lpName").nth(2)).toHaveValue(
      "Rain jacket",
    );
    const zeroQtyRow = page.locator(".lpItem").nth(2);
    await expect(zeroQtyRow).toHaveClass(/lpQtyZero/);

    const externalIdSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, {
      timeout: 35000,
    });
    await page.getByText("Share", { exact: true }).hover();
    await externalIdResponse;

    const shareUrlLocator = page.locator("#shareUrl");
    await expect(shareUrlLocator).toHaveValue(/\S/, { timeout: 35000 });
    const shareUrl = await shareUrlLocator.inputValue();
    await externalIdSave;

    const shareContext = await browser.newContext();
    const sharePage = await shareContext.newPage();

    try {
      await sharePage.goto(shareUrl);
      const sharedZeroQtyRow = sharePage
        .locator(".lpPublicListItem")
        .filter({ hasText: "Rain jacket" });
      await expect(sharedZeroQtyRow).toHaveClass(/lpPublicListItemOptional/);
    } finally {
      await shareContext.close();
    }
  });
});
