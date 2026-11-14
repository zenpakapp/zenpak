import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The list description is an optional field. Without it turned on, a line under the summary
// offers it: one tap turns it on, opens it and puts the cursor in it.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("a line under the summary turns on the list description", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ad${now}`, "testtest", `ad+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpListSummary")).toBeVisible({ timeout: 15000 });
  await page.setViewportSize({ width: 375, height: 700 });

  // The CSV brings a description and turns the field on: turn it off to start from the default.
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.state.library.optionalFields.listDescription = false;
  });
  const add = page.locator(".lpAddListDescription");
  await expect(add).toBeVisible();
  await expect(page.locator("#listDescriptionContainer")).toHaveCount(0);

  await add.click();
  await expect(add).toHaveCount(0);
  await expect(page.locator("#listDescriptionContainer")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#listDescription")).toBeFocused();
  await page.keyboard.type("Three days in the Vosges");
  await expect(page.locator("#listDescription")).toHaveValue(
    /Three days in the Vosges/,
  );
});
