import { test, expect } from "@playwright/test";
import path from "path";

import { registerUser, verifyUserEmail, importCsvFile } from "./auth-utils";

const isSuccessfulExternalId = (response) =>
  response.url().includes("/externalId") && response.ok();
const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

test.describe("CSV workflows", () => {
  test("should import, share, and export a rich CSV list", async ({
    page,
    browser,
  }) => {
    const now = Date.now();
    const username = `csv${now}`;
    const email = `csv+${now}@lighterpack.com`;
    const password = "testtest";
    const csvPath = path.join(
      process.cwd(),
      "test/fixtures/csv/roundtrip-rich.csv",
    );

    await registerUser(page, username, password, email);
    // Unverified accounts cannot make lists public, so sharing would 403.
    await verifyUserEmail(username);

    await importCsvFile(page, csvPath);
    await expect(page.locator("#importValidate")).toBeVisible();
    await expect(page.locator("#importValidate")).toContainText("4 accepted");
    await expect(page.locator("#importValidate")).not.toContainText("rejected");
    await expect(page.locator("#importValidate")).toContainText(
      "Tente, ultra légère",
    );
    await expect(page.locator("#importValidate")).toContainText(
      "Backpack (Sac à dos)",
    );
    await expect(page.locator("#importValidate")).toContainText("0");

    const importSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await page.locator("#importConfirm").click();
    await importSave;

    await expect(page.getByPlaceholder("List Name")).toHaveValue(
      "roundtrip-rich",
    );
    await expect(page.locator(".lpCategoryName").first()).toHaveValue(
      "Shelter",
    );
    await expect(page.locator(".lpItem .lpName").nth(2)).toHaveValue(
      "Rain jacket",
    );
    await expect(page.locator(".lpItem .lpQty").nth(2)).toHaveValue("0");

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
    const csvUrl = shareUrl.replace("/p/", "/csv/");
    await externalIdSave;

    const shareContext = await browser.newContext();
    const sharePage = await shareContext.newPage();

    try {
      await sharePage.goto(shareUrl);
      await expect(sharePage.locator("h1.lpPublicListTitle")).toHaveText(
        "roundtrip-rich",
      );
      await expect(
        sharePage
          .locator(".lpPublicListItem")
          .filter({ hasText: "Tente, ultra légère" }),
      ).toBeVisible();
      await expect(
        sharePage
          .locator(".lpPublicListItem")
          .filter({ hasText: "Backpack (Sac à dos)" }),
      ).toBeVisible();
      await expect(
        sharePage
          .locator(".lpPublicListItem")
          .filter({ hasText: "Rain jacket" }),
      ).toHaveClass(/lpPublicListItemOptional/);
      await expect(
        sharePage
          .locator(".lpPublicListItem")
          .filter({ hasText: "Fuel canister" }),
      ).toContainText("×2");
    } finally {
      await shareContext.close();
    }

    const csvResponse = await page.request.get(csvUrl);
    expect(csvResponse.status()).toBe(200);
    const exportedCsv = await csvResponse.text();
    expect(exportedCsv).toContain('"Tente, ultra légère"');
    // The export uses the account's units (ounce for the default en-US setup, gram for
    // metric locales), so the weight value and unit are matched loosely.
    expect(exportedCsv).toMatch(
      /Backpack \(Sac à dos\),Backpack & containers,Simond MT900 UL,1,[\d.]+,(gram|ounce),https:\/\/example\.com\/backpack,0/,
    );
    expect(exportedCsv).toMatch(
      /Rain jacket,Clothing,Stored but not packed,0,[\d.]+,(gram|ounce),https:\/\/example\.com\/rain-jacket,79\.5,Worn/,
    );
    expect(exportedCsv).toMatch(
      /Fuel canister,Cooking,"100g fuel, threaded",2,[\d.]+,(gram|ounce),https:\/\/example\.com\/fuel,6\.5,,Consumable/,
    );
  });
});
