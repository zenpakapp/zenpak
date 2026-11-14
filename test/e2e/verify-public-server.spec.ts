import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The server refuses to make a list public for an unverified account. The editor must show the
// alert with its resend button (no store injection here: the real save is refused).
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("making a list public without a verified email shows the alert with a resend button", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `vs${now}`, "testtest", `vs+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  const shareTrigger = page
    .locator(".headerItem", { hasText: "Share" })
    .first();
  await expect(shareTrigger).toBeVisible({ timeout: 35000 });
  await shareTrigger.click();
  const visibility = page.locator("#listVisibility");
  await expect(visibility).toBeVisible({ timeout: 15000 });

  const refused = page.waitForResponse(
    (r) => r.url().includes("/saveLibrary") && r.status() === 403,
    { timeout: 35000 },
  );
  await visibility.selectOption("discoverable");
  await refused;

  const alert = page.locator(".lpGlobalAlert", {
    hasText: "before making a list public",
  });
  await expect(alert).toBeVisible({ timeout: 10000 });
  const resend = alert.locator(".lpGlobalAlertAction");
  await expect(resend).toHaveText("Resend email");
  await resend.click();
  await expect(resend).toHaveText(/Verification email sent/);
});
