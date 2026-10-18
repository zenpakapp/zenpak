import { test, expect } from "@playwright/test";

import { registerUser, verifyUserEmail } from "./auth-utils";
import { testRoot } from "./utils";

const isSuccessfulSave = (response) =>
  response.url().includes("/saveLibrary") && response.ok();

// Discover searches a text index built from each public list: its name, author, description,
// and the names and brands of its items. This runs against the real database.
test("Discover finds a public list by its name and by its items", async ({
  page,
}) => {
  test.setTimeout(90000);
  const now = `${Date.now()}`;
  const username = `disc${now}`;
  const listName = `Zephyr${now} route`;
  const itemName = `Flibbertarp${now}`;

  await registerUser(page, username, "testtest", `disc+${now}@lighterpack.com`);
  await verifyUserEmail(username);

  await page.getByPlaceholder("List Name").fill(listName);
  await page.locator(".lpAddItem").first().click();
  await page.locator(".lpAddItemInput").first().fill(itemName);
  await page.locator(".lpAddItemInput").first().press("Enter");
  await expect(page.locator(".lpItem .lpName").first()).toHaveValue(itemName);
  const itemSaved = page.waitForResponse(isSuccessfulSave, { timeout: 35000 });
  await page.locator(".lpItem .lpWeight").first().fill("500");
  await itemSaved;

  const publish = page.waitForResponse(
    (r) =>
      r.url().endsWith("/publish") && r.request().method() === "POST" && r.ok(),
    { timeout: 35000 },
  );
  await page.getByText("Share", { exact: true }).hover();
  await publish;
  await expect(page.locator(".sharePublishState")).toHaveText("Published v1", {
    timeout: 15000,
  });
  const visibilitySaved = page.waitForResponse(isSuccessfulSave, {
    timeout: 35000,
  });
  await page.locator("#listVisibility").selectOption("discoverable");
  await visibilitySaved;
  const shareUrl = await page.locator("#shareUrl").inputValue();
  const externalId = shareUrl.split("/p/")[1];

  const search = async (params) => {
    const response = await page.request.get(
      `${testRoot}api/community/discover?${new URLSearchParams(params)}`,
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.lists.map((list) => list.externalId);
  };

  // The projection is written asynchronously after the save.
  await expect(async () => {
    expect(await search({ q: `zephyr${now}` })).toContain(externalId);
  }).toPass({ timeout: 20000 });

  expect(await search({ q: `flibbertarp${now}` })).toContain(externalId);
  expect(await search({ q: `flibber` })).toContain(externalId);
  expect(await search({ q: `Zephyr${now} Flibbertarp${now}` })).toContain(
    externalId,
  );
  expect(await search({ q: `zephyr${now} nomatchword` })).not.toContain(
    externalId,
  );
  expect(await search({ q: `qqqq${now}` })).toEqual([]);
  expect(await search({ q: `zephyr${now}`, season: "winter" })).not.toContain(
    externalId,
  );
});
