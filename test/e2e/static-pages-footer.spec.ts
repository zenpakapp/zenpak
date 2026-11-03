import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The pages the server renders share one footer, the same links as the app's home page, each page
// linking to itself too.
const PAGES = ["/pricing", "/privacy", "/terms", "/legal"];
const LINKS = [
  { text: "About", href: "/about" },
  { text: "Open source", href: "https://github.com/zenpakapp/zenpak" },
  { text: "Pricing", href: "/pricing" },
  { text: "Privacy", href: "/privacy" },
  { text: "Terms", href: "/terms" },
  { text: "Legal", href: "/legal" },
  { text: "Contact", href: "mailto:support@zenpak.app" },
];

for (const path of PAGES) {
  test(`${path} has the shared footer`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator("footer a");
    await expect(links).toHaveCount(LINKS.length);
    for (const [index, expected] of LINKS.entries()) {
      await expect(links.nth(index)).toHaveText(expected.text);
      await expect(links.nth(index)).toHaveAttribute("href", expected.href);
    }
    // The page's own link is there too.
    await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(1);
  });
}

test("the Open source link opens in a new tab without leaking the opener", async ({
  page,
}) => {
  await page.goto("/legal");
  const link = page.locator('footer a[href^="https://github.com"]');
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("the welcome page footer links to pricing", async ({ page }) => {
  await page.goto("/welcome");
  await expect(
    page.locator('#lpWelcomeFooter a[href="/pricing"]'),
  ).toHaveCount(1);
});

test("the footer of a signed-in account links to about and pricing", async ({ page }) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `fp${now}`, "testtest", `fp+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(page.locator('#lpFooter a[href="/pricing"]')).toHaveCount(1);
  await expect(page.locator('#lpFooter a[href="/about"]')).toHaveCount(1);
});
