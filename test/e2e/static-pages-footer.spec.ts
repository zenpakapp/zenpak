import { test, expect } from "@playwright/test";

// The pages the server renders share one footer, the same links as the app's home page, each page
// linking to itself too.
const PAGES = ["/pricing", "/privacy", "/terms", "/legal"];
const LINKS = [
  { text: "Open source", href: "https://github.com/zenpakapp/zenpak" },
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
    // The page's own link is there too, when the footer has one (it has no pricing link).
    const own = LINKS.some((link) => link.href === path) ? 1 : 0;
    await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(own);
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
