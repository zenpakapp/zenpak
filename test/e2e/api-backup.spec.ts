import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// GET /api/backup returns the library of the signed-in account as a download, and nothing else.
test.use({ locale: "en-US" });

test("the backup route needs a signed-in account", async ({ request }) => {
  const response = await request.get("/api/backup", {
    headers: { cookie: "" },
  });
  expect(response.status()).toBe(401);
});

test("the backup route returns the library as a named JSON file, without any secret", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `bk${now}`;
  await registerUser(page, username, "testtest", `bk+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const response = await page.request.get(`${testRoot}api/backup`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["content-disposition"]).toMatch(
    new RegExp(
      `attachment; filename="zenpak-backup-${username}-\\d{4}-\\d{2}-\\d{2}\\.json"`,
    ),
  );

  const text = await response.text();
  const data = JSON.parse(text);
  expect(data.username).toBe(username);
  expect(Array.isArray(data.library.lists)).toBe(true);
  expect(text).not.toMatch(
    /"(password|token|resetToken|emailVerifyToken|setupToken|customerId)"/,
  );
});
