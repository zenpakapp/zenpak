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
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByLabel("Filter by season")).toContainText("3-Season");
  await expect(page.getByLabel("Filter by season")).toContainText("4-Season");
});

test("the destination filter stays active when the filters are collapsed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/community/discover?*", async (route) => {
    const destination = new URL(route.request().url()).searchParams.get("destination");
    await route.fulfill({
      json: {
        lists: [
          { externalId: "pct", name: "A pack for the PCT", destination: "PCT" },
          ...(!destination ? [{ externalId: "gr20", name: "A pack for the GR20", destination: "GR20" }] : []),
        ],
        nextCursor: null,
      },
    });
  });
  await page.goto("/community");

  const toggle = page.getByRole("button", { name: /^Filters/ });
  const destination = page.getByRole("textbox", { name: "Place or route" });
  await expect(page.getByText("A pack for the GR20", { exact: true }).first()).toBeVisible();
  await expect(destination).toBeHidden();
  await toggle.press("Enter");
  await destination.fill("PCT");
  const results = page.locator(".lpCommunityResults");
  await expect(results.getByText("A pack for the PCT")).toBeVisible();
  await expect(results.getByText("A pack for the GR20")).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("1");
  await expect(destination).toBeHidden();

  await toggle.click();
  await expect(destination).toHaveValue("PCT");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(results.getByText("A pack for the GR20")).toBeVisible();
  await expect(toggle).toHaveText("Filters");

  await toggle.click();
  await results.getByRole("button", { name: "Filter by PCT", exact: true }).press("Enter");
  await expect(results.getByText("A pack for the GR20")).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(toggle).toContainText("1");
  await expect(page).toHaveURL(/\/community$/);
});
