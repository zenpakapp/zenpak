import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// A moderator can offer Wayfarer or Kin for a few months from the moderation tab, and an
// account holding an offered plan sees it as an offer, with its end date, instead of a
// Stripe subscription it could manage.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

async function signUp(page) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `of${now}`, "testtest", `of+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
}

test("a moderator offers a plan from the moderation tab", async ({ page }) => {
  test.setTimeout(60000);
  await signUp(page);

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search*", (route) =>
    route.fulfill({
      json: {
        results: [
          { username: "alice", email: "alice@example.com", library: {} },
        ],
      },
    }),
  );
  const bodies = [];
  let answer = {
    status: 200,
    json: {
      ok: true,
      plan: "creator",
      currentPeriodEnd: "2027-01-19T12:00:00.000Z",
    },
  };
  await page.route("**/moderation/offer-plan", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill(answer);
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();
  await page.locator(".lp-moderation-search").fill("alice");
  await page.locator(".lpModerationSearch button").click();
  await page
    .locator(".lp-moderation-search-results")
    .getByText("alice")
    .click();

  const offer = page.locator(".lp-moderation-offer");
  await expect(offer).toBeVisible();
  await offer.locator(".lp-moderation-offer-plan").selectOption("creator");
  await offer.locator(".lp-moderation-offer-months").fill("3");
  await offer.locator(".lp-moderation-offer-submit").click();

  await expect(offer.locator(".lp-moderation-offer-result")).toContainText(
    "Wayfarer",
  );
  await expect(offer.locator(".lp-moderation-offer-result")).toContainText(
    "2027",
  );
  expect(bodies[0]).toEqual({ username: "alice", plan: "creator", months: 3 });

  // Kin, another duration.
  await offer.locator(".lp-moderation-offer-plan").selectOption("supporter");
  await offer.locator(".lp-moderation-offer-months").fill("6");
  answer = {
    status: 200,
    json: {
      ok: true,
      plan: "supporter",
      currentPeriodEnd: "2027-04-19T12:00:00.000Z",
    },
  };
  await offer.locator(".lp-moderation-offer-submit").click();
  await expect(offer.locator(".lp-moderation-offer-result")).toContainText(
    "Kin",
  );
  expect(bodies[1]).toEqual({
    username: "alice",
    plan: "supporter",
    months: 6,
  });

  // A refused offer says why, and shows no success.
  answer = {
    status: 409,
    json: {
      code: "active-subscription",
      message: "This account has an active subscription.",
    },
  };
  await offer.locator(".lp-moderation-offer-submit").click();
  await expect(offer.locator(".lp-moderation-offer-error")).toContainText(
    "active subscription",
  );
  await expect(offer.locator(".lp-moderation-offer-result")).toHaveCount(0);
});

test("a moderator withdraws a running offer", async ({ page }) => {
  test.setTimeout(60000);
  await signUp(page);

  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, isModerator: true } });
  });
  await page.route("**/api/reports", (route) =>
    route.fulfill({ json: { reports: [] } }),
  );
  await page.route("**/moderation/search*", (route) =>
    route.fulfill({
      json: {
        results: [
          {
            username: "alice",
            email: "alice@example.com",
            library: {},
            offer: {
              plan: "creator",
              currentPeriodEnd: "2027-01-19T12:00:00.000Z",
            },
          },
          {
            username: "bob",
            email: "bob@example.com",
            library: {},
            offer: null,
          },
        ],
      },
    }),
  );
  const bodies = [];
  await page.route("**/moderation/revoke-offer", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, plan: "creator" } });
  });

  await page.evaluate(() =>
    (window as any).LighterPack.$router.push("/community"),
  );
  await page
    .locator(".lpCommunityTab")
    .filter({ hasText: "Moderation" })
    .click();
  await page.locator(".lp-moderation-search").fill("a");
  await page.locator(".lpModerationSearch button").click();

  // An account with no offer has nothing to withdraw.
  const offer = page.locator(".lp-moderation-offer");
  await page.locator(".lp-moderation-search-results").getByText("bob").click();
  await expect(offer).toBeVisible();
  await expect(offer.locator(".lp-moderation-offer-revoke")).toHaveCount(0);

  // An account on an offer shows it, and the offer can be withdrawn.
  await page
    .locator(".lp-moderation-search-results")
    .getByText("alice")
    .click();
  const current = offer.locator(".lp-moderation-offer-current");
  await expect(current).toContainText("Wayfarer");
  await expect(current).toContainText("2027");
  await offer.locator(".lp-moderation-offer-revoke").click();

  await expect(offer.locator(".lp-moderation-offer-result")).toContainText(
    "withdrawn",
  );
  await expect(current).toHaveCount(0);
  expect(bodies).toEqual([{ username: "alice" }]);
});

test("an offered plan shows as an offer with its end date", async ({
  page,
}) => {
  test.setTimeout(60000);
  await signUp(page);
  await page.route("**/api/billing/me", (route) =>
    route.fulfill({
      json: {
        plan: "creator",
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2027-01-19T12:00:00.000Z",
        provider: "comp",
        interval: "offer",
        subscriptionId: null,
        stripeEnabled: true,
      },
    }),
  );
  await page.locator(".accountDropdownTarget").hover();
  await page
    .getByText("Account Settings", { exact: true })
    .dispatchEvent("click");

  const offer = page.locator(".accountBillingOffer");
  await expect(offer).toBeVisible({ timeout: 15000 });
  await expect(offer).toContainText("Wayfarer");
  await expect(offer).toContainText(/offered/i);
  await expect(offer).toContainText("2027");
  // There is no Stripe subscription to manage.
  await expect(
    page.getByRole("button", { name: /manage subscription/i }),
  ).toHaveCount(0);
});
