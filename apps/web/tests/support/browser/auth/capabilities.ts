import type { Page } from "@playwright/test";

export async function mockUnsupportedPasskey(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "PublicKeyCredential", {
      value: undefined,
      configurable: true,
    });
  });
}

export async function mockCancelledPasskey(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "credentials", {
      value: {
        get: async () => {
          throw new DOMException("User cancelled", "NotAllowedError");
        },
      },
      configurable: true,
    });
  });
}
