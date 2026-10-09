import { test, expect } from "@playwright/test";
import { testRoot } from "./utils";

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

// Without the viewport meta a mobile browser lays the SPA out at 980px wide.
test("SPA shell declares a device-width viewport", async ({ page }) => {
  await page.goto(`${testRoot}/welcome`);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /width=device-width/,
  );
  expect(await page.evaluate(() => window.innerWidth)).toBe(375);
});
