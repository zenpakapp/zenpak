import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// "My card": a full-screen page with the QR code of the public profile, the name, the address
// and the share button, to hand over one's profile in a few seconds on a trail.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

async function signUp(page) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `mc${now}`;
  await registerUser(page, username, "testtest", `mc+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  return username;
}

test("a private profile gets a message and a way to the settings, no QR code", async ({
  page,
}) => {
  test.setTimeout(60000);
  await signUp(page);
  await page.goto("/card");
  await expect(page.getByText("Your profile is private.")).toBeVisible();
  await expect(page.locator(".lpMyCardQr")).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile settings" }).tap();
  // The settings open on the visibility field, in view without any scrolling.
  const visibility = page.locator(".profileSettingsLabel", {
    hasText: "Visibility",
  });
  await expect(visibility).toBeInViewport();
});

test("a public profile shows the QR code, the name, the address and the share button", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    (window as any).sharedWith = null;
    (navigator as any).share = (data) => {
      (window as any).sharedWith = data;
      return Promise.resolve();
    };
  });
  const username = await signUp(page);
  await page.goto("/card");
  await expect(page.locator(".lpMyCardPrivate")).toBeVisible();
  await page.evaluate(() => {
    window.LighterPack.$store.state.library.publicProfile.visibility =
      "shareable";
  });

  const qr = page.locator(".lpMyCardQr");
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute("src", /^data:image\/png/);
  await expect(page.locator(".lpMyCardName")).toHaveText(username);
  await expect(page.locator(".lpMyCardAddress")).toHaveText(
    new RegExp(`/u/${username}$`),
  );

  // Fits the screen, with touch targets of at least 44px.
  const box = await qr.boundingBox();
  expect((box?.x ?? -1) >= 0).toBe(true);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
  const share = page.getByRole("button", { name: "Share" });
  expect((await share.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(375);

  await share.tap();
  const shared = await page.evaluate(() => (window as any).sharedWith);
  expect(shared.url).toMatch(new RegExp(`/u/${username}$`));
});

test("signed out, the card sends to the welcome page", async ({ page }) => {
  await page.goto("/card");
  await expect(page).toHaveURL(/\/welcome/);
});
