import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

test.use({ locale: "en-US" });

const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

// Deleting a list keeps its items in the gear room. A box in the confirmation can delete the ones
// no other list uses as well.
async function setup(page, prefix) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(
    page,
    `${prefix}${now}`,
    "testtest",
    `${prefix}+${now}@lighterpack.com`,
  );
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  // A second list holding one item.
  await page
    .locator("#listContainer .listContainerHeader .lpAdd")
    .first()
    .click();
  await expect(page.locator("#lists .lpLibraryList")).toHaveCount(2);
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  await expect
    .poll(() =>
      page.$$eval(".lpItem .lpName", (inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      ),
    )
    .toContain("Camp stove");
}

async function deleteSecondList(page, alsoItems: boolean) {
  const saved = page.waitForResponse(isSuccessfulSave, { timeout: 35000 });
  await page
    .locator("#lists .lpLibraryList .lpRemove")
    .last()
    .dispatchEvent("click");
  const dialog = page.locator("#speedbump");
  await expect(dialog).toContainText("its items stay in “Your Gear”");
  const box = dialog.getByLabel(
    "Also delete its items, except those used in another list",
  );
  await expect(box).not.toBeChecked();
  if (alsoItems) await box.check();
  await dialog.getByRole("button", { name: "Yes" }).click();
  await saved;
}

async function gearRoomHas(page, name: string) {
  await page.getByRole("button", { name: /item library/i }).click();
  await expect(page.locator(".lpGearRoom")).toBeVisible();
  return page.locator(".lpGearRoom tbody tr", { hasText: name }).count();
}

test("deleting a list keeps its items in the gear room by default", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page, "dlk");
  await deleteSecondList(page, false);
  expect(await gearRoomHas(page, "Camp stove")).toBeGreaterThan(0);
});

test("the box deletes the items no other list uses", async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, "dld");
  await deleteSecondList(page, true);
  expect(await gearRoomHas(page, "Camp stove")).toBe(0);
});
