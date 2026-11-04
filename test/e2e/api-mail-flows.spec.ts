import { test, expect } from "@playwright/test";

// The e-mail routes, end to end: the mail is read from Mailpit, the development mail catcher
// (`mailpit`, SMTP on 1025, web API on 8025). The tests skip when Mailpit is not running.
test.use({ locale: "en-US" });

const MAILPIT = "http://127.0.0.1:8025";

const unique = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

async function mailpitIsUp(request) {
  try {
    const response = await request.get(`${MAILPIT}/api/v1/info`, {
      timeout: 2000,
    });
    return response.ok();
  } catch {
    return false;
  }
}

async function waitForMail(request, to: string, subject: string, count = 1) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const { messages } = await search.json();
    // Registering also sends a mail to the same address, so the subject picks the right one.
    // The newest comes first.
    const matching = (messages || []).filter((m) => m.Subject.includes(subject));
    const found = matching.length >= count ? matching[0] : null;
    if (found) {
      const message = await request.get(`${MAILPIT}/api/v1/message/${found.ID}`);
      return message.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No mail "${subject}" for ${to}`);
}

async function register(request, username: string, email: string) {
  const response = await request.post("/register", {
    data: { username, email, password: "testtest" },
  });
  expect(response.status()).toBe(200);
}

test.beforeEach(async ({ request }) => {
  test.skip(!(await mailpitIsUp(request)), "Mailpit is not running");
});

test("a reset link changes the password and ends the old one", async ({
  request,
}) => {
  const id = unique();
  const username = `rs${id}`;
  const email = `rs+${id}@lighterpack.com`;
  await register(request, username, email);

  const sent = await request.post("/forgotPassword", { data: { username } });
  expect(sent.status()).toBe(200);

  const mail = await waitForMail(request, email, "Reset your");
  const token = /reset-password\?token=([a-f0-9]+)/.exec(mail.Text)?.[1];
  expect(token).toBeTruthy();

  const reset = await request.post("/resetPassword", {
    data: { token, password: "newpassword" },
  });
  expect(reset.status()).toBe(200);

  const fresh = await request.post("/signin", {
    data: { username, password: "newpassword" },
  });
  expect(fresh.status()).toBe(200);
  const old = await request.post("/signin", {
    data: { username, password: "testtest" },
  });
  expect(old.status()).not.toBe(200);
});

test("a reset link cannot be used twice", async ({ request }) => {
  const id = unique();
  const username = `rt${id}`;
  const email = `rt+${id}@lighterpack.com`;
  await register(request, username, email);
  await request.post("/forgotPassword", { data: { username } });
  const mail = await waitForMail(request, email, "Reset your");
  const token = /reset-password\?token=([a-f0-9]+)/.exec(mail.Text)?.[1];

  const first = await request.post("/resetPassword", {
    data: { token, password: "newpassword" },
  });
  expect(first.status()).toBe(200);
  const second = await request.post("/resetPassword", {
    data: { token, password: "another1" },
  });
  expect(second.status()).toBe(400);
});

test("forgotUsername mails the username to its address", async ({
  request,
}) => {
  const id = unique();
  const username = `fu${id}`;
  const email = `fu+${id}@lighterpack.com`;
  await register(request, username, email);

  const sent = await request.post("/forgotUsername", { data: { email } });
  expect(sent.status()).toBe(200);

  const mail = await waitForMail(request, email, "username");
  expect(mail.Text).toContain(username);
});

test("resendVerification mails a link that verifies the address", async ({
  request,
}) => {
  const id = unique();
  const username = `vf${id}`;
  const email = `vf+${id}@lighterpack.com`;
  await register(request, username, email);

  const before = await request.get("/api/auth/me");
  expect((await before.json()).emailVerified).toBe(false);

  const resent = await request.post("/resendVerification", { data: {} });
  expect(resent.status(), await resent.text()).toBe(200);

  // Two mails: the one from registering, then this one, whose link replaces the first.
  const mail = await waitForMail(request, email, "Verify", 2);
  const token = /verify-email\?token=([a-f0-9]+)/.exec(mail.Text)?.[1];
  expect(token).toBeTruthy();

  const verify = await request.get(`/verify-email?token=${token}`, {
    maxRedirects: 0,
  });
  expect(verify.status()).toBe(302);
  expect(verify.headers().location).toContain("success=1");

  const after = await request.get("/api/auth/me");
  expect((await after.json()).emailVerified).toBe(true);

  const again = await request.post("/resendVerification", { data: {} });
  expect((await again.json()).alreadyVerified).toBe(true);
});
