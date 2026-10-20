import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

// The visit statistics (Umami) are off here, so a stand-in `window.umami` records what the app
// would send. Only the names of a few actions go out: no username, no e-mail, no list name.
async function recordUmami(page) {
  await page.addInitScript(() => {
    (window as any).__umamiEvents = [];
    (window as any).umami = {
      track: (...args) => (window as any).__umamiEvents.push(args),
    };
  });
}
const events = (page) => page.evaluate(() => (window as any).__umamiEvents);

test("signing up and publishing a list send only the name of the action", async ({
  page,
}) => {
  test.setTimeout(90000);
  await recordUmami(page);
  const now = Date.now();
  const username = `an${now}`;
  await registerUser(page, username, "testtest", `an+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({
    timeout: 35000,
  });
  expect(await events(page)).toContainEqual(["signup"]);

  await verifyUserEmail(username);
  const published = page.waitForResponse(
    (response) =>
      response.url().endsWith("/publish") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 35000 },
  );
  await page.getByText("Share", { exact: true }).hover();
  await published;
  await expect
    .poll(async () => (await events(page)).map((entry) => entry[0]))
    .toContain("list-published");

  // Nothing about the person or the list is in what was sent.
  const sent = JSON.stringify(await events(page));
  expect(sent).not.toContain(username);
  expect(sent).not.toContain("lighterpack.com");
});

test("nothing fails when the statistics script is not there", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = Date.now();
  await registerUser(page, `na${now}`, "testtest", `na+${now}@lighterpack.com`);
  await expect(page.locator(".accountDropdownName")).toBeVisible({
    timeout: 35000,
  });
  expect(await page.evaluate(() => typeof (window as any).umami)).toBe(
    "undefined",
  );
});
