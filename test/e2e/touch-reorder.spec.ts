import path from "path";

import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Dragging an item by its handle must work with a finger, not only with a mouse: real touch events
// (touchstart, touchmove, touchend) sent through the browser, on a phone-sized screen.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test("an item is reordered by dragging its handle with a finger", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `tr${now}`, "testtest", `tr+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }

  // On a phone the import menu is in the sidebar, and a touch screen has no hover: tap to open both.
  await page.locator("#hamburger").tap();
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".listContainerHeader a.lpAdd").first().tap();
  await page.getByRole("button", { name: "Import a CSV file" }).click();
  await (
    await chooser
  ).setFiles(path.join(process.cwd(), "test/fixtures/csv/reorder.csv"));
  await page.locator("#importConfirm").click();
  // The open drawer covers the hamburger: tap the dimmed strip beside it to close it.
  await page.locator(".lpSidebarOverlay").tap({ position: { x: 366, y: 300 } });
  await expect(page.locator(".lpSidebarOverlay")).toBeHidden();
  await expect(page.locator("#sidebar")).not.toBeInViewport();
  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(3, { timeout: 15000 });
  const names = () =>
    rows.evaluateAll((els) =>
      els.map(
        (el) => (el.querySelector("input.lpName") as HTMLInputElement).value,
      ),
    );
  await expect.poll(names).toEqual(["Alpha", "Bravo", "Charlie"]);

  // The three rows must be on the screen: a touch outside it grabs nothing.
  await rows.nth(0).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, document.querySelector(".lpItem[data-item-id]")!.getBoundingClientRect().top - 120));

  const handle = (i: number) => rows.nth(i).locator(".lpItemHandle");
  await expect(handle(2)).toBeVisible();
  const from = (await handle(2).boundingBox())!;
  const to = (await rows.nth(0).boundingBox())!;
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  const targetY = to.y + 4;

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, ty?: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: ty === undefined ? [] : [{ x, y: ty }],
    });
  await touch("touchStart", y);
  const steps = 12;
  for (let i = 1; i <= steps; i += 1) {
    await touch("touchMove", y + ((targetY - y) * i) / steps);
    await page.waitForTimeout(30);
  }
  await touch("touchEnd");

  await expect
    .poll(names, { timeout: 5000 })
    .toEqual(["Charlie", "Alpha", "Bravo"]);
});
