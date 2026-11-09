import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A refused display name is explained under the Save button, where the eye already is, and the
// field that caused it is outlined. Typing again clears both.
test.use({ locale: "en-US" });

test("a reserved display name shows its error under the Save button", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pe${now}`, "testtest", `pe+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");

  const input = page.locator(".profileSettingsInput").first();
  await expect(input).toBeAttached({ timeout: 15000 });
  await input.fill("ZenPak");
  const save = page.locator(".profileSettingsActions button");
  await save.click();

  const error = page.locator(".profileSettingsActionError");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(input).toHaveClass(/profileSettingsInputInvalid/);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(error).toHaveCSS("color", "rgb(206, 24, 54)");
  await expect(input).toHaveCSS("border-top-color", "rgb(206, 24, 54)");

  const buttonBox = await save.boundingBox();
  const errorBox = await error.boundingBox();
  expect(errorBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height);
  expect(Math.abs(errorBox!.x - buttonBox!.x)).toBeLessThan(2);

  await input.fill("Trail friend");
  await expect(error).toHaveCount(0);
  await expect(input).not.toHaveClass(/profileSettingsInputInvalid/);
});
