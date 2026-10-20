import { test, expect } from "@playwright/test";

import { testRoot } from "./utils";

// A request that fails with nothing to say used to show an English sentence on every page. It now
// follows the language of the page.
const cases = [
  {
    locale: "fr",
    sentence: "Une erreur s'est produite, veuillez réessayer plus tard.",
  },
  {
    locale: "de",
    sentence: "Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
  },
  {
    locale: "es",
    sentence: "Se produjo un error, inténtalo de nuevo más tarde.",
  },
  { locale: "en", sentence: "An error occurred, please try again later." },
];

for (const { locale, sentence } of cases) {
  test(`a failed sign-in with no message is shown in ${locale}`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.addInitScript((value) => {
      localStorage.setItem("zp-locale", value);
    }, locale);
    // The server answers 500 with an empty body: nothing to show but the generic sentence.
    await page.route("**/signin/", (route) =>
      route.fulfill({ status: 500, body: "" }),
    );

    await page.goto(`${testRoot}signin`);
    await page.fill('.signin input[name="username"]', "someone");
    await page.fill('.signin input[name="password"]', "somepassword");
    await page.locator(".signin .lpButton").first().click();

    await expect(page.locator(".signin .lpError")).toHaveText(sentence, {
      timeout: 15000,
    });
  });
}
