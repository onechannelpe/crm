import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async expectEntryActions() {
    await expect(
      this.page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Continuar con usuario" }),
    ).toBeVisible();
  }

  async openUsernameLogin() {
    const usernameButton = this.page.getByRole("button", {
      name: "Continuar con usuario",
    });
    const passwordInput = this.page.getByRole("textbox", {
      name: "Contraseña",
    });

    await expect(usernameButton).toBeVisible();
    await Promise.all([
      this.page.waitForURL(/\/login\?method=user$/),
      usernameButton.click(),
    ]);
    await expect(passwordInput).toBeVisible();
  }

  async expectPasswordStep() {
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

  async startPasskeyLogin(username: string) {
    await this.fillUsername(username);
    await this.page
      .getByRole("button", { name: "Usar clave de acceso" })
      .click();
  }

  async expectStayedOnLoginAfterPasskeyStart() {
    await expect(this.page).toHaveURL(/\/login\?method=user$/);
    await expect(
      this.page.getByRole("button", { name: "Usar clave de acceso" }),
    ).toHaveCount(1);
  }

  private passwordForm() {
    return this.page.locator("form").first();
  }
}
