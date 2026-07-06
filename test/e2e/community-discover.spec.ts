import { test, expect } from "@playwright/test";

test("Discover tab shows public lists", async ({ page }) => {
  await page.goto("/community");
  await expect(page.locator("text=Discover")).toBeVisible();
  await expect(page.locator("text=My Feed")).toBeVisible();
});

test("My Feed tab is disabled when not logged in", async ({ page }) => {
  await page.goto("/community");
  const feedTab = page.locator('[data-tab="feed"]');
  await expect(feedTab).toHaveAttribute("aria-disabled", "true");
});

test("sort toggle switches between Recent and Most viewed", async ({
  page,
}) => {
  await page.goto("/community");
  await page.click("text=Most viewed");
  await expect(page.locator('[data-sort="popular"]')).toHaveClass(/active/);
});

test("season filter includes pack season labels", async ({ page }) => {
  await page.goto("/community");
  await expect(page.getByLabel("Filter by season")).toContainText("3-Season");
  await expect(page.getByLabel("Filter by season")).toContainText("4-Season");
});
