import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

// The community tags of a list were one flat block of eleven checkboxes: "3 seasons" ticked next
// to spring, summer and fall, durations next to activities. They are now four labelled groups.
test("the community tags are grouped by season, gear level, duration and activity", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = Date.now();
  const username = `sg${now}`;
  await registerUser(page, username, "testtest", `sg+${now}@lighterpack.com`);
  await verifyUserEmail(username);
  await page.getByText("Share", { exact: true }).hover();

  const groups = page.locator(".shareTagGroupBlock");
  await expect(groups).toHaveCount(4, { timeout: 20000 });
  const group = (label: string) =>
    groups.filter({ has: page.locator(".shareTagGroupLabel", { hasText: label }) });

  await expect(group("Season").locator(".shareTagCheckbox")).toHaveText([
    /Spring/,
    /Summer/,
    /Fall/,
    /Winter/,
  ]);
  await expect(group("Gear level").locator(".shareTagCheckbox")).toHaveText([
    /3-Season/,
    /4-Season/,
  ]);
  await expect(group("Duration").locator(".shareTagCheckbox")).toHaveText([
    /Day hike/,
    /Weekend/,
    /Trek/,
  ]);
  await expect(group("Activity").locator(".shareTagCheckbox")).toHaveText([
    /Bikepacking/,
    /Travel/,
  ]);
});
