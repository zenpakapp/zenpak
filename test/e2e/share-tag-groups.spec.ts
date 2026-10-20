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
    /Day/,
    /Weekend/,
    /Several days/,
    /Long distance/,
  ]);
  await expect(group("Activity").locator(".shareTagCheckbox")).toHaveText([
    /Hiking/,
    /Trail running/,
    /Bikepacking/,
    /Via ferrata/,
    /Travel/,
  ]);

  // A list lasts one time: ticking a second duration replaces the first.
  const durations = group("Duration").locator(".shareTagCheckbox input");
  await durations.nth(0).check();
  await expect(durations.nth(0)).toBeChecked();
  await durations.nth(1).check();
  await expect(durations.nth(1)).toBeChecked();
  await expect(durations.nth(0)).not.toBeChecked();

  // Activities can be several.
  const activities = group("Activity").locator(".shareTagCheckbox input");
  await activities.nth(0).check();
  await activities.nth(2).check();
  await expect(activities.nth(0)).toBeChecked();
  await expect(activities.nth(2)).toBeChecked();
});
