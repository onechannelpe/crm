import { expect, test } from "./fixtures";

test.describe("authentication", () => {
  test("an unauthenticated visitor is sent to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a roster admin reaches the app without logging in", async ({
    asAdmin,
  }) => {
    await asAdmin.goto("/");
    await expect(asAdmin).not.toHaveURL(/\/login/);
  });

  test("two roles are authenticated independently in one test", async ({
    asExecutive,
    asManager,
  }) => {
    await asExecutive.goto("/");
    await asManager.goto("/");
    await expect(asExecutive).not.toHaveURL(/\/login/);
    await expect(asManager).not.toHaveURL(/\/login/);
  });
});
