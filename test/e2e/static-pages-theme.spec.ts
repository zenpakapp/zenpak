import { test, expect } from "@playwright/test";

// The pages the server renders (pricing, privacy, terms, legal notice) follow the same light / dark
// choice as the app: the stored choice wins, otherwise the system setting decides.
const LIGHT = "rgb(241, 243, 239)";
const DARK = "rgb(17, 17, 17)";
const PAGES = ["/pricing", "/privacy", "/terms", "/legal"];

const background = (page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

for (const path of PAGES) {
  test(`${path} follows the system setting`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    expect(await background(page)).toBe(DARK);

    await page.emulateMedia({ colorScheme: "light" });
    expect(await background(page)).toBe(LIGHT);
  });
}

test("a choice made in the app wins over the system setting", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text()))
      violations.push(message.text());
  });

  await page.addInitScript(() => {
    if (!localStorage.getItem("lp-theme"))
      localStorage.setItem("lp-theme", "light");
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/pricing");
  expect(await background(page)).toBe(LIGHT);

  await page.evaluate(() => localStorage.setItem("lp-theme", "dark"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  expect(await background(page)).toBe(DARK);

  // "auto" leaves the system setting in charge.
  await page.evaluate(() => localStorage.setItem("lp-theme", "auto"));
  await page.reload();
  expect(await background(page)).toBe(LIGHT);

  expect(violations).toEqual([]);
});

test("dark pricing keeps its text readable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/pricing");
  const text = await page.evaluate(() => ({
    body: getComputedStyle(document.body).color,
    card: getComputedStyle(document.querySelector(".plan")!).backgroundColor,
    cardText: getComputedStyle(document.querySelector(".plan-name")!).color,
  }));
  expect(text.body).toBe("rgb(232, 232, 232)");
  expect(text.card).toBe("rgb(28, 28, 30)");
  expect(text.cardText).toBe("rgb(232, 232, 232)");
});
