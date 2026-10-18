import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// A failed image upload says what is wrong (too large, not an image, empty, nothing sent)
// through a status and a code, instead of a generic "Upload error" / "An error occurred".
test.use({ locale: "en-US" });

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const bigPng = (bytes) =>
  Buffer.concat([PNG_HEADER, Buffer.alloc(bytes - PNG_HEADER.length)]);

async function signedInPage(page) {
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `up${now}`, "testtest", `up+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
}

const upload = (page, path, file) =>
  page.request.post(`${testRoot}${path.replace(/^\//, "")}`, {
    multipart: file ? { image: file } : { note: "no image here" },
  });

for (const endpoint of [
  { path: "/api/profile/avatar", maxBytes: 2 * 1024 * 1024 },
  { path: "/imageUpload", maxBytes: 5 * 1024 * 1024 },
]) {
  test(`${endpoint.path} explains why an upload is refused`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await signedInPage(page);

    const tooLarge = await upload(page, endpoint.path, {
      name: "huge.png",
      mimeType: "image/png",
      buffer: bigPng(endpoint.maxBytes + 100 * 1024),
    });
    expect(tooLarge.status()).toBe(413);
    expect(await tooLarge.json()).toMatchObject({
      code: "file-too-large",
      maxBytes: endpoint.maxBytes,
    });

    // The browser said PNG, the bytes are text.
    const notAnImage = await upload(page, endpoint.path, {
      name: "notes.png",
      mimeType: "image/png",
      buffer: Buffer.from("these are notes, not a picture"),
    });
    expect(notAnImage.status()).toBe(415);
    expect((await notAnImage.json()).code).toBe("unsupported-type");

    const empty = await upload(page, endpoint.path, {
      name: "empty.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(0),
    });
    expect(empty.status()).toBe(400);
    expect((await empty.json()).code).toBe("empty-file");

    const nothing = await upload(page, endpoint.path, null);
    expect(nothing.status()).toBe(400);
    expect((await nothing.json()).code).toBe("no-file");
  });
}
