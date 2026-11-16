import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The donut tooltip shows each category's share of the base weight. Marking an item worn changes
// those shares without changing the total weight, and the chart must follow without a reload.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the donut shares follow a worn toggle without a reload", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `cr${now}`, "testtest", `cr+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const addItem = async (name: string, weight: string, category: number) => {
    await page.locator(".lpAddItem").nth(category).click();
    await page.locator(".lpAddItemInput").first().fill(name);
    await page.locator(".lpAddItemInput").first().press("Enter");
    const row = page
      .locator(".lpCategory")
      .nth(category)
      .locator(".lpItem[data-item-id]")
      .first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator(".lpWeight").fill(weight);
    await row.locator(".lpWeight").blur();
    return row;
  };

  await addItem("Tent", "1000", 0);
  await page.locator(".addCategory").first().click();
  await expect(page.locator(".lpCategory")).toHaveCount(2);
  const second = await addItem("Stove", "500", 1);

  // Each slice's share of the base weight, as the tooltips show it (data-shares on the canvas).
  const shares = async () => {
    const raw =
      (await page.locator("canvas.lpChart").getAttribute("data-shares")) || "";
    return raw ? raw.split(",").map(Number) : [];
  };

  // Neither worn nor consumable: 1000 g and 500 g make 67% and 33% of the base weight.
  await expect.poll(shares).toEqual([67, 33]);

  // The stove becomes worn: it leaves the base weight, the tent is all of it. Total weight is
  // still 1500 g, so only a refresh on the worn change can show it.
  await second.hover();
  await second.locator(".lpWorn").click();
  await expect(second.locator(".lpWorn")).toHaveClass(/lpActive/);
  await expect.poll(shares).toEqual([100, 0]);
});
