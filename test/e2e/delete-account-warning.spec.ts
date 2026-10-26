import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Deleting the account cancels a Stripe subscription at once, without refunding the rest of the
// period. The dialog says so, but only to an account that is actually being billed.
test.use({ locale: "en-US" });

async function openDeleteDialog(page, billing) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `dw${now}`, "testtest", `dw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.route("**/api/billing/me", (route) =>
    route.fulfill({ json: billing }),
  );
  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");
  await page.getByText("Delete account").click();
  await expect(page.locator("#deleteAccount")).toBeVisible();
}

const stripeBilling = {
  plan: "supporter",
  status: "active",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: "2027-10-26T00:00:00.000Z",
  provider: "stripe",
  interval: "year",
  subscriptionId: "sub_123",
  stripeEnabled: true,
};

test("an account with a Stripe subscription is warned before deleting", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openDeleteDialog(page, stripeBilling);
  const warning = page.locator(
    "#deleteAccount [data-test=subscription-warning]",
  );
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("cancelled immediately");
  await expect(warning).toContainText("not be refunded");
  await expect(warning).toContainText("14 days");
  await expect(warning).toContainText("support@zenpak.app");
});

test("a free account, or an offered plan, is not warned", async ({ page }) => {
  test.setTimeout(60000);
  await openDeleteDialog(page, {
    plan: "supporter",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    provider: "comp",
    interval: null,
    subscriptionId: null,
    stripeEnabled: true,
  });
  await expect(page.locator("#deleteAccount")).toBeVisible();
  await expect(
    page.locator("#deleteAccount [data-test=subscription-warning]"),
  ).toHaveCount(0);
});
