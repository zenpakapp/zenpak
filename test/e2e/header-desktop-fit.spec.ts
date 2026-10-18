import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// With the sidebar hidden the list column is capped at 960px whatever the window width, while
// the header's compact breakpoints follow the window, so on a wide screen the share badge ran
// over "List settings" and the account name.
test.use({ locale: "en-US" });

async function openWorstCaseHeader(page, width: number, sidebarOpen: boolean) {
  await page.setViewportSize({ width, height: 900 });
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `hd${now}`, "testtest", `hd${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // Wayfarer link plus a shared list with unpublished changes: the widest header there is.
  await page.evaluate(() => {
    const { state } = window.LighterPack.$store;
    state.library.entitlements = { plan: "creator" };
    state.hasPendingSave = true;
    for (const l of Object.values(state.library.lists || {})) {
      l.visibility = "shareable";
      l.externalId = "abc123";
    }
  });
  await expect(page.locator(".sharePublishState")).toBeVisible();

  const hasSidebar = await page.locator("#main.lpHasSidebar").count();
  if (Boolean(hasSidebar) !== sidebarOpen) {
    await page.locator("#hamburger").dispatchEvent("click");
    if (sidebarOpen) {
      await expect(page.locator("#main.lpHasSidebar")).toHaveCount(1);
    } else {
      await expect(page.locator("#main.lpHasSidebar")).toHaveCount(0);
    }
  }
}

// Left and right edges of what is actually drawn in each header item.
const headerBoxes = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#header > .headerItem")]
      .map((item) => {
        // Popover panels are laid out below their button and overflow it: they are not
        // part of what the header draws.
        const rects = [item, ...item.querySelectorAll("*")]
          .filter((el) => !el.closest(".lpContent, .lpNotifDropdown"))
          .filter((el) => getComputedStyle(el).visibility !== "hidden")
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0);
        return {
          name: item.className,
          left: Math.min(...rects.map((r) => r.left)),
          right: Math.max(...rects.map((r) => r.right)),
        };
      })
      .filter((box) => Number.isFinite(box.left))
      .sort((a, b) => a.left - b.left),
  );

for (const scenario of [
  { name: "sidebar hidden, wide window", width: 1440, sidebarOpen: false },
  { name: "sidebar open, wide window", width: 1440, sidebarOpen: true },
  { name: "sidebar open, very wide window", width: 2560, sidebarOpen: true },
  { name: "sidebar hidden, narrow window", width: 1000, sidebarOpen: false },
  {
    name: "sidebar open, window just above the compact breakpoint",
    width: 1240,
    sidebarOpen: true,
  },
]) {
  test(`header items do not overlap: ${scenario.name}`, async ({ page }) => {
    test.setTimeout(60000);
    await openWorstCaseHeader(page, scenario.width, scenario.sidebarOpen);
    const boxes = await headerBoxes(page);
    expect(boxes.length).toBeGreaterThan(4);
    boxes.slice(1).forEach((box, index) => {
      const previous = boxes[index];
      expect(
        box.left,
        `${box.name} starts at ${box.left} but ${previous.name} ends at ${previous.right}`,
      ).toBeGreaterThanOrEqual(previous.right - 0.5);
    });
    const header = await page.locator("#header").boundingBox();
    const last = boxes[boxes.length - 1];
    expect(last.right).toBeLessThanOrEqual(header.x + header.width + 0.5);
  });
}

// The header only drops its labels when it is really short of room: an ordinary account on a
// laptop keeps "Share" and "List settings" spelled out.
test("a roomy header keeps its labels", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `hr${now}`, "testtest", `hr${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await expect(page.locator("#header .headerMenuLabel").first()).toBeVisible();
  await expect(page.locator("#header .headerMenuLabel")).toHaveCount(2);
  await expect(page.locator("#header.lpHeaderCompact")).toHaveCount(0);
});

// The editor column used to be capped at 960px with the sidebar hidden but unlimited with it
// open, so hiding the sidebar made the list narrower. It is now capped at 1200px in both
// states, and centred in the space the sidebar leaves.
const listBox = (page) => page.locator(".lpList").first().boundingBox();

test("hiding the sidebar does not narrow the editor", async ({ page }) => {
  test.setTimeout(60000);
  await openWorstCaseHeader(page, 1440, true);
  const open = await listBox(page);
  await page.locator("#hamburger").dispatchEvent("click");
  await expect(page.locator("#main.lpHasSidebar")).toHaveCount(0);
  await page.waitForTimeout(600); // the layout transitions
  const hidden = await listBox(page);
  expect(hidden.width).toBeGreaterThanOrEqual(open.width);
  expect(hidden.width).toBeGreaterThan(1100);
});

for (const sidebarOpen of [true, false]) {
  test(`the editor column is capped and centred on a very wide screen (sidebar ${sidebarOpen ? "open" : "hidden"})`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openWorstCaseHeader(page, 2560, sidebarOpen);
    await page.waitForTimeout(600);
    const list = await listBox(page);
    expect(list.width).toBeLessThanOrEqual(1240);
    expect(list.width).toBeGreaterThan(1100);
    const leftEdge = sidebarOpen ? 320 : 0;
    const gapLeft = list.x - leftEdge;
    const gapRight = 2560 - (list.x + list.width);
    expect(Math.abs(gapLeft - gapRight)).toBeLessThanOrEqual(24);
  });
}
