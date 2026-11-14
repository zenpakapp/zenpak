import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The import confirmation dialog: Cancel and Import are real buttons a keyboard reaches, and they
// stay in view when the dialog scrolls, even on a short window.
test.use({ locale: "en-US", viewport: { width: 1280, height: 560 } });

test("the import dialog actions are buttons, reachable by keyboard and kept in view", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ik${now}`, "testtest", `ik+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );

  const confirm = page.locator("#importConfirm");
  await expect(confirm).toBeVisible({ timeout: 15000 });
  expect(await confirm.evaluate((el) => el.tagName)).toBe("BUTTON");

  // Kept in view although the dialog content is taller than the window.
  const box = await confirm.boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(560);

  // Flush with the dialog's bottom edge: no scrolling content shows under the bar.
  const gap = await page.evaluate(() => {
    const dialog = document.querySelector("#importValidate")!.getBoundingClientRect();
    const bar = document
      .querySelector("#importValidate .lpModalActions")!
      .getBoundingClientRect();
    return dialog.bottom - bar.bottom;
  });
  expect(gap).toBeLessThanOrEqual(2);

  // Keyboard: from Cancel, Tab reaches Import and Enter runs it.
  const cancel = page.locator("#importValidate .lpModalActions .close");
  await cancel.focus();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });
});
