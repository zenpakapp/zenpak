import { test, expect } from "@playwright/test";

// The official short link of a printed sticker: the address stays, where it leads is set in the
// configuration. Until the list of the crew is filled in, it leads to the ZenPak profile.
test("the official short link of the sticker redirects, and is never kept by a browser", async ({
  request,
}) => {
  const res = await request.get("/huguetteraidnette", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  // Not a permanent redirect: a browser would keep it and the next phase would not show.
  expect(res.headers()["location"]).toBe("/u/zenpak");
  expect(res.headers()["cache-control"]).toBe("no-store");
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
});

test("a visitor who scans it ends on the ZenPak profile page", async ({
  page,
}) => {
  await page.goto("/huguetteraidnette");
  await expect(page).toHaveURL(/\/u\/zenpak$/);
});

test("an address that is not configured is still a 404", async ({
  request,
}) => {
  const res = await request.get("/huguette-inconnue", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});
