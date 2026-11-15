import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Worn and consumable exclude each other. The blocked toggle says why before it is clicked.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the blocked worn or consumable toggle explains itself in its title", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `bt${now}`, "testtest", `bt+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  const worn = row.locator(".lpWorn");
  const consumable = row.locator(".lpConsumable");

  await expect(consumable).toHaveAttribute("title", /consumable/i);
  await expect(consumable).not.toHaveAttribute("title", /Turn off/);

  await row.hover();
  await worn.click();
  await expect(worn).toHaveClass(/lpActive/);
  await expect(consumable).toHaveAttribute(
    "title",
    "A worn item can't be marked as consumable. Turn off worn first.",
  );

  await worn.click();
  await expect(consumable).not.toHaveAttribute("title", /Turn off/);

  await consumable.click();
  await expect(consumable).toHaveClass(/lpActive/);
  await expect(worn).toHaveAttribute(
    "title",
    "A consumable item can't be marked as worn. Turn off consumable first.",
  );
});
