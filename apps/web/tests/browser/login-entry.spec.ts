import { test } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login-page";

test.describe("login entry", () => {
  test("renders the login entry actions before showing credential fields", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectEntryActions();
  });

  test("shows the password login form after choosing username login", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.openUsernameLogin();
    await loginPage.continueWithUsername("demo.user");
    await loginPage.expectPasswordStep();
  });
});
