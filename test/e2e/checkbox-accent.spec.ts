import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// A native check box or radio button takes the accent (green), not the system blue, in the light
// and in the dark theme.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("check boxes and radio buttons use the accent colour in both themes", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `ca${now}`, "testtest", `ca+${now}@lighterpack.com`);

  for (const theme of ["light", "dark"]) {
    const result = await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      const probe = document.createElement("div");
      probe.style.color = "var(--color-accent)";
      const box = document.createElement("input");
      box.type = "checkbox";
      const radio = document.createElement("input");
      radio.type = "radio";
      document.body.append(probe, box, radio);
      const out = {
        accent: getComputedStyle(probe).color,
        checkbox: getComputedStyle(box).accentColor,
        radio: getComputedStyle(radio).accentColor,
      };
      probe.remove();
      box.remove();
      radio.remove();
      return out;
    }, theme);
    expect(result.accent, theme).not.toBe("");
    expect(result.checkbox, `${theme} check box`).toBe(result.accent);
    expect(result.radio, `${theme} radio`).toBe(result.accent);
  }
});
