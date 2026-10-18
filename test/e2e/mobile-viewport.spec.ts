import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-utils";
import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
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
    await registerUser(
      page,
      `mh${now}`,
      "testtest",
      `mh${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    // The theme toggle is a line icon like the bell, not a text glyph (emoji on iOS).
    await expect(page.locator(".lpThemeItem svg")).toBeVisible();
    await expect(page.locator(".lpThemeItem")).toHaveText("");
    // Share and list settings use line icons too, not the old black sprite images.
    await expect(page.locator("#header svg.lpHeaderIcon")).toHaveCount(3);
    // Worst case header: the Wayfarer link and the "unpublished changes" badge.
    await page.evaluate(() => {
      const { state } = window.LighterPack.$store;
      state.library.entitlements = { plan: "creator" };
      state.hasPendingSave = true;
      for (const l of Object.values(state.library.lists || {})) {
        l.visibility = "shareable";
        l.externalId = "abc123";
      }
    });
    await expect(page.locator(".sharePublishState")).toBeVisible();
    await expect(page.getByRole("link", { name: "Wayfarer" })).toBeVisible();
    await expect(page.locator(".headerGuideIcon")).toBeVisible();
    await expect(page.locator(".headerGuideLabel")).toBeHidden();
    // The publish dot must not run into the list settings icon next to Share.
    const dot = await page.locator(".sharePublishState").boundingBox();
    const icons = page.locator("#header svg.lpHeaderIcon");
    const shareIcon = await icons.nth((await icons.count()) - 2).boundingBox();
    const gear = await icons.last().boundingBox();
    // Header items must not shrink into each other: icons keep their own space.
    expect(shareIcon.x + shareIcon.width).toBeLessThanOrEqual(gear.x);
    expect(dot.x + dot.width).toBeLessThanOrEqual(gear.x);
    const title = await page.locator("#lpListName").boundingBox();
    expect(title.width).toBeGreaterThanOrEqual(48);
    const { scrollW, headerW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      headerW: document.getElementById("header").scrollWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(375);
    expect(headerW).toBeLessThanOrEqual(375);
  });
  // Community is an icon-only link on phones (the label does not fit) and text on desktop.
  test("community link is an icon on a phone and text on desktop", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `mc${now}`,
      "testtest",
      `mc${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    const link = page.locator("#header a[href='/community']");
    await expect(link.locator(".headerCommunityIcon")).toBeVisible();
    await expect(link.locator(".headerCommunityLabel")).toBeHidden();
    await expect(link).toHaveAttribute("aria-label", /\S/);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(link.locator(".headerCommunityLabel")).toBeVisible();
    await expect(link.locator(".headerCommunityIcon")).toBeHidden();
  });

  // The dropdown is 300px wide and anchored to the bell, which sits mid-header on a phone,
  // so it ran off the left edge of the screen.
  test("notifications dropdown stays on screen", async ({ page }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `mn${now}`,
      "testtest",
      `mn${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    await page.locator(".lpNotifBell").click();
    const dropdown = page.locator(".lpNotifDropdown");
    await expect(dropdown).toBeVisible();
    const box = await dropdown.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });
  // iOS Safari zooms the page when a field under 16px gets focus, which shifts the whole
  // layout (and made the notifications dropdown look cut off).
  test("editor fields are 16px so iOS does not zoom on focus", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `mz${now}`,
      "testtest",
      `mz${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("#main input.lpSilent, #lpListName")].map(
        (el) => parseFloat(getComputedStyle(el).fontSize),
      ),
    );
    expect(sizes.length).toBeGreaterThan(1);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
  });
});

// The brand/type/tags form had min-width: 320px, wider than the dialog's content box on a
// 375px phone, so its fields and buttons ran past the dialog's right edge.
test("brand, type and tags dialog fits inside a phone", async ({ page }) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.locator(".lpItem .lpTag").first().click();
  await expect(page.locator(".itemMetaForm")).toBeVisible();
  const { formRight, dialogRight } = await page.evaluate(() => {
    const form = document
      .querySelector(".itemMetaForm")
      .getBoundingClientRect();
    const modal = document
      .querySelector("#itemMetaDialog")
      .getBoundingClientRect();
    return { formRight: form.right, dialogRight: modal.right };
  });
  expect(formRight).toBeLessThanOrEqual(dialogRight);
});

// Dialogs with a fixed pixel width (620px here) overrode the modal's min(560px, 100vw - 32px)
// and, centred with translateX(-50%), ran off both sides of a phone.
test("forgot password dialog fits a phone with stacked forms", async ({
  page,
}) => {
  await page.goto(`${testRoot}forgot-password`);
  const dialog = page.locator("#forgotPassword");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  const halves = page.locator("#forgotPassword .lpHalf");
  const first = await halves.nth(0).boundingBox();
  const second = await halves.nth(1).boundingBox();
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
});

// The page's modal emits "hide" on the close button and the overlay, but nothing listened,
// so the only way off the page was the small "back to sign in" link.
test("forgot password page can be closed", async ({ page }) => {
  await page.goto(`${testRoot}forgot-password`);
  await page.locator(".lpModalClose").click();
  await expect(page).toHaveURL(/\/welcome$/);

  await page.goto(`${testRoot}forgot-password`);
  await page.locator("#forgotPassword a[href='/signin']").click();
  await expect(page).toHaveURL(/\/welcome$/);
});
