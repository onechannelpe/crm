import { createClient } from "@libsql/client";
import { expect, test } from "@playwright/test";

const SEEDED_PASSWORD = "placeholder";
const STRONG_AUTH_USERNAME = "mario.aguirre";
const PASSKEY_USERNAME = "valeria.paredes";
const SEEDED_PASSKEY_ID = "c2VlZGVkLXBhc3NrZXktYXV0aC0x";

async function ensureBrowserAuthFixtures() {
  const dbPath = process.env.WEB_DB_PATH;
  if (!dbPath) {
    throw new Error("WEB_DB_PATH is required for browser auth tests");
  }

  const client = createClient({
    url: `file:${dbPath}`,
    intMode: "number",
  });
  await client.execute({
    sql: `
      INSERT OR IGNORE INTO passkeys
        (id, created_at, user_id, public_key, counter, transports)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      SEEDED_PASSKEY_ID,
      Date.now(),
      1,
      Buffer.from("seeded-browser-passkey-public-key").toString("base64"),
      0,
      JSON.stringify(["internal"]),
    ],
  });
}

test.describe("auth browser flow", () => {
  test.beforeAll(async () => {
    await ensureBrowserAuthFixtures();
  });

  function passwordForm(page: import("@playwright/test").Page) {
    return page.locator("form").first();
  }

  test("renders the password login form with stable labels and fields", async ({
    page,
  }) => {
    await page.goto("/login");
    const form = passwordForm(page);

    await expect(
      page.getByRole("link", { name: "Continuar con Google" }),
    ).toBeVisible();
    await expect(form.getByRole("textbox", { name: /Usuario/ })).toBeVisible();
    await expect(
      form.getByRole("textbox", { name: "Contraseña" }),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("redirects a strong-auth user to totp verification with six-digit validation", async ({
    page,
  }) => {
    await page.goto("/login");
    const form = passwordForm(page);

    await form
      .getByRole("textbox", { name: /Usuario/ })
      .fill(STRONG_AUTH_USERNAME);
    await form
      .getByRole("textbox", { name: "Contraseña" })
      .fill(SEEDED_PASSWORD);
    await form.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(/\/login\/verify\?flow=\d+/);
    await expect(
      page.getByRole("heading", { name: "Verificar código" }),
    ).toBeVisible();
    await expect(page.getByLabel("Codigo de verificacion")).toHaveAttribute(
      "pattern",
      "[0-9]{6}",
    );
  });

  test("shows an expired verification state for an invalid login flow", async ({
    page,
  }) => {
    await page.goto("/login/verify?flow=999999");

    await expect(page.getByRole("alert")).toContainText(
      "La sesión de verificación expiró. Intenta de nuevo.",
    );
    await expect(
      page.getByRole("link", { name: "Volver al inicio de sesión" }),
    ).toBeVisible();
  });

  test("uses a dedicated passkey start form when passkeys are supported", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium");

    await page.goto("/login");

    await expect(page.locator("form")).toHaveCount(1);
    await page
      .getByRole("link", { name: "Continuar con clave de acceso" })
      .click();
    await expect(page).toHaveURL("/login/passkey/start");
    await expect(page.getByLabel("Usuario")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar con clave de acceso" }),
    ).toHaveCount(1);
  });

  test("shows the unsupported-browser state on the passkey route", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium");

    await page.goto("/login/passkey/start");
    await page.getByLabel("Usuario").fill(PASSKEY_USERNAME);
    await page
      .getByRole("button", { name: "Continuar con clave de acceso" })
      .click();
    await expect(page).toHaveURL(/\/login\/passkey\?flow=\d+/);

    const flowUrl = page.url();
    await page.addInitScript(() => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        configurable: true,
      });
    });
    await page.goto(flowUrl);

    await expect(page.getByRole("alert")).toContainText(
      "Este navegador no admite claves de acceso.",
    );
  });

  test("keeps the user on the passkey route when the browser ceremony is cancelled", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium");

    await page.goto("/login/passkey/start");
    await page.getByLabel("Usuario").fill(PASSKEY_USERNAME);
    await page
      .getByRole("button", { name: "Continuar con clave de acceso" })
      .click();
    await expect(page).toHaveURL(/\/login\/passkey\?flow=\d+/);

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

    await page
      .getByRole("button", { name: "Continuar con clave de acceso" })
      .click();

    await expect(page).toHaveURL(/\/login\/passkey\?flow=\d+/);
    await expect(page.getByRole("alert")).toContainText(
      "La verificación con clave de acceso se canceló. Intenta de nuevo.",
    );
  });
});
