import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The server refuses "Public + Search engines" to an account that is only a few days old. The share
// dialog says so in the language of the page and puts the list back to what it was.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a refused search listing is explained and the visibility goes back", async ({
  page,
}) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.route("**/saveLibrary/**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        errors: [
          { message: "Search engine listing opens 7 days after sign-up." },
        ],
        code: "account-too-new",
        days: 7,
        limit: 7,
      }),
    }),
  );
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);

  await page.getByText("Share", { exact: true }).first().click();
  const visibility = page.locator("#listVisibility");
  await expect(visibility).toBeVisible();
  const before = await visibility.inputValue();
  expect(before).not.toBe("indexable");

  await visibility.selectOption("indexable");

  await expect(
    page.locator(".lpGlobalAlertMessage", {
      hasText:
        "Search engine listing opens 7 days after sign-up. Your list stays public in the community.",
    }),
  ).toBeVisible();
  await expect(visibility).toHaveValue(before);
});
