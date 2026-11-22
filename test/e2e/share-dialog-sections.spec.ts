import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The share dialog was one long list: about twenty tag boxes, four view boxes and the embed code all
// open at once. The place of the list comes first, and the tags, the shared view and the embed code
// are folded, each saying what it holds.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the place is open, the tags, shared view and embed are folded", async ({
  page,
}) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
  await page.getByText("Share", { exact: true }).first().click();

  const popover = page.locator(".sharePopover");
  await expect(popover.locator("#shareDestination")).toBeVisible();
  const folded = popover.locator("details.shareDetails");
  await expect(folded).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(folded.nth(i)).not.toHaveAttribute("open", "");
  }
  // A folded block hides its boxes.
  await expect(popover.locator(".shareTagCheckbox").first()).toBeHidden();
  await expect(popover.locator(".shareTextarea")).toBeHidden();

  // The summary opens the block.
  await popover.locator("summary", { hasText: "Community tags" }).click();
  await expect(popover.locator(".shareTagCheckbox").first()).toBeVisible();

  // Ticking a tag is said in the folded summary.
  const summary = popover.locator("summary", { hasText: "Community tags" });
  const before = (await summary.textContent()) || "";
  const first = popover.locator(".shareTagCheckbox input").first();
  const wasChecked = await first.isChecked();
  await first.setChecked(!wasChecked);
  await expect(summary).not.toHaveText(before);
  await first.setChecked(wasChecked);
  await expect(summary).toHaveText(before);
});
