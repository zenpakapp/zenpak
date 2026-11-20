import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// On an iPhone a long press on a row selected its text, and a finger on a handle scrolled the whole
// page instead of dragging the row. Safari ignores a touchmove cancelled on the document, so the
// handles cancel it themselves; a row is not selectable on a touch screen, a field in it still is.
async function openEditor(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await page.locator(".lpItem[data-item-id]").first().waitFor();
}

const style = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate(
      (el, p) => getComputedStyle(el)[p as keyof CSSStyleDeclaration] as string,
      prop,
    );

test.describe("on a touch screen", () => {
  test.use({
    locale: "en-US",
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  test("a row is not selectable, its fields are", async ({ page }) => {
    await openEditor(page);
    expect(await style(page, ".lpItem[data-item-id]", "userSelect")).toBe(
      "none",
    );
    expect(await style(page, ".lpItemsHeader", "userSelect")).toBe("none");
    expect(
      await style(page, ".lpItem[data-item-id] input.lpName", "userSelect"),
    ).not.toBe("none");
    expect(await style(page, "input.lpCategoryName", "userSelect")).not.toBe(
      "none",
    );
  });

  test("a handle keeps the finger: no scroll, no selection", async ({
    page,
  }) => {
    await openEditor(page);
    for (const handle of [".lpItemHandle", ".lpCategoryHandle"]) {
      expect(await style(page, handle, "touchAction")).toBe("none");
      expect(await style(page, handle, "userSelect")).toBe("none");
      // The handle cancels the touchmove itself, as Safari ignores a cancel on the document.
      const prevented = await page
        .locator(handle)
        .first()
        .evaluate((el) => {
          const event = new Event("touchmove", {
            bubbles: true,
            cancelable: true,
          });
          el.dispatchEvent(event);
          return event.defaultPrevented;
        });
      expect(prevented, handle).toBe(true);
    }
  });
});

test.describe("with a mouse", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("a row stays selectable", async ({ page }) => {
    await openEditor(page);
    expect(await style(page, ".lpItem[data-item-id]", "userSelect")).not.toBe(
      "none",
    );
  });
});
