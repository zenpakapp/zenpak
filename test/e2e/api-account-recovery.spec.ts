import { test, expect } from "@playwright/test";

// The e-mail routes: what they refuse, and what they do not give away. Sending a real mail needs
// an SMTP catcher, so only the paths that stop before any mail is sent are covered here.
test.use({ locale: "en-US" });

const post = (request, path: string, data: object) =>
  request.post(path, { data, headers: { cookie: "" } });

test("forgotPassword answers the same for an unknown username", async ({
  request,
}) => {
  const response = await post(request, "/forgotPassword", {
    username: `nobody${Date.now()}`,
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).message).toMatch(/reset link has been sent/);
});

test("forgotPassword refuses a username that is too long", async ({
  request,
}) => {
  const response = await post(request, "/forgotPassword", {
    username: "a".repeat(40),
  });
  expect(response.status()).toBe(400);
});

test("forgotUsername refuses an empty address", async ({ request }) => {
  const response = await post(request, "/forgotUsername", { email: "" });
  expect(response.status()).toBe(400);
});

test("forgotUsername answers the same for an unknown address", async ({
  request,
}) => {
  const email = `nobody${Date.now()}@lighterpack.com`;
  const response = await post(request, "/forgotUsername", { email });
  expect(response.status()).toBe(200);
  expect((await response.json()).email).toBe(email);
});

test("resendVerification needs a signed-in account", async ({ request }) => {
  const response = await post(request, "/resendVerification", {});
  expect(response.status()).toBe(401);
});
