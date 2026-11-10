import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// The community hint is the way new users find the community: it goes away once they follow it.
test.use({ locale: "en-US" });

test("the community hint disappears after following its link", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ch${now}`, "testtest", `ch+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  const hint = page.locator(".lpCommunityHint");
  await expect(hint).toBeVisible({ timeout: 15000 });

  await hint.locator(".lpCommunityHintCta").click();
  await expect(page).toHaveURL(/\/community/);

  await page.goto("/");
  await expect(page.locator(".lpItem").first()).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".lpCommunityHint")).toHaveCount(0);
});
