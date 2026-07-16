import { test } from "./fixtures/auth.fixture";
import { LoginPage } from "./pages/login-page";
import { VerifyPage } from "./pages/verify-page";

test.describe("password login", () => {
  test("redirects a strong-auth user to totp verification with six-digit validation", async ({
    page,
    auth,
  }) => {
    const strongAuthUser = await auth.user({
      role: "sales_manager",
      onboardingCompleted: true,
    });
    await auth.ensureTotp(strongAuthUser);
    const loginPage = new LoginPage(page);
    const verifyPage = new VerifyPage(page);

    await loginPage.goto();
    await loginPage.fillUsername(strongAuthUser.username);
    await loginPage.submitPassword(strongAuthUser.password);

    await verifyPage.expectTotpStep();
  });

  test("redirects an onboarding-incomplete privileged user to onboarding", async ({
    page,
    auth,
  }) => {
    const onboardingUser = await auth.seeded("strongAuthUser");
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillUsername(onboardingUser.username);
    await loginPage.submitPassword(onboardingUser.password);

    await page.waitForURL("**/onboarding");
  });
});
