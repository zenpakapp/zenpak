import { test, expect, Page } from "@playwright/test";
import { registerUser } from "./auth-utils";

async function completeStripeCheckout(page: Page, email: string) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });

  // Email is pre-filled read-only by Stripe (the session was created with a
  // known customer email) — there is no editable input to fill.

  // The "Card" payment method starts collapsed; its fields aren't rendered
  // (and can't be filled) until the accordion row is selected. The radio
  // input is visually covered by Stripe's custom row styling, so a plain
  // click doesn't register as a "stable, receives-events" target — force it.
  await page
    .locator("#payment-method-accordion-item-title-card")
    .click({ force: true });

  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12/34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Test User");

  // Billing country defaults to France already on this test account; the
  // address field starts as a single Google-autocomplete input. Switch to
  // manual entry so the line1/postal/city inputs are fillable directly
  // instead of driving an autocomplete dropdown.
  const manualAddressLink = page.getByText("Enter address manually");
  if (await manualAddressLink.count()) await manualAddressLink.click();

  const line1 = page.locator("#billingAddressLine1");
  if (await line1.count()) await line1.fill("1 Rue de Test");
  const postal = page.locator("#billingPostalCode");
  if (await postal.count()) await postal.fill("75001");
  const locality = page.locator("#billingLocality");
  if (await locality.count()) await locality.fill("Paris");

  // The ToS checkbox is likewise visually custom-styled — force it too.
  const tosCheckbox = page.locator("#termsOfServiceConsentCheckbox");
  if (await tosCheckbox.count()) await tosCheckbox.check({ force: true });

  await page.getByTestId("hosted-payment-submit-button").click();

  await page.waitForURL(/billing=success/, { timeout: 20000 });
  expect(page.url()).toContain("billing=success");
}

test.describe("Billing — Checkout redirect", () => {
  test("Base user can start Kin checkout and complete real Stripe test-mode payment", async ({
    page,
  }) => {
    const username = `billing_kin_${Date.now()}`;
    const email = `${username}@lighterpack.com`;
    await registerUser(page, username, "testtest", email);

    await page.locator(".accountDropdownName").hover();
    await page.getByText("Account Settings").click();

    await page.getByRole("button", { name: "Upgrade to Kin" }).click();
    await completeStripeCheckout(page, email);
  });

  test("Base user can start Wayfarer monthly checkout and complete real Stripe test-mode payment", async ({
    page,
  }) => {
    const username = `billing_wayfarer_${Date.now()}`;
    const email = `${username}@lighterpack.com`;
    await registerUser(page, username, "testtest", email);

    await page.locator(".accountDropdownName").hover();
    await page.getByText("Account Settings").click();

    await page.getByRole("button", { name: "Upgrade to Wayfarer" }).click();
    await completeStripeCheckout(page, email);
  });
});
