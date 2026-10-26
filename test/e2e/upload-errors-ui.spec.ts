import { test, expect } from "@playwright/test";

import { grantPlan, registerUser } from "./auth-utils";
import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// A failed image upload tells the user what is wrong, in their language, instead of a bare
// "Upload error"; and the item image dialog sends a real multipart request.
test.use({ locale: "en-US" });

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const pngOfSize = (bytes) =>
  Buffer.concat([PNG_HEADER, Buffer.alloc(bytes - PNG_HEADER.length)]);

test.describe("avatar upload", () => {
  async function openAvatarSettings(page) {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await registerUser(
      page,
      `ua${now}`,
      "testtest",
      `ua+${now}@lighterpack.com`,
    );
    await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
    // The avatar controls are for paying accounts, and the server checks the plan too.
    await grantPlan(`ua${now}`, "supporter");
    await page.evaluate(() => {
      window.LighterPack.$store.state.library.entitlements = {
        plan: "supporter",
      };
    });
    await page.locator(".accountDropdownTarget").hover();
    await page
      .getByText("Account Settings", { exact: true })
      .dispatchEvent("click");
    await expect(page.locator(".profileSettingsAvatarBtn input")).toBeAttached({
      timeout: 15000,
    });
  }

  test("a file over 2 MB is refused with its limit, before any upload", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openAvatarSettings(page);
    let uploaded = false;
    page.on("request", (r) => {
      if (r.url().includes("/api/profile/avatar")) uploaded = true;
    });
    await page.locator(".profileSettingsAvatarBtn input").setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: pngOfSize(3 * 1024 * 1024),
    });
    await expect(page.locator(".profileSettingsAvatarError")).toContainText(
      /too large.*2 MB/,
    );
    expect(uploaded).toBe(false);
  });

  test("a file that is not an image says so, from the server", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openAvatarSettings(page);
    await page.locator(".profileSettingsAvatarBtn input").setInputFiles({
      name: "notes.png",
      mimeType: "image/png",
      buffer: Buffer.from("these are notes, not a picture"),
    });
    await expect(page.locator(".profileSettingsAvatarError")).toContainText(
      /not a supported image/,
    );
  });

  test("a stored avatar shows in the header, and removing it works or says why not", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openAvatarSettings(page);
    // A one-pixel image the browser can draw, standing in for the stored picture.
    const stored =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    await page.route("**/api/profile/avatar", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { avatarUrl: stored } });
      }
      return route.fulfill({
        status: 500,
        json: { message: "An error occurred" },
      });
    });

    await page.locator(".profileSettingsAvatarBtn input").setInputFiles({
      name: "me.png",
      mimeType: "image/png",
      buffer: pngOfSize(2048),
    });
    await expect(page.locator(".accountDropdownAvatar img")).toHaveAttribute(
      "src",
      stored,
    );

    // The server cannot remove it: the message is the user's language, and the avatar stays.
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.locator(".profileSettingsAvatarError")).toContainText(
      "We could not remove your photo",
    );
    await expect(page.locator(".accountDropdownAvatar img")).toBeAttached();

    // Once the server accepts, it is gone.
    await page.unroute("**/api/profile/avatar");
    await page.route("**/api/profile/avatar", (route) =>
      route.fulfill({ json: { ok: true } }),
    );
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.locator(".accountDropdownAvatar img")).toHaveCount(0);
    await expect(page.locator(".profileSettingsAvatarError")).toHaveCount(0);
  });
});

test.describe("item image dialog", () => {
  async function openImageDialog(page) {
    await page.setViewportSize({ width: 1024, height: 812 });
    const library = createEditorLibrary(12, 4);
    library.optionalFields.images = true;
    await mockSuccessfulEditorInitialization(page, library);
    await page.goto(testRoot);
    const row = page.locator('.lpItem[data-item-id="3"]');
    await row.hover();
    await row.locator(".lpCamera").click();
    await expect(page.locator("#itemImageDialog")).toBeVisible();
  }

  test("the upload is sent as multipart form data", async ({ page }) => {
    await openImageDialog(page);
    await page.route("**/imageUpload", (route) =>
      route.fulfill({
        json: { data: { id: "x", url: "https://example.com/photo.png" } },
      }),
    );
    const request = page.waitForRequest("**/imageUpload");
    await page.locator("#image").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: pngOfSize(2048),
    });
    const contentType = (await request).headers()["content-type"];
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  test("a refused upload explains why", async ({ page }) => {
    await openImageDialog(page);
    await page.route("**/imageUpload", (route) =>
      route.fulfill({
        status: 415,
        json: { code: "unsupported-type", message: "x" },
      }),
    );
    await page.locator("#image").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: pngOfSize(2048),
    });
    await expect(page.locator(".lpGlobalAlertMessage").first()).toContainText(
      /not a supported image/,
    );
  });
});
