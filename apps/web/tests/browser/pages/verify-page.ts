import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class VerifyPage {
  constructor(private readonly page: Page) {}

  async expectTotpStep() {
    await expect(this.page).toHaveURL(/\/login\/verify\?flow=\d+/);
    await expect(
      this.page.getByRole("heading", { name: "Verificar código" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("textbox", {
        name: /Digito 1 del codigo de verificacion/,
      }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("textbox", {
        name: /Digito [1-6] del codigo de verificacion/,
      }),
    ).toHaveCount(6);
  }

  async gotoInvalidFlow() {
    await this.page.goto("/login/verify?flow=999999");
  }

  async expectExpiredFlow() {
    await expect(this.page.getByRole("alert")).toContainText(
      "La sesión de verificación expiró. Intenta de nuevo.",
    );
    await expect(
      this.page.getByRole("link", { name: "Volver al inicio de sesión" }),
    ).toBeVisible();
  }
}
