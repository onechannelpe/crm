import { test } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login-page";

test.describe("passkey login", () => {
  test("starts discoverable passkey login from the login entry page", async ({
    page,
    auth,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await auth.mockCancelledPasskey(page);
    await loginPage.startDiscoverablePasskeyLogin();

    await loginPage.expectStayedOnLoginEntryAfterPasskeyAttempt();
  });

  test("starts passkey login from the username step without leaving the login page", async ({
    page,
    auth,
  }) => {
    const passkeyUser = await auth.seeded("passkeyUser");
    const loginPage = new LoginPage(page);
    await auth.ensurePasskey(passkeyUser);

    await loginPage.goto();
    await loginPage.openUsernameLogin();
    await loginPage.startPasskeyLogin(passkeyUser.username);

    await loginPage.expectStayedOnLoginAfterPasskeyStart();
  });
});
