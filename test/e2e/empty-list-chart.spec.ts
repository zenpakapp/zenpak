import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser, importCsvFile } from "./auth-utils";

// A blank list holds no item. It must show the get-started panel, not the
// totals and the donut of the list the user was looking at before.
test.use({ locale: "en-US" });

test("a new blank list does not keep the previous list's chart", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ec${now}`, "testtest", `ec+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await importCsvFile(
    page,
    path.join(process.cwd(), "test/fixtures/csv/roundtrip-rich.csv"),
  );
  await page.locator("#importConfirm").click();

  // The imported list has weight: totals and donut are there.
  await expect(page.locator(".lpListSummary")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lpChartContainer canvas")).toBeVisible();
  await expect(page.locator("#getStarted")).toHaveCount(0);

  const itemsBefore = await page.locator(".library .lpLibraryItem").count();

  // A new blank list shows the get-started panel and no donut or totals.
  await page.mouse.move(0, 0);
  await page.locator(".listContainerHeader a.lpAdd").first().hover();
  await page.getByRole("button", { name: "New blank list" }).click();
  await expect(page.locator("#getStarted")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lpListSummary")).toHaveCount(0);
  await expect(page.locator(".lpPackBtn")).toHaveCount(0);

  // It leaves no nameless placeholder in the gear room.
  expect(await page.locator(".library .lpLibraryItem").count()).toBe(
    itemsBefore,
  );
});
