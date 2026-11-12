import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The list description field must not run past the right edge of the list on a phone.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the list description field stays inside the screen on a phone", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ld${now}`, "testtest", `ld+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpListSummary")).toBeVisible({ timeout: 15000 });

  // The description is an optional field: turn it on through the app's store.
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.state.library.optionalFields.listDescription = true;
  });
  await page.setViewportSize({ width: 375, height: 700 });
  await page.locator("#listDescriptionContainer summary").click();

  const fits = await page.evaluate(() => {
    const field = document
      .querySelector("#listDescription")!
      .getBoundingClientRect();
    const box = document
      .querySelector("#listDescriptionContainer")!
      .getBoundingClientRect();
    return (
      field.right <= box.right + 0.5 &&
      document.documentElement.scrollWidth <= window.innerWidth
    );
  });
  expect(fits).toBe(true);
});
