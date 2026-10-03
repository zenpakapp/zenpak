import { test, expect, Page } from "@playwright/test";
import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";
import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

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

  // Stripe's success_url is built server-side from config/local.json's deployUrl
  // (hardcoded to http://localhost:8080), which is independent of Playwright's
  // webServer port (3101). This test passes only because a separate app instance
  // is already listening on 8080; in a clean CI environment without it, this wait
  // would timeout rather than fail fast.
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

// --- Task 6: past_due banner + Customer Portal redirect ---
//
// Reuses the Task 1/2 technique of manufacturing a validly-signed Stripe webhook event
// via stripe.webhooks.generateTestHeaderString({ payload, secret }) and POSTing it
// directly to /api/webhooks/stripe, so we can put a user into any billing state
// deterministically instead of waiting on real Stripe webhook delivery.

// Read config/local.json directly (the same file the running server loads its Stripe
// test-mode config from) rather than requiring an env var to be exported before the
// test run — this machine already has real Stripe test-mode values configured there
// (confirmed working in Tasks 1-5), so reading it directly is simpler and equally
// correct, and keeps `npx playwright test` runnable with no extra setup. An env var
// override is still honored first for portability onto other machines/CI.
let localConfig: {
  stripeWebhookSecret?: string;
  stripePriceIdTrailAnnual?: string;
  stripeSecretKey?: string;
} = {};
try {
  const configPath = path.join(__dirname, "../../config/local.json");
  localConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (_) {
  // config/local.json not present in this environment — tests below skip gracefully.
}

const WEBHOOK_SECRET =
  process.env.STRIPE_TEST_WEBHOOK_SECRET ||
  localConfig.stripeWebhookSecret ||
  "";
const KIN_PRICE_ID = localConfig.stripePriceIdTrailAnnual || "";
const STRIPE_SECRET_KEY = localConfig.stripeSecretKey || "";

function signEvent(secret: string, eventObject: unknown) {
  const stripe = new Stripe("sk_test_placeholder_signing_only");
  const body = Buffer.from(JSON.stringify(eventObject));
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
  });
  return { body, signature };
}

test.describe("Billing — past_due banner", () => {
  test.skip(
    !WEBHOOK_SECRET,
    "stripeWebhookSecret not configured — skipping live webhook seed test",
  );

  test("past_due status shows payment-failed banner and Update Payment button", async ({
    page,
    request,
  }) => {
    const username = `billing_pastdue_${Date.now()}`;
    await registerUser(
      page,
      username,
      "testtest",
      `${username}@lighterpack.com`,
    );

    // Seed a fake Stripe customerId on this user via a checkout.session.completed event,
    // then flip them to past_due via invoice.payment_failed — both signed the same way
    // the real webhook-handler.js verifies, so this exercises the real signature path,
    // not a DB write shortcut. Neither handler calls out to the real Stripe API, so a
    // fabricated customerId is fine here (unlike the portal test below).
    const customerId = `cus_e2e_${Date.now()}`;
    const checkoutEvt = signEvent(WEBHOOK_SECRET, {
      id: `evt_e2e_checkout_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { username },
          customer: customerId,
          consent: { terms_of_service: "accepted" },
        },
      },
    });
    await request.post(`${testRoot}api/webhooks/stripe`, {
      data: checkoutEvt.body,
      headers: {
        "stripe-signature": checkoutEvt.signature,
        "content-type": "application/json",
      },
    });

    const failEvt = signEvent(WEBHOOK_SECRET, {
      id: `evt_e2e_fail_${Date.now()}`,
      type: "invoice.payment_failed",
      data: { object: { customer: customerId } },
    });
    await request.post(`${testRoot}api/webhooks/stripe`, {
      data: failEvt.body,
      headers: {
        "stripe-signature": failEvt.signature,
        "content-type": "application/json",
      },
    });

    await page.reload();
    await page.locator(".accountDropdownName").hover();
    await page.getByText("Account Settings").click();

    await expect(
      page.getByText("payment failed", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Update Payment" }),
    ).toBeVisible();
  });
});

test.describe("Billing — portal redirect", () => {
  test.skip(
    !WEBHOOK_SECRET || !STRIPE_SECRET_KEY || !KIN_PRICE_ID,
    "Stripe test-mode config not available — skipping live webhook seed test",
  );

  test("existing Kin subscriber can reach the Stripe Customer Portal", async ({
    page,
    request,
  }) => {
    const username = `billing_portal_${Date.now()}`;
    await registerUser(
      page,
      username,
      "testtest",
      `${username}@lighterpack.com`,
    );

    // Unlike the past_due test above, the webhook handler's customer.subscription.created
    // case calls the REAL stripe.subscriptions.retrieve(obj.id) against Stripe's API (not a
    // stub — see server/webhook-handler.js:81), and clicking "Manage Subscription" calls the
    // real Customer Portal API with this user's customerId. Both therefore need to be
    // genuine Stripe test-mode resources, not fabricated IDs — so we create a real customer
    // and a real active subscription via the Stripe test-mode API first, using the same
    // sk_test key the running server uses, then seed the user's billing state onto that real
    // customer/subscription via the same signed-webhook technique as the past_due test.
    const liveStripe = new Stripe(STRIPE_SECRET_KEY);
    const customer = await liveStripe.customers.create({
      email: `${username}@lighterpack.com`,
    });
    // pm_card_visa is one of Stripe's canned test-mode PaymentMethod tokens — attaching it
    // clones it into a new real PaymentMethod scoped to this customer, so we must use the
    // *returned* id (not the "pm_card_visa" token itself) for the update/subscription calls.
    const paymentMethod = await liveStripe.paymentMethods.attach(
      "pm_card_visa",
      {
        customer: customer.id,
      },
    );
    await liveStripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    });
    const subscription = await liveStripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: KIN_PRICE_ID }],
      default_payment_method: paymentMethod.id,
    });

    const checkoutEvt = signEvent(WEBHOOK_SECRET, {
      id: `evt_e2e_portal_checkout_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { username },
          customer: customer.id,
          consent: { terms_of_service: "accepted" },
        },
      },
    });
    await request.post(`${testRoot}api/webhooks/stripe`, {
      data: checkoutEvt.body,
      headers: {
        "stripe-signature": checkoutEvt.signature,
        "content-type": "application/json",
      },
    });

    const subEvt = signEvent(WEBHOOK_SECRET, {
      id: `evt_e2e_portal_sub_${Date.now()}`,
      type: "customer.subscription.created",
      data: { object: { id: subscription.id, customer: customer.id } },
    });
    await request.post(`${testRoot}api/webhooks/stripe`, {
      data: subEvt.body,
      headers: {
        "stripe-signature": subEvt.signature,
        "content-type": "application/json",
      },
    });

    await page.reload();
    await page.locator(".accountDropdownName").hover();
    await page.getByText("Account Settings").click();
    await page.getByRole("button", { name: "Manage Subscription" }).click();

    await page.waitForURL(/billing\.stripe\.com/, { timeout: 15000 });
    expect(page.url()).toContain("billing.stripe.com");
  });
});
