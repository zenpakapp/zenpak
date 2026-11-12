import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";

// The sidebar is a panel: its list of lists is plain rows, not a card inside a card.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("the lists in the sidebar are not a card inside the panel", async ({
  page,
}) => {
  test.setTimeout(60000);
  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `sb${now}`, "testtest", `sb+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });

  const lists = page.locator("#sidebar #lists");
  await expect(lists).toBeVisible({ timeout: 15000 });
  const style = await lists.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      border: cs.borderTopWidth,
      radius: cs.borderTopLeftRadius,
    };
  });
  expect(style.border).toBe("0px");
  expect(style.radius).toBe("0px");
});
