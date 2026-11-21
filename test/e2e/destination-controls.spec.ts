import { test, expect } from "@playwright/test";

// The destination tag of a card is a button: 24px tall (WCAG 2.5.8) and marked with a pin, so it does
// not pass for a plain tag. The destination filter field is as tall as the other filters.
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

test("destination tag is a 24px button with a pin and the filter fields share one height", async ({
  page,
}) => {
  await page.route("**/api/community/discover?*", (route) =>
    route.fulfill({
      json: {
        nextCursor: null,
        lists: [
          { externalId: "tmb", name: "Tour du Mont Blanc", destination: "TMB" },
        ],
      },
    }),
  );
  await page.goto("/community");
  const tag = page.getByRole("button", { name: "Filter by TMB" });
  await expect(tag).toBeVisible();
  expect((await tag.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  await expect(tag.locator("svg")).toHaveCount(1);

  await page.getByRole("button", { name: /^Filters/ }).click();
  const heights = await page
    .locator(".lpCommunityFilters")
    .locator(
      ".lpCommunityFilterInput, .lpSelectTrigger, button.lpSelect, .lpSelect",
    )
    .evaluateAll((els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0),
    );
  expect(heights.length).toBeGreaterThan(2);
  expect(new Set(heights).size).toBe(1);
});
