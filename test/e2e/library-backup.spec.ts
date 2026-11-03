import { test, expect } from "@playwright/test";
import fs from "fs";

import { registerUser } from "./auth-utils";

// The account page downloads the whole library and restores it, replacing what the account holds now.
test.use({ locale: "en-US" });

const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

async function addItem(page, name: string) {
  const saved = page.waitForResponse(isSuccessfulSave, { timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill(name);
  await page.locator(".lpAddItemInput").first().press("Enter");
  await saved;
}

const itemNames = (page) =>
  page.$$eval(".lpItem .lpName", (inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );

async function openAccountSettings(page) {
  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");
}

test("restoring a backup puts the library back as it was", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `bk${now}`, "testtest", `bk+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await addItem(page, "Backup stove");
  await expect.poll(() => itemNames(page)).toContain("Backup stove");

  // Download the backup while the library holds only the first item.
  await openAccountSettings(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^zenpak-backup-.*\.json$/);
  const backupPath = testInfo.outputPath("backup.json");
  await file.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  expect(backup.library.items.map((item) => item.name)).toContain(
    "Backup stove",
  );

  // Change the library afterwards: a second item the backup does not know.
  await page.goto("/");
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await addItem(page, "Added later");
  await expect.poll(() => itemNames(page)).toContain("Added later");

  // Restore: the confirmation warns, then the library is the backup again.
  await openAccountSettings(page);
  await page
    .locator('input[type="file"][accept=".json"]')
    .setInputFiles(backupPath);
  await expect(
    page.getByText("This will replace your entire library"),
  ).toBeVisible();
  const saved = page.waitForResponse(isSuccessfulSave, { timeout: 35000 });
  await page.getByRole("button", { name: "Yes, restore" }).click();
  await saved;

  await page.goto("/");
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect.poll(() => itemNames(page)).toContain("Backup stove");
  expect(await itemNames(page)).not.toContain("Added later");
});

test("cancelling the confirmation leaves the library alone", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `bc${now}`, "testtest", `bc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await addItem(page, "Keep me");

  const backupPath = testInfo.outputPath("empty-backup.json");
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ library: { lists: [], items: [], categories: [] } }),
  );

  await openAccountSettings(page);
  await page
    .locator('input[type="file"][accept=".json"]')
    .setInputFiles(backupPath);
  await expect(
    page.getByText("This will replace your entire library"),
  ).toBeVisible();
  await page.locator(".accountRestoreConfirm .accountCancelLink").click();
  await expect(
    page.getByText("This will replace your entire library"),
  ).toBeHidden();

  await page.goto("/");
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect.poll(() => itemNames(page)).toContain("Keep me");
});
