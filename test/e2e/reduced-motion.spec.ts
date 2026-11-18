import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

for (const motion of ["no-preference", "reduce"] as const) {
  test(`categories and the drawer move only when motion is allowed (${motion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.setViewportSize({ width: 500, height: 812 });
    await mockSuccessfulEditorInitialization(page, createEditorLibrary(4, 2));
    await page.goto(testRoot);
    await expect(page.locator(".lpCategory").first()).toBeVisible();

    const styles = await page.evaluate(() => ({
      category: getComputedStyle(document.querySelector(".lpCategory")!)
        .animationName,
      drawer: getComputedStyle(document.querySelector("#sidebar")!)
        .transitionProperty,
    }));

    if (motion === "reduce") {
      expect(styles.category).toBe("fadein");
      expect(styles.drawer).not.toContain("transform");
      expect(styles.drawer).toContain("opacity");
    } else {
      expect(styles.category).toBe("lpFadeUp");
      expect(styles.drawer).toContain("transform");
    }
  });
}
