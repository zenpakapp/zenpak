import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

// On a phone the Community is the way to find someone met on the trail: open Community,
// open People, type a name, tap the person. Every control is a touch target of 44px or more,
// and the search field is at least 16px so iOS does not zoom the page when it is focused.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

async function signUp(page, prefix) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `${prefix}${now}`;
  await registerUser(
    page,
    username,
    "testtest",
    `${prefix}+${now}@lighterpack.com`,
  );
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  return username;
}

async function box(locator) {
  const b = await locator.boundingBox();
  return { w: b?.width ?? 0, h: b?.height ?? 0 };
}

test("finding a person on a phone takes a few taps, all on touch-sized controls", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);

  // The person to find: a discoverable profile.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  const target = await signUp(otherPage, "pf");
  await verifyUserEmail(target);
  await otherPage.evaluate(async () => {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "discoverable" }),
    });
  });
  await otherContext.close();

  await signUp(page, "ps");

  const community = page.locator("#header").getByRole("link", { name: "Community", exact: true });
  await expect(community).toBeVisible();
  await community.tap();
  await expect(page).toHaveURL(/\/community/);

  const peopleTab = page.getByRole("button", { name: "People" });
  expect((await box(peopleTab)).h).toBeGreaterThanOrEqual(44);
  await peopleTab.tap();

  const search = page.locator(".lpCommunitySearchInput");
  await expect(search).toBeVisible();
  expect((await box(search)).h).toBeGreaterThanOrEqual(44);
  const fontSize = await search.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(fontSize).toBeGreaterThanOrEqual(16);

  await search.fill(target);
  const result = page.locator(".lpCommunityCardUser", {
    hasText: `@${target}`,
  });
  await expect(result).toBeVisible();
  expect((await box(result)).h).toBeGreaterThanOrEqual(44);
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(375);

  await result.tap();
  await expect(page).toHaveURL(new RegExp(`/u/${target}$`));
});
