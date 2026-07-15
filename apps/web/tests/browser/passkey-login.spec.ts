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
});
