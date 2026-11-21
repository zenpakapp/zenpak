import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The buttons at the foot of an Item's dialog never run into each other or out of the dialog on a phone,
// whatever the language: "Retirer de la liste" is the longest label in French.
test.use({
  viewport: { width: 360, height: 780 },
  hasTouch: true,
  isMobile: true,
});

// The language is the browser's: test.use({ locale }) below sets it.
async function openFooter(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.locator(".lpItem[data-item-id]").first().dblclick();
  await expect(page.locator(".itemDetailFooter")).toBeVisible();
}

for (const locale of ["en-US", "fr-FR", "de-DE", "es-ES"]) {
  test.describe(locale, () => {
    test.use({ locale });

    test("the footer buttons stay apart and inside their column", async ({
      page,
    }) => {
      await openFooter(page);
      const result = await page.evaluate(() => {
        const footer = document.querySelector(
          ".itemDetailFooter",
        ) as HTMLElement;
        const fb = footer.getBoundingClientRect();
        const items = Array.from(footer.children) as HTMLElement[];
        const boxes = items.map((el) => el.getBoundingClientRect());
        const overlaps: string[] = [];
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i];
            const b = boxes[j];
            const apart =
              a.right <= b.left + 0.5 ||
              b.right <= a.left + 0.5 ||
              a.bottom <= b.top + 0.5 ||
              b.bottom <= a.top + 0.5;
            if (!apart)
              overlaps.push(
                `${items[i].textContent?.trim()} / ${items[j].textContent?.trim()}`,
              );
          }
        }
        const clipped = items
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent?.trim());
        const outside = boxes.some(
          (b) => b.left < fb.left - 0.5 || b.right > fb.right + 0.5,
        );
        return { overlaps, clipped, outside, count: items.length };
      });
      expect(result.count).toBeGreaterThanOrEqual(4);
      expect(result.overlaps).toEqual([]);
      expect(result.clipped).toEqual([]);
      expect(result.outside).toBe(false);
    });
  });
}
