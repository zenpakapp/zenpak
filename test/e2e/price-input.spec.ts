import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The price field keeps what is typed while it has the focus (129 stays 129) and is formatted to
// two decimals only when it is left.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("typing a price is not rewritten key by key", async ({ page }) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pi${now}`, "testtest", `pi+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // Show the price column.
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit(
      "toggleOptionalField",
      "price",
    );
  });

  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  const price = row.locator(".lpPrice");
  await price.click();
  await price.selectText();
  await page.keyboard.type("129", { delay: 40 });
  // Still what was typed, not "1.00".
  await expect(price).toHaveValue("129");

  // Another digit does not get glued after a rewritten "1.00".
  await price.selectText();
  await page.keyboard.type("45.5", { delay: 40 });
  await expect(price).toHaveValue("45.5");

  // Leaving the field formats it.
  await price.blur();
  await expect(price).toHaveValue("45.50");
});
