import { test, expect, type Page } from "@playwright/test";

import {
  createEditorLibrary,
  mockSuccessfulEditorInitialization,
} from "./editor-fixture";
import { testRoot } from "./utils";

// The dashboard asks the store to hide the source info (the store keeps the sync token and the saved
// state), and its billing banner reads ?billing=success|cancel|managed.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const store = <T>(page: Page, code: string): Promise<T> =>
  page.evaluate((source) => {
    const app = (document.querySelector("#app") ||
      document.body.firstElementChild) as any;
    const s = app.__vue_app__.config.globalProperties.$store;
    return new Function("store", "library", source)(s, s.state.library);
  }, code);

function forkedLibrary() {
  const library = createEditorLibrary(12, 4) as any;
  library.lists[0].forkedFrom = {
    externalId: "srcext1",
    ownerId: "someone-else",
    ownerUsername: "someone",
    ownerName: "Someone",
    listName: "Source list",
    sourceCurrencySymbol: "$",
    version: 1,
  };
  return library;
}

test("hiding the source info of a fork updates the sync token and the saved state", async ({
  page,
}) => {
  await mockSuccessfulEditorInitialization(page, forkedLibrary());
  let saves = 0;
  await page.route("**/saveLibrary/**", (route) => {
    saves += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ syncToken: 2 }),
    });
  });
  await page.route("**/api/lists/*/hide-source-list-info", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ syncToken: 7 }),
    }),
  );
  await page.goto(testRoot);
  await expect(page.locator(".lpForkSourceAction")).toBeVisible();

  await page.locator(".lpForkSourceAction").click();

  await expect(page.locator(".lpForkSourceAction")).toHaveCount(0);
  await expect
    .poll(() => store<number>(page, `return store.state.syncToken`))
    .toBe(7);
  // The saved state follows the library, so the next autosave sees no change to post.
  expect(
    await store<boolean>(
      page,
      `return store.state.lastSaveData === JSON.stringify(library.save())`,
    ),
  ).toBe(true);
  expect(
    await store<boolean>(
      page,
      `return library.lists[0].sourceListInfoHidden === true`,
    ),
  ).toBe(true);
  expect(saves).toBe(0);
});

test.describe("billing banner", () => {
  async function open(page: Page, query: string) {
    let billingReads = 0;
    await mockSuccessfulEditorInitialization(page, createEditorLibrary(12, 4));
    await page.route("**/api/billing/me", (route) => {
      billingReads += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plan: "supporter", status: "active" }),
      });
    });
    await page.goto(`${testRoot}${query}`);
    await expect(page.locator(".lpItem[data-item-id]")).toHaveCount(4);
    return () => billingReads;
  }

  test("no banner and no extra read without a billing return", async ({
    page,
  }) => {
    await open(page, "");
    await expect(page.locator(".lpBillingSuccessBanner")).toHaveCount(0);
    await expect(page.locator(".lpBillingCancelBanner")).toHaveCount(0);
  });

  test("success thanks the member and reads the plan again", async ({
    page,
  }) => {
    const reads = await open(page, "?billing=success");
    await expect(page.locator(".lpBillingSuccessBanner")).toBeVisible();
    await expect(page.locator(".lpBillingSuccessBanner")).toContainText(
      "Your Kin plan is now active",
    );
    // One read when the session opens, one for the return from billing.
    await expect.poll(reads).toBe(2);
  });

  test("managed confirms the change and reads the plan again", async ({
    page,
  }) => {
    const reads = await open(page, "?billing=managed");
    await expect(page.locator(".lpBillingSuccessBanner")).toBeVisible();
    await expect.poll(reads).toBe(2);
  });

  test("cancel shows its own banner and reads nothing more", async ({
    page,
  }) => {
    const reads = await open(page, "?billing=cancel");
    await expect(page.locator(".lpBillingCancelBanner")).toBeVisible();
    await expect(page.locator(".lpBillingSuccessBanner")).toHaveCount(0);
    expect(reads()).toBe(1);
  });
});
