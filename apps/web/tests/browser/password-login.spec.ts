import { test } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login-page";
import { VerifyPage } from "./pages/verify-page";

test.describe("password login", () => {
  test("redirects a strong-auth user to totp verification with six-digit validation", async ({
    page,
    auth,
  }) => {
    const strongAuthUser = await auth.seeded("strongAuthUser");
    const loginPage = new LoginPage(page);
    const verifyPage = new VerifyPage(page);

    await loginPage.goto();
    await loginPage.openUsernameLogin();
    await loginPage.continueWithUsername(strongAuthUser.username);
    await loginPage.submitPassword(strongAuthUser.password);

    await verifyPage.expectTotpStep();
  });
});
