import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// Small controls keep their drawn size and their place, and take taps in a larger invisible area: 24px
// with a pointer (WCAG 2.5.8), 44px under a finger. The gear room's check boxes are drawn larger instead:
// 24px, and 28px under a finger.
async function openEditor(page: Page) {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
}

// True when a tap `reach` px from the centre of the control, up, down, left and right, lands on it.
async function takesTapsWithin(page: Page, selector: string, reach: number) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((el, r) => {
    const b = el.getBoundingClientRect();
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    return [
      [cx - r, cy],
      [cx + r, cy],
      [cx, cy - r],
      [cx, cy + r],
    ].every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && el.contains(hit);
    });
  }, reach);
}

async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return { width: Math.round(b.width), height: Math.round(b.height) };
}

const CONTROLS = [".lpCommunityHintDismiss", ".lpNotifBell"];

async function openGearRoom(page: Page) {
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    app.__vue_app__.config.globalProperties.$store.commit(
      "setGearRoomOpen",
      true,
    );
  });
  await expect(page.locator(".lpGearRoom")).toBeVisible();
}

test.describe("with a pointer", () => {
  test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

  test("small controls take taps within 11px of their centre", async ({
    page,
  }) => {
    await openEditor(page);
    for (const selector of CONTROLS) {
      expect(await takesTapsWithin(page, selector, 11), selector).toBe(true);
    }
    await openGearRoom(page);
    await expect(
      page.locator(".lpGRCheckCol input[type=checkbox]").first(),
    ).toBeVisible();
    const check = await box(page, ".lpGRCheckCol input[type=checkbox]");
    expect(check.width).toBeGreaterThanOrEqual(24);
    expect(check.height).toBeGreaterThanOrEqual(24);
  });
});

test.describe("under a finger", () => {
  test.use({
    locale: "en-US",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("small controls take taps within 21px of their centre", async ({
    page,
  }) => {
    await openEditor(page);
    for (const selector of CONTROLS) {
      expect(await takesTapsWithin(page, selector, 21), selector).toBe(true);
    }
    await openGearRoom(page);
    await expect(
      page.locator(".lpGRCheckCol input[type=checkbox]").first(),
    ).toBeVisible();
    const check = await box(page, ".lpGRCheckCol input[type=checkbox]");
    expect(check.width).toBeGreaterThanOrEqual(28);
    expect(check.height).toBeGreaterThanOrEqual(28);
  });
});
