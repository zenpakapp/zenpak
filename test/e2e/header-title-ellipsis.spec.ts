import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the list name shares the header with six icons. A long name is cut with an ellipsis,
// so it is clear that part of it is hidden.
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

test("a long list name ends with an ellipsis in the header", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ht${now}`, "testtest", `ht+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const name = page.locator("#lpListName");
  await name.fill("Dolomites via ferrata long weekend 2027");
  await name.blur();

  await expect(name).toHaveCSS("text-overflow", "ellipsis");
  const clipped = await name.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(clipped).toBe(true);
});
