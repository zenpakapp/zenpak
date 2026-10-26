import { test, expect } from "@playwright/test";
import fs from "fs";

import { registerUser } from "./auth-utils";

// Every account, free or paid, can download its data in one file.
test.use({ locale: "en-US" });

test("a free account downloads its data, without any secret", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `ex${now}`;
  await registerUser(page, username, "testtest", `ex+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");
  const link = page.getByRole("link", { name: "Download my data" });
  await expect(link).toBeVisible();

  const download = page.waitForEvent("download");
  await link.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`zenpak-data-${username}.json`);

  const text = fs.readFileSync(await file.path(), "utf-8");
  const data = JSON.parse(text);
  expect(data.format).toBe("zenpak-account-export-v1");
  expect(data.account.username).toBe(username);
  expect(data.account.email).toBe(`ex+${now}@lighterpack.com`);
  expect(data.account.plan).toBe("free");
  expect(Array.isArray(data.library.lists)).toBe(true);
  // No password hash, token or Stripe identifier, whatever the account holds.
  expect(text).not.toMatch(
    /"(password|token|resetToken|emailVerifyToken|setupToken|customerId)"/,
  );
});

test("the export needs a signed-in account", async ({ request }) => {
  const response = await request.get("/api/account/export", {
    headers: { cookie: "" },
  });
  expect([401, 404]).toContain(response.status());
});
