import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

// On a phone a heading that wraps must not leave a short last line ("6. Right of withdrawal and
// immediate performance" ended on one short line).
test.use({ locale: "en-US", viewport: { width: 390, height: 844 } });

for (const path of ["terms", "privacy", "legal", "pricing"]) {
  test(`headings of /${path} wrap evenly on a phone`, async ({ page }) => {
    await page.goto(`${testRoot}${path}`);
    const ratios = await page.locator("h1, h2").evaluateAll((headings) =>
      headings.flatMap((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const lines = new Map<number, number>();
        for (const r of Array.from(range.getClientRects())) {
          const top = Math.round(r.top);
          lines.set(top, (lines.get(top) || 0) + r.width);
        }
        const widths = Array.from(lines.values());
        if (widths.length < 2) return [];
        return [widths[widths.length - 1] / widths[widths.length - 2]];
      }),
    );
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(0.5);
  });
}
