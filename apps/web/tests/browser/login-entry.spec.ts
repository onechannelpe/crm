import { test } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login-page";

test.describe("login entry", () => {
  test("renders the login options and password form", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectLoginOptions();
  });
});
