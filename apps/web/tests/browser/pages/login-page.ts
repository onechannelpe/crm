import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async expectLoginOptions() {
    await expect(
      this.page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Entrar con llave de acceso" }),
    ).toBeVisible();
    await this.expectPasswordForm();
  }

  async startDiscoverablePasskeyLogin() {
    await this.page
      .getByRole("button", { name: "Entrar con llave de acceso" })
      .click();
  }

  async expectStayedOnLoginEntryAfterPasskeyAttempt() {
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(
      this.page.getByRole("button", { name: "Entrar con llave de acceso" }),
    ).toHaveCount(1);
  }

  private async expectPasswordForm() {
    const form = this.passwordForm();
    await expect(form.getByRole("textbox", { name: /Usuario/ })).toBeVisible();
    await expect(
      form.getByRole("textbox", { name: "Contraseña" }),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
  }

  async fillUsername(username: string) {
    await this.page.getByRole("textbox", { name: /Usuario/ }).fill(username);
  }

  async submitPassword(password: string) {
    const form = this.passwordForm();
    await form.getByRole("textbox", { name: "Contraseña" }).fill(password);
    await form.getByRole("button", { name: "Iniciar sesión" }).click();
  }

  private passwordForm() {
    return this.page.locator("form").first();
  }
}
