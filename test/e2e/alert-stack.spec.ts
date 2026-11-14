import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Alerts are one stack with one colour: green when every alert is a success, orange as soon as
// one warning or error is in it (never a mix of colours in the same stack).
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("success-only alerts are green, a mixed stack is one orange stack", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `as${now}`, "testtest", `as+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".lpGlobalAlerts")).toHaveCount(0, {
    timeout: 12000,
  });

  const push = (message: string) =>
    page.evaluate((m) => {
      const app = (document.querySelector("#app") ||
        document.body.firstElementChild) as any;
      app.__vue_app__.config.globalProperties.$store.commit("pushGlobalAlert", {
        message: m,
      });
    }, message);
  const background = () =>
    page
      .locator(".lpGlobalAlerts")
      .evaluate((el) => getComputedStyle(el).backgroundColor);

  await push("Saved.");
  const stack = page.locator(".lpGlobalAlerts");
  await expect(stack).toHaveClass(/lpGlobalAlertsInfo/);
  const green = await background();
  expect(green).toBe("rgb(45, 122, 79)");

  await push("An error occurred, please try again later.");
  await expect(page.locator(".lpGlobalAlerts")).toHaveCount(1);
  await expect(page.locator(".lpGlobalAlert")).toHaveCount(2);
  await expect(stack).not.toHaveClass(/lpGlobalAlertsInfo/);
  expect(await background()).not.toBe(green);
});
