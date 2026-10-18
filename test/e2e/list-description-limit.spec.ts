import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The description field stops at 1000 characters, and its help says what really happens to
// links (they are clickable, three at most) instead of promising Markdown, which the public
// page does not render.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the description field is limited and explains links", async ({
  page,
}) => {
  const library = createEditorLibrary(12, 4);
  library.optionalFields.listDescription = true;
  await mockSuccessfulEditorInitialization(page, library);
  await page.goto(testRoot);

  const field = page.locator("#listDescription");
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute("maxlength", "1000");

  const help = page.locator("#listDescriptionContainer");
  await expect(help).toContainText(/are clickable/i);
  await expect(help).toContainText("3");
  await expect(help).not.toContainText("Markdown");

  // Typing past the limit is cut by the browser.
  await field.fill("x".repeat(1200));
  expect((await field.inputValue()).length).toBe(1000);
});
