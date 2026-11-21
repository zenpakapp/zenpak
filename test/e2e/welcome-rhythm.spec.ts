import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

// On a phone the welcome page stacks its three benefits: each title is nearer its own text than the
// block above, and the card text does not leave one word alone on its last line.
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

test("each benefit title sits closer to its text than to the block above", async ({
  page,
}) => {
  await page.goto(testRoot);
  const titles = page.locator(".lpWelcomeFeatureTitle");
  await expect(titles).toHaveCount(3);

  const gaps = await page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll(".lpWelcomeFeatureItem"),
    ) as HTMLElement[];
    return items.slice(1).map((item, index) => {
      const title = item.querySelector(".lpWelcomeFeatureTitle") as HTMLElement;
      const text = title.nextElementSibling as HTMLElement;
      const previous = items[index];
      return {
        above: Math.round(
          title.getBoundingClientRect().top -
            previous.getBoundingClientRect().bottom,
        ),
        below: Math.round(
          text.getBoundingClientRect().top -
            title.getBoundingClientRect().bottom,
        ),
      };
    });
  });
  expect(gaps).toHaveLength(2);
  for (const { above, below } of gaps) {
    expect(above, `above ${above}px, below ${below}px`).toBeGreaterThan(below);
  }
});

test("the card text balances its last line", async ({ page }) => {
  await page.goto(testRoot);
  await expect(page.locator(".lpWelcomeCardText").first()).toBeVisible();
  const wrap = await page
    .locator(".lpWelcomeCardText")
    .first()
    .evaluate((el) => getComputedStyle(el).textWrap);
  expect(wrap).toMatch(/pretty|balance/);
});
