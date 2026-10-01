import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";

test.describe("Share popover re-open", () => {
  test("setting visibility to private is not reverted by a spurious popover re-show", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const now = Date.now();
    const username = `popover${now}`;
    const email = `popover+${now}@lighterpack.com`;
    const password = "testtest";

    await registerUser(page, username, password, email);
    await verifyUserEmail(username);

    const isSuccessfulExternalId = (response) =>
      response.url().includes("/externalId") && response.ok();
    const isSuccessfulSave = (response) =>
      response.url().includes("/saveLibrary") && response.ok();

    // First Share open promotes a never-shared list to shareable (ensureShareable()'s
    // intended, one-time job).
    const externalIdResponse = page.waitForResponse(isSuccessfulExternalId, {
      timeout: 35000,
    });
    await page.getByText("Share", { exact: true }).hover();
    await externalIdResponse;

    const visibilitySelect = page.locator("#listVisibility");
    await expect(visibilitySelect).toHaveValue("shareable", { timeout: 15000 });

    // The user explicitly sets it back to private.
    const privateSave = page.waitForResponse(isSuccessfulSave, {
      timeout: 35000,
    });
    await visibilitySelect.selectOption("private");
    await privateSave;

    // A real user's mouse, resting somewhere after the select interaction, leaves the
    // popover and comes back in (e.g. to reach another control) all the time — force that
    // exact leave+re-enter deterministically rather than hoping some other locator action
    // happens to cross the boundary.
    await page.mouse.move(5, 5);
    const popoverBox = await page.locator(".sharePopover").boundingBox();
    if (popoverBox) {
      await page.mouse.move(popoverBox.x + 10, popoverBox.y + 10);
    }

    // A real reader of this test's history: this used to flip back to "shareable" ~50-100ms
    // later, because PopoverHover's mouseenter handler re-emits 'shown' on every fresh
    // mouseenter into the already-open popover (the move above reproduces one), and
    // share.vue's focusShare()->ensureShareable() unconditionally re-promotes a 'private'
    // list. Give that window time to misfire, then assert it didn't.
    await page.waitForTimeout(1000);

    await expect(visibilitySelect).toHaveValue("private");

    // Confirm server-side too, not just the client's own (possibly stale) view: a private
    // list must not be publicly readable.
    const shareUrl = await page.locator("#shareUrl").inputValue();
    const externalId = shareUrl.split("/p/")[1];
    const publicResponse = await page.request.get(
      `/api/public/list/${externalId}`,
      { failOnStatusCode: false },
    );
    expect(publicResponse.status()).toBe(404);
  });
});
