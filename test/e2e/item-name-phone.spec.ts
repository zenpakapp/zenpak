import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// On a phone the name of an Item in its dialog takes two lines before it is cut: one line kept about
// seven letters of "Down hoodie".
test.use({
  locale: "en-US",
  viewport: { width: 360, height: 780 },
  hasTouch: true,
  isMobile: true,
});

async function openWithName(page, name: string) {
  const library = createEditorLibrary(12, 4) as any;
  library.items[0].name = name;
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);
  await page.locator(".lpItem[data-item-id]").first().dblclick();
  await expect(page.locator(".itemDetailName")).toBeVisible();
  return page.locator(".itemDetailName").evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return {
      lines: Math.round(el.clientHeight / lineHeight),
      // Cut at the end of a line (the old one-line ellipsis) or cut below the second line.
      clipped:
        el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1,
    };
  });
}

test("a name of a few words shows in full on two lines", async ({ page }) => {
  const shown = await openWithName(page, "Down hoodie");
  expect(shown.clipped).toBe(false);
  expect(shown.lines).toBeLessThanOrEqual(2);
});

test("a very long name stops at two lines and keeps its full text in a tooltip", async ({
  page,
}) => {
  const long =
    "Ultralight packable down hoodie with a very long descriptive name that never ends ".repeat(
      3,
    );
  const shown = await openWithName(page, long);
  expect(shown.lines).toBeLessThanOrEqual(2);
  await expect(page.locator(".itemDetailName")).toHaveAttribute("title", long);
});
