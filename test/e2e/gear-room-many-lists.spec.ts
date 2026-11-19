import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// With many lists, the list filter of the gear room grew taller than the screen on a phone and
// pushed the items out of sight. The filters now keep to a share of the screen and scroll inside.
test.use({ locale: "en-US", viewport: { width: 430, height: 812 } });

test("the gear room still shows its items when there are many lists", async ({
  page,
}) => {
  const library = createEditorLibrary(12, 4);
  const names = [
    "UL Backpack 2026 - Inspired by Someone With A Long Name",
    "GTA GR5 - Inspired by Another Person With A Long Name",
    "Bikepacking 2026 - Inspired by Yet Another Long Name",
    "Light Travel 2026 - Inspired by A Fourth Long Name Here",
    "UL Bivouac 2026 - Inspired by A Fifth Long Name Here",
    "UTMB Mandatory Kit 2026 - Inspired by A Sixth Long Name",
    "Via Ferrata 2026 - Inspired by A Seventh Long Name Here",
    "Camino Frances 2026 - Inspired by An Eighth Long Name",
    "GR10 Pyrenees 2026 - Inspired by A Ninth Very Long Name Indeed",
    "",
  ];
  names.forEach((name, i) => {
    library.lists.push({ ...library.lists[0], id: 10 + i, name });
  });
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);

  await page.locator("#hamburger").click();
  await page.locator(".lpGearRoomBtn").click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  await page.locator(".lpGearRoomFiltersToggle").click();
  await expect(page.locator(".lpGearRoomFilters")).toBeVisible();

  const viewport = page.viewportSize()!;
  const filters = (await page.locator(".lpGearRoomFilters").boundingBox())!;
  expect(filters.height).toBeLessThanOrEqual(viewport.height * 0.45);

  // The items stay on the screen, under the filters.
  const row = page.locator(".lpGearRoomTable tbody tr").first();
  await expect(row).toBeInViewport({ ratio: 1 });

  // The first pill of the list filter is "All" for lists, not the one of the type filter.
  await expect(page.locator(".lpGearRoomChip").first()).toHaveText("All");

  // A list with no name is not an empty pill.
  const chips = page.locator(".lpGearRoomChip");
  for (const chip of await chips.all()) {
    expect((await chip.textContent())!.trim()).not.toBe("");
  }
});

test("the list filter reads Toutes in French, the type filter Tous", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("zp-locale", "fr"));
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);

  await page.locator("#hamburger").click();
  await page.locator(".lpGearRoomBtn").click();
  await page.locator(".lpGearRoomFiltersToggle").click();

  const groups = page.locator(".lpGearRoomCategoryChips");
  await expect(groups.nth(0).locator(".lpGearRoomChip").first()).toHaveText(
    "Toutes",
  );
  await expect(groups.nth(1).locator(".lpGearRoomChip").first()).toHaveText(
    "Tous",
  );
});
