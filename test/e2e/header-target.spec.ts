import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// On a phone the Community link is an icon alone: its hit area must be finger-sized.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("the Community link of the header is at least 44px on a phone", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ht${now}`, "testtest", `ht+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const link = page.locator('#header a[href="/community"]').first();
  await expect(link).toBeVisible();
  const box = await link.boundingBox();
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
});
