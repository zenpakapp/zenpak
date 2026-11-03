import { test, expect } from "@playwright/test";

import { registerUser } from "./auth-utils";
import { testRoot } from "./utils";

// The Wayfarer "Items" section: one row per item whatever the number of lists using it, a search and
// two filters, 30 rows at a time, and only the edited rows sent on save. The server answers are
// stubbed: the plan is set in the browser, so the section is driven with a fixed set of lists.
test.use({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const item = (id: number) => ({
  itemId: String(id),
  name: `Item ${id}`,
  brand: id % 2 ? "Alpha" : "Beta",
  affiliateUrl: "",
  promoCode: "",
  promoLabel: "",
  appliedRule: null,
});
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => item(from + index));

// List A holds items 1-25 and list B items 20-40: the six items 20-25 are in both.
const groups = [
  { listId: "a", listName: "Alps", items: range(1, 25) },
  { listId: "b", listName: "Pyrenees", items: range(20, 40) },
];

async function openItems(page) {
  const saved: unknown[] = [];
  await page.route("**/api/guide/profile", (route) =>
    route.fulfill({
      json: { bio: "", links: [], gearPhilosophy: [], affiliateRules: [] },
    }),
  );
  await page.route("**/api/guide/items", (route) => {
    if (route.request().method() === "PUT") {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: groups });
  });

  const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await registerUser(page, `gi${now}`, "testtest", `gi+${now}@lighterpack.com`);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.goto(testRoot);
  await expect(page.locator("#header")).toBeVisible({ timeout: 35000 });
  await page.evaluate(() => {
    const app = window.LighterPack;
    app.$store.state.library.entitlements = { plan: "creator" };
    app.$router.push("/guide");
  });
  await expect(page.locator(".lpGuideItemTools")).toBeVisible();
  return saved;
}

test("an item used by several lists is one row, shown 30 at a time", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openItems(page);

  await expect(page.locator(".lpGuideItemCount")).toHaveText("40 of 40 items");
  await expect(page.locator(".lpGuideItemRow")).toHaveCount(30);
  await page.getByRole("button", { name: "Show 10 more" }).click();
  await expect(page.locator(".lpGuideItemRow")).toHaveCount(40);
  await expect(page.getByRole("button", { name: /Show \d+ more/ })).toHaveCount(
    0,
  );

  // The shared item says so; one used by a single list names it.
  const shared = page.locator(".lpGuideItemRow", { hasText: "Item 22" });
  await expect(shared.locator(".lpGuideItemLists")).toHaveText("2 lists");
  const single = page.locator(".lpGuideItemRow", { hasText: "Item 3" }).first();
  await expect(single.locator(".lpGuideItemLists")).toHaveText("Alps");
});

test("the search and the filters narrow the rows", async ({ page }) => {
  test.setTimeout(90000);
  await openItems(page);

  await page.getByPlaceholder("Search an item or brand").fill("Item 3");
  // Item 3, 30 to 39: eleven rows.
  await expect(page.locator(".lpGuideItemCount")).toHaveText("11 of 40 items");
  await page.getByPlaceholder("Search an item or brand").fill("beta");
  await expect(page.locator(".lpGuideItemCount")).toHaveText("20 of 40 items");
  await page.getByPlaceholder("Search an item or brand").fill("");

  await page.getByLabel("Filter by list").selectOption("b");
  await expect(page.locator(".lpGuideItemCount")).toHaveText("21 of 40 items");

  await page.getByLabel("Filter by status").selectOption("filled");
  await expect(page.getByText("No item matches.")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("todo");
  await expect(page.locator(".lpGuideItemCount")).toHaveText("21 of 40 items");
});

test("saving sends only the edited item, once", async ({ page }) => {
  test.setTimeout(90000);
  const saved = await openItems(page);

  // Nothing edited: no request.
  const section = page.locator(".lpGuideSection").last();
  await section.getByRole("button", { name: "Save changes" }).click();
  await expect(section.locator(".lpGuideSavedFeedback")).toBeVisible();
  expect(saved).toHaveLength(0);

  // Edit a shared item in its single row.
  const row = page.locator(".lpGuideItemRow", { hasText: "Item 22" });
  await row.getByPlaceholder("Code").fill("SAVE10");
  await section.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0]).toEqual([
    {
      listId: "a",
      itemId: "22",
      affiliateUrl: "",
      promoCode: "SAVE10",
      promoLabel: "",
    },
  ]);

  // Saved: a second save has nothing left to send.
  await section.getByRole("button", { name: "Save changes" }).click();
  await page.waitForTimeout(500);
  expect(saved).toHaveLength(1);
});
