import { test, expect } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The embed code of the share dialog is the script tag and the div of the list, as before it was
// bound with :value (a mustache in a textarea is rejected by the linter).
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

test("share dialog shows the embed code of the list", async ({ page }) => {
  await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
  await page.goto(testRoot);
  await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
  await page.evaluate(() => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const store = app.__vue_app__.config.globalProperties.$store;
    const list = store.state.library.getListById(
      store.state.library.defaultListId,
    );
    list.externalId = "abc123";
  });
  await page.getByText("Share", { exact: true }).first().click();
  const code = await page.locator(".shareTextarea").inputValue();
  expect(code).toMatch(
    /^<script src="https?:\/\/[^"]+\/e\/abc123"><\/script><div id="abc123"><\/div>$/,
  );
});
