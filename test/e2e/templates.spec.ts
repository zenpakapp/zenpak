import { test, expect } from "@playwright/test";
import { testRoot } from "./utils";
import { registerUser, registerUserWithTemplate } from "./auth-utils";

test.describe("Template picker", () => {
  test("picker appears after register form submit", async ({ page }) => {
    await page.goto(testRoot);

    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await page.fill('.lpRegister input[name="username"]', `tpl${now}`);
    await page.fill(
      '.lpRegister input[name="email"]',
      `tpl+${now}@lighterpack.com`,
    );
    await page.fill('.lpRegister input[name="password"]', "testtest");
    await page.fill('.lpRegister input[name="passwordConfirm"]', "testtest");
    await page.getByRole("button").filter({ hasText: "Register" }).click();

    await expect(page.getByText("What is your next adventure?")).toBeVisible();
    await expect(page.getByText("3-day hike", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Ultralight weekend", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Long-distance trek", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("4-season hiking", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Bikepacking", { exact: true })).toBeVisible();
    await expect(page.getByText("Light travel", { exact: true })).toBeVisible();
    await expect(page.getByText("Via ferrata", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create my list" }),
    ).toBeVisible();
  });

  test("register with template populates list categories", async ({ page }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const username = `tpl${now}`;

    let libraryPayload: string | null = null;
    await page.route("**/register", async (route) => {
      const body = route.request().postDataJSON();
      libraryPayload = body?.library ?? null;
      await route.continue();
    });

    await registerUserWithTemplate(
      page,
      username,
      "testtest",
      `tpl+${now}@lighterpack.com`,
      "3-day hike",
    );

    await expect(page.locator(".accountDropdownName")).toHaveText(username);
    expect(libraryPayload).not.toBeNull();

    const library = JSON.parse(libraryPayload!);
    expect(library.items.length).toBeGreaterThan(0);
    expect(library.lists[0].name).toBe("3-Day Backpacking");

    await expect(page.locator("input.lpCategoryName").first()).toBeVisible();
    await expect(
      page.locator('input.lpCategoryName[value="Shelter"]'),
    ).toHaveCount(1);
  });

  test("the bikepacking template builds a list in the bikepacking taxonomy", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    let libraryPayload: string | null = null;
    await page.route("**/register", async (route) => {
      libraryPayload = route.request().postDataJSON()?.library ?? null;
      await route.continue();
    });

    await registerUserWithTemplate(
      page,
      `tpl${now}`,
      "testtest",
      `tpl+${now}@lighterpack.com`,
      "Bikepacking",
    );
    await expect(page.locator(".accountDropdownName")).toHaveText(`tpl${now}`);

    const library = JSON.parse(libraryPayload!);
    expect(library.lists[0].name).toBe("Bikepacking");
    expect(library.items.length).toBe(34);
    // Weights are stored in milligrams: the 1,450 g tent is 1,450,000 mg.
    const tent = library.items.find((i) => i.name === "Hogan SUL 2P tent");
    expect(tent.brand).toBe("VAUDE");
    expect(tent.weight).toBe(1450000);

    await expect(
      page.locator('input.lpCategoryName[value="Bike & Repair"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('input.lpCategoryName[value="Sleep System"]'),
    ).toHaveCount(1);
  });

  test("the light travel template builds a list for one 30 L pack", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    let libraryPayload: string | null = null;
    await page.route("**/register", async (route) => {
      libraryPayload = route.request().postDataJSON()?.library ?? null;
      await route.continue();
    });

    await registerUserWithTemplate(
      page,
      `tpl${now}`,
      "testtest",
      `tpl+${now}@lighterpack.com`,
      "Light travel",
    );
    await expect(page.locator(".accountDropdownName")).toHaveText(`tpl${now}`);

    const library = JSON.parse(libraryPayload!);
    expect(library.lists[0].name).toBe("Light travel");
    expect(library.items.length).toBe(41);
    const pack = library.items.find((i) => i.name === "30 L travel backpack");
    expect(pack.weight).toBe(900000);

    await expect(
      page.locator('input.lpCategoryName[value="Hygiene & Health"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('input.lpCategoryName[value="Electronics & Essentials"]'),
    ).toHaveCount(1);
  });

  test("the via ferrata template builds a list with the safety gear", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    let libraryPayload: string | null = null;
    await page.route("**/register", async (route) => {
      libraryPayload = route.request().postDataJSON()?.library ?? null;
      await route.continue();
    });

    await registerUserWithTemplate(
      page,
      `tpl${now}`,
      "testtest",
      `tpl+${now}@lighterpack.com`,
      "Via ferrata",
    );
    await expect(page.locator(".accountDropdownName")).toHaveText(`tpl${now}`);

    const library = JSON.parse(libraryPayload!);
    expect(library.lists[0].name).toBe("Via ferrata");
    expect(library.items.length).toBe(29);
    const lanyard = library.items.find((i) => i.name === "Via ferrata lanyard");
    expect(lanyard.weight).toBe(530000);

    await expect(
      page.locator('input.lpCategoryName[value="Safety & Navigation"]'),
    ).toHaveCount(1);
  });

  test("dismiss picker starts blank — POST fires without template items", async ({
    page,
  }) => {
    const now = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const username = `tpl${now}`;

    let libraryPayload: string | null | undefined = undefined;
    await page.route("**/register", async (route) => {
      const body = route.request().postDataJSON();
      libraryPayload = body?.library ?? null;
      await route.continue();
    });

    await registerUser(
      page,
      username,
      "testtest",
      `tpl+${now}@lighterpack.com`,
    );

    await expect(page.locator(".accountDropdownName")).toHaveText(username);
    // A blank start may still send the quick-setup choices (units, currency, names),
    // but never any template items.
    expect(libraryPayload).not.toBeUndefined();
    const library = libraryPayload ? JSON.parse(libraryPayload) : { items: [] };
    expect(library.items ?? []).toHaveLength(0);
  });

  test("skip registration with template populates local library", async ({
    page,
  }) => {
    await page.goto(testRoot);

    await page.getByText("Skip account for now").click();
    await expect(page.getByText("What is your next adventure?")).toBeVisible();

    await page
      .getByText("Ultralight weekend", { exact: true })
      .locator("..")
      .locator("..")
      .getByRole("button", { name: "Select" })
      .click();

    await expect(
      page.locator('input.lpCategoryName[value="Shelter"]'),
    ).toHaveCount(1);
  });
});
