import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// A list can be handed over with a QR code, without going through the profile: a button in the share
// dialog shows a large code, its address, and two actions. A private list has no public page, so it
// gets a sentence instead of the button.
test.use({
  locale: "en-US",
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function openShare(
  page,
  { visibility, externalId = "abc123", latestVersion = 1, dirty = false },
) {
  const library = createEditorLibrary(12, 4) as any;
  library.lists[0].visibility = visibility;
  library.lists[0].externalId = externalId;
  await mockSuccessfulEditorInitialization(page, library);
  await page.route("**/api/lists/*/publish-status", (route) =>
    route.fulfill({
      json: { latestVersion, hasUnpublishedChanges: dirty, publishedAt: null },
    }),
  );
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
  await page.getByTitle("Share", { exact: true }).first().tap();
  await expect(page.locator(".sharePopover")).toBeVisible();
}

test("a shared list shows a QR code of its public page, with its address", async ({
  page,
}) => {
  await openShare(page, { visibility: "discoverable" });
  const popover = page.locator(".sharePopover");
  await expect(popover.locator(".shareQrImage")).toHaveCount(0);

  await popover.getByRole("button", { name: "QR code" }).tap();
  const image = popover.locator(".shareQrImage");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(image).toHaveAttribute(
    "alt",
    "QR code to open Deterministic profiling list",
  );

  // The code stands for the public page of the list, on the address of this site.
  await expect(image).toHaveAttribute(
    "data-qr-url",
    `${new URL(page.url()).origin}/p/abc123`,
  );

  // The address under the code is the one of the public page.
  await expect(popover.locator(".shareQrAddress")).toHaveText(/\/p\/abc123$/);
  // The code is big enough to be scanned from the screen of a phone held up to someone.
  const box = (await image.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(200);
  // Published and up to date: no warning.
  await expect(
    popover.locator(".shareQrPanel .shareVisibilityHint"),
  ).toHaveCount(0);

  // The button opens and closes the panel.
  await popover.getByRole("button", { name: "QR code" }).tap();
  await expect(image).toHaveCount(0);
});

test("the QR code is not a dead end: copy link is offered", async ({
  page,
}) => {
  await openShare(page, { visibility: "shareable" });
  const popover = page.locator(".sharePopover");
  await popover.getByRole("button", { name: "QR code" }).tap();
  await expect(
    popover.getByRole("button", { name: "Copy link" }),
  ).toBeVisible();
});

test("a private list gets a sentence instead of the button", async ({
  page,
}) => {
  await openShare(page, { visibility: "private" });
  const popover = page.locator(".sharePopover");
  await expect(popover.getByRole("button", { name: "QR code" })).toHaveCount(0);
  await expect(popover).toContainText(
    "Make the list shareable to get a QR code.",
  );
});

test("a list never published is told so before the link is handed over", async ({
  page,
}) => {
  await openShare(page, { visibility: "discoverable", latestVersion: 0 });
  const popover = page.locator(".sharePopover");
  await popover.getByRole("button", { name: "QR code" }).tap();
  await expect(popover.locator(".shareQrPanel")).toContainText(
    "Publish the list first: until then the link opens nothing.",
  );
});

test("unpublished changes are said under the code", async ({ page }) => {
  await openShare(page, { visibility: "discoverable", dirty: true });
  const popover = page.locator(".sharePopover");
  await popover.getByRole("button", { name: "QR code" }).tap();
  await expect(popover.locator(".shareQrPanel")).toContainText(
    "Changes you have not published do not show on this page yet.",
  );
});

test("on localhost the QR code carries the address the server is configured with", async ({
  page,
}) => {
  await page.route("**/api/public/origin", (route) =>
    route.fulfill({ json: { origin: "http://192.168.1.11:3001" } }),
  );
  await openShare(page, { visibility: "discoverable" });
  const popover = page.locator(".sharePopover");
  await popover.getByRole("button", { name: "QR code" }).tap();
  await expect(popover.locator(".shareQrImage")).toHaveAttribute(
    "data-qr-url",
    "http://192.168.1.11:3001/p/abc123",
  );
  await expect(popover.locator(".shareQrAddress")).toHaveText(
    "192.168.1.11:3001/p/abc123",
  );
});
