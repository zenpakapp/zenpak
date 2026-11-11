import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The header popovers (Share, List settings, account) can be opened with the keyboard, their
// controls are not tab stops while closed, and Share stays open once clicked.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("header popovers open with the keyboard and hide their controls when closed", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `pk${now}`, "testtest", `pk+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  // The welcome toast sits over the header until it fades.
  await expect(page.locator(".lpGlobalAlerts")).toHaveCount(0, { timeout: 20000 });

  const share = page.locator("#header [aria-haspopup='true']", {
    hasText: "Share",
  });
  await expect(share).toHaveAttribute("aria-expanded", "false");

  // Closed: the popover's fields are hidden, so Tab cannot land on them.
  await expect(page.locator(".sharePopover")).toBeHidden();

  // Enter opens it, Escape closes it and puts focus back on the trigger.
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(share).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#shareUrl")).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(page.locator(".sharePopover")).toBeHidden();
  await expect(share).toBeFocused();

  // Opening it for an unverified account raises a toast over the header: dismiss it.
  const dismiss = page.locator(".lpGlobalAlertDismiss");
  await expect(dismiss.first()).toBeVisible({ timeout: 15000 });
  while (await dismiss.count()) await dismiss.first().click();

  // A click opens it and it stays open when the pointer leaves.
  await share.click();
  await expect(page.locator("#shareUrl")).toBeVisible({ timeout: 15000 });
  await page.mouse.move(5, 500);
  await page.waitForTimeout(400);
  await expect(page.locator("#shareUrl")).toBeVisible();
  await share.click();
  await expect(page.locator(".sharePopover")).toBeHidden();

  // The account menu opens on focus, and Tab moves into its links.
  const account = page.locator("#header [aria-haspopup='true']").last();
  await account.focus();
  await expect(account).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(
    page.locator(".accountDropdownMenu a:focus, .accountDropdownMenu :focus"),
  ).toHaveCount(1);
});

test("the skip link is the first Tab stop and moves focus to the list", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sk${now}`, "testtest", `sk+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // It comes before every other tab stop in the page.
  const skip = page.locator(".lpSkipLink");
  expect(
    await page.evaluate(
      () =>
        document.querySelector(
          "a[href], button, input, select, textarea, [tabindex='0']",
        )?.className,
    ),
  ).toBe("lpSkipLink");

  // Hidden until focused, then it takes the list.
  await expect(skip).not.toBeInViewport();
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lpListBody")).toBeFocused();
});
