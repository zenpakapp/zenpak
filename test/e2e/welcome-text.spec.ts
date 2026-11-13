import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

test.use({ locale: "en-US" });

// The welcome text matches what is on screen: it only points at "the categories below" when
// the list has categories, and asks for one first when it has none.
test("welcome text follows whether the list has categories", async ({
  page,
}) => {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `wt${now}`, "testtest", `wt+${now}@lighterpack.com`);

  const welcome = page.locator("#getStarted");
  await expect(welcome).toBeVisible();
  const categories = await page.locator(".lpCategory").count();
  await expect(welcome).toContainText(
    categories > 0
      ? "Add your items to the categories below"
      : "Add a category below, then your items",
  );
  await expect(welcome).not.toContainText("first category");
});
