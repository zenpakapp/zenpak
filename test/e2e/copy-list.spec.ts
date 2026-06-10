import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-utils";

test.describe("Copy list", () => {
  test('shows "Sign in to copy this list" link for unauthenticated visitor', async ({
    page,
  }) => {
    test.setTimeout(90000);

    const now = Date.now();
    const username = `copytest${now}`;
    const email = `copytest+${now}@lighterpack.com`;
    const password = "testtest";

    // Register + create a list, wait for dashboard ready
    await registerUser(page, username, password, email);
    await expect(
      page.getByText(`Signed in as ${username}`).first(),
    ).toBeVisible({ timeout: 35000 });

    // Open share panel — click to keep it open (hover closes on mouse move)
    const shareTrigger = page
      .locator(".headerItem", { hasText: "Share" })
      .first();
    await expect(shareTrigger).toBeVisible({ timeout: 35000 });

    const externalIdResponse = page.waitForResponse(
      (r) => r.url().includes("/externalId") && r.ok(),
      { timeout: 35000 },
    );
    await shareTrigger.hover();
    await externalIdResponse;

    // Wait for the share URL to populate
    const shareUrlInput = page.locator("#shareUrl");
    await expect(shareUrlInput).toHaveValue(/\S/, { timeout: 35000 });

    // Make list publicly visible — wait for popover content to stabilise then select
    const listVisibility = page.locator("#listVisibility");
    await expect(listVisibility).toBeVisible({ timeout: 15000 });

    const visibilitySave = page.waitForResponse(
      (r) => r.url().includes("/saveLibrary") && r.ok(),
      { timeout: 35000 },
    );
    await listVisibility.selectOption("discoverable");
    await visibilitySave;

    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain("/p/");

    // Sign out
    await page.getByText("Signed in as").first().hover();
    await page.getByText("Sign out").click();

    // Visit the public list page unauthenticated
    await page.goto(shareUrl);

    const signInLink = page.getByRole("link", {
      name: "Sign in to copy this list",
    });
    await expect(signInLink).toBeVisible({ timeout: 15000 });
  });
});
