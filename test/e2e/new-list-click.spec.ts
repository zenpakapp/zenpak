import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// With a mouse or a keyboard, "New list" opens its menu; it never creates a blank list by
// itself. The blank list is the menu's first entry.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("clicking or pressing Enter on New list opens the menu without creating a list", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `nc${now}`, "testtest", `nc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const lists = page.locator("#lists .lpLibraryList");
  const before = await lists.count();
  const label = page.locator(".listContainerHeader .lpTarget .lpAdd").first();
  const blank = page.getByRole("button", { name: "New blank list" });

  // Mouse click.
  await label.click();
  await expect(blank).toBeVisible();
  await expect(lists).toHaveCount(before);

  // Keyboard: focus the label, Enter keeps the menu and creates nothing.
  await page.keyboard.press("Escape");
  await label.focus();
  await page.keyboard.press("Enter");
  await expect(blank).toBeVisible();
  await expect(lists).toHaveCount(before);

  // The entry does create it.
  await blank.click();
  await expect(lists).toHaveCount(before + 1);
});
