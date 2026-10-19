import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// The affiliate rules editor says what each field is for, explains what a rule applies to
// for the chosen type, and warns when a "domain" is not a web address (the rule would match no
// item and its promo code would show without a link). The two fields that did nothing are gone.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

async function openRules(page) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gw${now}`, "testtest", `gw+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.goto(testRoot);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  // The Guide page sends other plans away; a reload would drop the plan set in the store.
  await page.evaluate(() => {
    const app = window.LighterPack;
    app.$store.state.library.entitlements = { plan: "creator" };
    app.$router.push("/guide");
  });
  await expect(page.locator(".lpGuide")).toBeVisible();
  await page.locator(".lpGuideAddRule").click();
  return page.locator(".lpGuideRule").first();
}

test("each field of a rule is labelled and the dead ones are gone", async ({
  page,
}) => {
  test.setTimeout(60000);
  const rule = await openRules(page);

  const labels = await rule.locator(".lpGuideRuleFieldLabel").allTextContents();
  expect(labels.map((text) => text.trim())).toEqual([
    "Applies to",
    "Brand name",
    "Promo code",
    "Text shown",
  ]);

  // The second label follows the type.
  await rule.locator("select").selectOption("domain");
  await expect(rule.locator(".lpGuideRuleFieldLabel").nth(1)).toHaveText(
    "Website",
  );
  await rule.locator("select").selectOption("shop");
  await expect(rule.locator(".lpGuideRuleFieldLabel").nth(1)).toHaveText(
    "Shop name",
  );
  // These two were stored but never used: "affiliate URL (replaces)" and "append parameter".
  await expect(rule.getByPlaceholder(/affiliate url/i)).toHaveCount(0);
  await expect(rule.getByPlaceholder(/append param/i)).toHaveCount(0);
  await expect(rule.locator("input")).toHaveCount(3);
});

test("the help follows the type of the rule", async ({ page }) => {
  test.setTimeout(60000);
  const rule = await openRules(page);
  const help = rule.locator(".lpGuideRuleHelp");

  await rule.locator("select").selectOption("brand");
  await expect(help).toContainText(/brand/i);
  await rule.locator("select").selectOption("shop");
  await expect(help).toContainText(/shop/i);
  await rule.locator("select").selectOption("domain");
  await expect(help).toContainText("zpacks.com");
});

test("a domain rule that is not an address gets a warning", async ({
  page,
}) => {
  test.setTimeout(60000);
  const rule = await openRules(page);
  const warning = rule.locator(".lpGuideRuleWarning");
  const nameInput = rule.locator("input").first();

  // A brand is a name: nothing to warn about.
  await rule.locator("select").selectOption("brand");
  await nameInput.fill("Zpacks");
  await expect(warning).toHaveCount(0);

  // A domain that is a name, not an address.
  await rule.locator("select").selectOption("domain");
  await nameInput.fill("Lyoplilisé");
  await expect(warning).toHaveCount(1);
  await expect(warning).toContainText(/not look like a domain/i);

  // Real addresses, however they are written: no warning.
  await nameInput.fill("zpacks.com");
  await expect(warning).toHaveCount(0);
  await nameInput.fill("https://www.zpacks.com/promo");
  await expect(warning).toHaveCount(0);

  // An empty value is not flagged: the row is simply unfinished.
  await nameInput.fill("");
  await expect(warning).toHaveCount(0);
});
