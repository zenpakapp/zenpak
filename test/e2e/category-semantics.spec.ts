import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A screen reader can jump between categories (headings) and hears what a subtotal is the
// subtotal of; the text is not visible.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("categories are headings and subtotals say what they total", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `cs${now}`, "testtest", `cs+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  await expect(page.locator(".lpItem[data-item-id]").first()).toBeVisible({
    timeout: 15000,
  });

  // Name the category, then find it as a heading.
  const nameInput = page.locator(".lpCategoryName").first();
  await nameInput.fill("Kitchen");
  await nameInput.blur();
  await expect(
    page.getByRole("heading", { level: 3, name: "Kitchen" }),
  ).toHaveCount(1);

  // Subtotals are labelled groups: a screen reader says what each one totals.
  const footer = page.locator(".lpItemsFooter").first();
  await expect(footer.locator(".lpWeightCell")).toHaveAttribute(
    "aria-label",
    "Total weight of Kitchen:",
  );
  await expect(footer.locator(".lpQtyCell")).toHaveAttribute(
    "aria-label",
    "Total quantity in Kitchen:",
  );
});
