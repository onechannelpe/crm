import { test } from "./fixtures/auth.fixture";
import { PasskeyRecoveryPage } from "./pages/passkey-recovery-page";
import { VerifyPage } from "./pages/verify-page";

test.describe("login recovery", () => {
  test("shows an expired verification state for an invalid login flow", async ({
    page,
  }) => {
    const verifyPage = new VerifyPage(page);

    await verifyPage.gotoInvalidFlow();
    await verifyPage.expectExpiredFlow();
  });

  test("shows the unsupported-browser state on the passkey route", async ({
    page,
    auth,
  }) => {
    const passkeyUser = await auth.seeded("passkeyUser");
    const flow = await auth.createPasskeyFlow(passkeyUser);
    const recoveryPage = new PasskeyRecoveryPage(page);

    await auth.mockUnsupportedPasskey(page);
    await recoveryPage.goto(flow.id);
    await recoveryPage.expectUnsupportedBrowser();
  });

  test("keeps the user on the passkey route when the browser ceremony is cancelled", async ({
    page,
    auth,
  }) => {
    const passkeyUser = await auth.seeded("passkeyUser");
    const flow = await auth.createPasskeyFlow(passkeyUser);
    const recoveryPage = new PasskeyRecoveryPage(page);

    await recoveryPage.goto(flow.id);
    await auth.mockCancelledPasskey(page);
    await recoveryPage.retryAfterCancellation();
  });
});
