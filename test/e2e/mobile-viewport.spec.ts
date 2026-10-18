import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  // French copy is the longest: the stats row only overflowed with it.
  locale: "fr-FR",
});

// Without the viewport meta a mobile browser lays the SPA out at 980px wide.
test("SPA shell declares a device-width viewport", async ({ page }) => {
  await page.goto(`${testRoot}welcome`);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /width=device-width/,
  );
  expect(await page.evaluate(() => window.innerWidth)).toBe(375);
});

// The hero stats row (3 flex items) used to be wider than a phone and widened the
// whole page, which shrank it and pushed the sign-up modals off-centre.
test("welcome page does not scroll horizontally on a phone", async ({
  page,
}) => {
  await page.goto(`${testRoot}welcome`);
  await page.locator(".lpWelcomeStats").waitFor();
  const { inner, scrollW } = await page.evaluate(() => ({
    inner: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
  }));
  expect(inner).toBe(375);
  expect(scrollW).toBeLessThanOrEqual(375);
});

// Signed in, the header also holds the bell and the Community link. The Community link
// was meant to be hidden on phones but a later, more specific rule showed it again, so
// the header was wider than the screen and its items overlapped.
test.describe("signed in", () => {
  // registerUser clicks the English "Register" button.
  test.use({ locale: "en-US" });

  test("editor header fits a phone", async ({ page }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(page, `mh${now}`, "testtest", `mh${now}@lighterpack.com`);
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    await expect(page.locator(".headerCommunityItem")).toBeHidden();
    const { scrollW, headerW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      headerW: document.getElementById("header").scrollWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(375);
    expect(headerW).toBeLessThanOrEqual(375);
  });
});
