import { test, expect } from "@playwright/test";

// A visitor who is not signed in presses "My Feed": nothing used to happen (and its tooltip was in
// English). Now the page says why and links to sign-in, in the language of the page.
test.describe("in French", () => {
  test.use({ locale: "fr-FR", viewport: { width: 390, height: 844 } });

  test("pressing My Feed explains how to see it", async ({ page }) => {
    await page.goto("/community");
    const tab = page.locator('[data-tab="feed"]');
    await expect(tab).toHaveAttribute("aria-disabled", "true");
    await expect(tab).not.toHaveAttribute("title", /.+/);
    await expect(page.locator(".lpCommunityFeedHint")).toHaveCount(0);

    await tab.click({ force: true });
    const hint = page.locator(".lpCommunityFeedHint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(
      "Connectez-vous pour voir l’activité des personnes que vous suivez.",
    );
    await expect(
      hint.getByRole("link", { name: "Se connecter" }),
    ).toHaveAttribute("href", "/welcome");
    // The tab did not open: still on Discover.
    await expect(page.locator(".lpCommunityTab.active")).toContainText(
      "Découvrir",
    );

    await tab.click({ force: true });
    await expect(hint).toHaveCount(0);
  });
});
