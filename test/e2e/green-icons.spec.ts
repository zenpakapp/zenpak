import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The LighterPack sprite was blue and lime; ZenPak is green. The icons are green in the sprite
// itself, so no CSS filter has to turn them (a filter also turned the ring around an active worn
// or consumable button from green to khaki).
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("active icons are green in the sprite and the ring stays the accent green", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gi${now}`, "testtest", `gi+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill("Camp stove");
  await page.locator(".lpAddItemInput").first().press("Enter");
  const row = page.locator(".lpItem[data-item-id]").first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.hover();
  await row.locator(".lpWorn").click();
  const worn = row.locator(".lpWorn.lpActive");
  await expect(worn).toBeVisible();

  // No filter on the button in light: the sprite is already green and the ring is not recoloured.
  await page.mouse.move(5, 5);
  expect(await worn.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
  const ring = await worn.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ring).toContain("45, 122, 79");

  // The sprite pixels of the active worn icon (blue in the original) are green now.
  const dominant = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/images/sprite2x.png?v=3";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    // The active worn icon sits at 100,50 in the 2x sprite, about 34px wide.
    const { data } = ctx.getImageData(100, 50, 34, 30);
    let g = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      g += data[i + 1];
      b += data[i + 2];
    }
    return { g, b };
  });
  expect(dominant.g, "green channel above blue").toBeGreaterThan(dominant.b);
  // Dark theme: the sprite is inverted by a filter, and a wrong rotation turns the green cyan
  // (hue above 165) or yellow (below 125). The accent green sits near 148.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  const buf = await worn.screenshot();
  const hue = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let k = 0; k < d.length; k += 4) {
      if (Math.max(d[k], d[k + 1], d[k + 2]) - Math.min(d[k], d[k + 1], d[k + 2]) > 40) {
        r += d[k];
        g += d[k + 1];
        b += d[k + 2];
        n += 1;
      }
    }
    [r, g, b] = [r / n, g / n, b / n];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    let h = 0;
    if (mx === r) h = ((g - b) / (mx - mn)) % 6;
    else if (mx === g) h = (b - r) / (mx - mn) + 2;
    else h = (r - g) / (mx - mn) + 4;
    h = Math.round(h * 60);
    return h < 0 ? h + 360 : h;
  }, buf.toString("base64"));
  expect(hue, "dark hue").toBeGreaterThan(125);
  expect(hue, "dark hue").toBeLessThan(165);
});
