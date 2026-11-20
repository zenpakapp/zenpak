import path from "path";

import { test, expect, type Page, type Locator } from "@playwright/test";

import { registerUser } from "./auth-utils";

// Dragging a row by its handle must work with a finger, not only with a mouse: real touch events
// (touchstart, touchmove, touchend) sent through the browser, on a phone-sized screen. Before the
// handles had touch-action: none, a finger on one scrolled the page and nothing was reordered.
test.use({
  locale: "en-US",
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

async function signUp(page: Page, prefix: string) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(
    page,
    `${prefix}${now}`,
    "testtest",
    `${prefix}+${now}@lighterpack.com`,
  );
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  for (let i = 0; i < 5; i += 1) {
    const dismiss = page.locator(".lpGlobalAlertDismiss").first();
    if (!(await dismiss.isVisible().catch(() => false))) break;
    await dismiss.click();
  }
}

async function importCsv(page: Page, file: string) {
  // On a phone the import menu is in the sidebar, and a touch screen has no hover: tap to open both.
  await page.locator("#hamburger").tap();
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".listContainerHeader a.lpAdd").first().tap();
  await page.getByRole("button", { name: "Import a CSV file" }).click();
  await (
    await chooser
  ).setFiles(path.join(process.cwd(), "test/fixtures/csv", file));
  await page.locator("#importConfirm").click();
  // The open drawer covers the hamburger: tap the dimmed strip beside it to close it.
  await page.locator(".lpSidebarOverlay").tap({ position: { x: 366, y: 300 } });
  await expect(page.locator(".lpSidebarOverlay")).toBeHidden();
  await expect(page.locator("#sidebar")).not.toBeInViewport();
}

// Put the first row `top` px from the top of the screen, so every row of a short list is visible.
async function scrollFirstTo(page: Page, first: Locator, top: number) {
  await first.scrollIntoViewIfNeeded();
  await first.evaluate((el, t) => {
    window.scrollBy(0, el.getBoundingClientRect().top - t);
  }, top);
}

// A finger goes down on `handle`, slides to `targetY` in small steps and lifts.
async function fingerDrag(
  page: Page,
  handle: Locator,
  targetY: number,
  holdMs = 0,
) {
  await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
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
  if (holdMs) {
    // The finger rests on the target, as a person's does; one more move refreshes what is under it.
    await page.waitForTimeout(holdMs);
    await touch("touchMove", targetY + 1);
  }
  await touch("touchEnd");
}

test("an item is reordered by dragging its handle with a finger", async ({
  page,
}) => {
  test.setTimeout(90000);
  await signUp(page, "tr");
  await importCsv(page, "reorder.csv");

  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(3, { timeout: 15000 });
  const names = () =>
    rows.evaluateAll((els) =>
      els.map(
        (el) => (el.querySelector("input.lpName") as HTMLInputElement).value,
      ),
    );
  await expect.poll(names).toEqual(["Alpha", "Bravo", "Charlie"]);

  await scrollFirstTo(page, rows.nth(0), 120);
  const target = (await rows.nth(0).boundingBox())!.y + 4;
  await fingerDrag(page, rows.nth(2).locator(".lpItemHandle"), target);

  await expect
    .poll(names, { timeout: 5000 })
    .toEqual(["Charlie", "Alpha", "Bravo"]);
});

test("a category is reordered by dragging its handle with a finger", async ({
  page,
}) => {
  test.setTimeout(90000);
  await signUp(page, "tc");
  await importCsv(page, "reorder-categories.csv");

  const categories = page.locator(".lpCategory");
  await expect(categories).toHaveCount(3, { timeout: 15000 });
  const names = () =>
    categories.evaluateAll((els) =>
      els.map((el) => el.querySelector("h3")!.textContent!.trim()),
    );
  await expect.poll(names).toEqual(["Shelter", "Cooking", "Clothing"]);

  await scrollFirstTo(page, categories.nth(0), 100);
  const target = (await categories.nth(0).boundingBox())!.y + 4;
  await fingerDrag(
    page,
    categories.nth(2).locator(".lpCategoryHandle"),
    target,
  );

  await expect
    .poll(names, { timeout: 5000 })
    .toEqual(["Clothing", "Shelter", "Cooking"]);
});

test("a list in the sidebar is reordered by dragging its handle with a finger", async ({
  page,
}) => {
  test.setTimeout(90000);
  await signUp(page, "tl");

  await page.locator("#hamburger").tap();
  for (let i = 0; i < 2; i += 1) {
    await page.locator(".listContainerHeader .lpTarget .lpAdd").tap();
    await page.getByText("New blank list", { exact: false }).first().tap();
    await expect(page.locator("#lists .lpLibraryList")).toHaveCount(i + 2, {
      timeout: 10000,
    });
  }
  // The names are alike, so the order is read from where the active list ends up.
  const lists = page.locator("#lists .lpLibraryList");
  const activeIndex = () =>
    lists.evaluateAll((els) =>
      els.findIndex((el) => el.classList.contains("lpActive")),
    );
  const before = await activeIndex();

  const first = (await lists.nth(0).boundingBox())!;
  await fingerDrag(page, lists.nth(2).locator(".lpHandle"), first.y + 4);

  await expect.poll(activeIndex, { timeout: 5000 }).not.toBe(before);
});

// On a phone the open drawer covers the editor: with nothing to drop on, a library item could not be
// dragged into a category. The drawer now closes while an item is dragged out of it. Every item of
// the file is already in the list, so a drop moves it (an item is never added twice to a category).
async function libraryDrag(page: Page, name: string, targetY: number) {
  const rows = page.locator(".lpItem[data-item-id]");
  await scrollFirstTo(page, rows.nth(0), 120);
  await page.locator("#hamburger").tap();
  // Fully open: the drawer slides in, and a handle measured on the way is off the screen.
  await expect
    .poll(async () => (await page.locator("#sidebar").boundingBox())!.x)
    .toBe(0);
  await fingerDrag(
    page,
    page
      .locator(".library li.lpLibraryItem", { hasText: name })
      .locator(".lpLibraryItemHandle"),
    targetY,
    700,
  );
}

async function openListWithThreeItems(page: Page, prefix: string) {
  await signUp(page, prefix);
  await importCsv(page, "reorder.csv");
  const rows = page.locator(".lpItem[data-item-id]");
  await expect(rows).toHaveCount(3, { timeout: 15000 });
  const names = () =>
    rows.evaluateAll((els) =>
      els.map(
        (el) => (el.querySelector("input.lpName") as HTMLInputElement).value,
      ),
    );
  await expect.poll(names).toEqual(["Alpha", "Bravo", "Charlie"]);
  await scrollFirstTo(page, rows.nth(0), 120);
  const top = (await rows.nth(0).boundingBox())!.y + 4;
  return { names, top };
}

test("a library item is dragged from the drawer into the list with a finger", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { names, top } = await openListWithThreeItems(page, "tg");

  await libraryDrag(page, "Charlie", top);

  await expect
    .poll(names, { timeout: 5000 })
    .toEqual(["Charlie", "Alpha", "Bravo"]);
  await expect(page.locator("#sidebar")).not.toBeInViewport();
});

test("a library item dropped outside the list opens the drawer again", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { names } = await openListWithThreeItems(page, "tm");

  // Below the last row, where there is no category to land on.
  await libraryDrag(page, "Charlie", 800);

  await expect(page.locator("#sidebar")).toBeInViewport({ timeout: 5000 });
  await expect.poll(names).toEqual(["Alpha", "Bravo", "Charlie"]);
});
