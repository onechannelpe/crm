import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class PasskeyRecoveryPage {
  constructor(private readonly page: Page) {}

  async goto(flowId: string) {
    await this.page.goto(`/login/passkey?flow=${flowId}`);
  }

  async expectUnsupportedBrowser() {
    await expect(this.page.getByRole("alert")).toContainText(
      "Este navegador no admite claves de acceso.",
    );
  }

  async retryAfterCancellation() {
    const retryButton = this.page.getByRole("button", {
      name: "Reintentar con clave de acceso",
    });
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    await expect(this.page).toHaveURL(/\/login\/passkey\?flow=[^&]+/);
    await expect(this.page.getByRole("alert")).toContainText(
      "La verificación con clave de acceso se canceló. Intenta de nuevo.",
    );
  }
}
