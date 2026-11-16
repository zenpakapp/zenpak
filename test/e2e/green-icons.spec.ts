import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The row icons are SVG in the text colour; the active ones are ZenPak green and drawn solid. No
// filter and no ring: a filter once turned the ring around an active button from green to khaki.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("active row icons are solid green with no ring, light and dark", async ({
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

  // No filter on the button in light: the sprite is already green and nothing around it is recoloured.
  await page.mouse.move(5, 5);
  expect(await worn.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
  // The state is the icon, not a box around it.
  expect(await worn.evaluate((el) => getComputedStyle(el).boxShadow)).toBe(
    "none",
  );

  // The active worn icon is the solid pictogram in ZenPak green (it is an SVG in the text colour).
  await expect(worn.locator("svg")).toHaveAttribute("fill", "currentColor");
  await expect(worn).toHaveCSS("color", "rgb(45, 122, 79)");
  // Dark theme: the icon takes the lighter accent green; its hue must stay near 148, not turn cyan
  // (above 165) or yellow (below 125).
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
