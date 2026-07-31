import { describe, expect, it } from "vitest";

import { loadServerEnv, validateSecret } from "~/server/platform/config/env";

describe("env validation", () => {
  const baseEnv = {
    SESSION_SECRET: "temp_secret_for_initial_import_32_chars_long",
    TOTP_ENCRYPTION_KEY: "temp_secret_for_initial_import_32_chars_long",
    RECOVERY_CODE_PEPPER: "temp_recovery_pepper_for_tests_32_chars_long",
    ENGINE_HMAC_KEY_ID: "web",
    ENGINE_HMAC_SECRET: "temp_secret_for_initial_import_32_chars_long",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    NOTIFICATION_ROUTES: "email:resend,whatsapp:kapso",
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "support@example.com",
    KAPSO_API_KEY: "test-kapso-api-key",
    KAPSO_WHATSAPP_PHONE_NUMBER_ID: "test-whatsapp-phone-number-id",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN:
      "stable-test-whatsapp-verify-token-satisfies-entropy-checks-12345",
    KAPSO_WEBHOOK_SECRET: "test-kapso-webhook-secret",
  } satisfies Record<string, string>;

  it("throws if secret is too short", () => {
    expect(() => validateSecret("TEST_SECRET", "short")).toThrow(
      "TEST_SECRET must be at least 32 characters long",
    );
  });

  it("throws if secret has too little entropy", () => {
    const lowEntropy = "abababababababababababababababab";
    expect(() => validateSecret("TEST_SECRET", lowEntropy)).toThrow(
      "TEST_SECRET has too little entropy (only 2 unique characters)",
    );
  });

  it("throws if secret is a repeating sequence", () => {
    const repeating = "a".repeat(32);
    expect(() => validateSecret("TEST_SECRET", repeating)).toThrow(
      "TEST_SECRET cannot be a repeating sequence of one character",
    );
  });

  it("throws if secret is a simple sequential string", () => {
    const sequential = "0123456789abcdefghijklmnopqrstuvwxyz";
    expect(() => validateSecret("TEST_SECRET", sequential)).toThrow(
      "TEST_SECRET cannot be a simple sequential string",
    );
  });

  it("applies local development defaults", () => {
    const env = loadServerEnv(baseEnv);

    expect(env.engine.engineConnectMode).toBe("local");
    expect(env.app.publicOrigin).toBe("http://localhost:3000");
    expect(env.database.url).toBe("postgres://postgres@localhost:5432/crm");
  });

  it("normalizes the configured database URL", () => {
    expect(
      loadServerEnv({
        ...baseEnv,
        WEB_DB_URL: "  postgres://postgres@database:5432/crm  ",
      }).database.url,
    ).toBe("postgres://postgres@database:5432/crm");
  });

  it("requires a database URL in production", () => {
    expect(() =>
      loadServerEnv({
        ...baseEnv,
        NODE_ENV: "production",
      }),
    ).toThrow("Missing required env: WEB_DB_URL");
  });

  it("normalizes app public origin", () => {
    expect(
      loadServerEnv({
        ...baseEnv,
        APP_PUBLIC_ORIGIN: "https://crm.example.com/",
      }).app.publicOrigin,
    ).toBe("https://crm.example.com");
  });

  it("rejects invalid app public origins", () => {
    expect(() =>
      loadServerEnv({
        ...baseEnv,
        APP_PUBLIC_ORIGIN: "https://crm.example.com/app",
      }),
    ).toThrow("APP_PUBLIC_ORIGIN must not include a path, query, or hash");
  });

  it("routes email to Resend and WhatsApp to Kapso", () => {
    expect(loadServerEnv(baseEnv).notifications).toMatchObject({
      routes: {
        email: "resend",
        whatsapp: "kapso",
      },
      kapso: {
        metaGraphVersion: "v24.0",
      },
    });
  });

  it("requires only provider credentials used by notification routes", () => {
    expect(() =>
      loadServerEnv({
        ...baseEnv,
        NOTIFICATION_ROUTES: "whatsapp:whatsapp_cloud",
      }),
    ).toThrow("Missing required env: WHATSAPP_CLOUD_ACCESS_TOKEN");

    const notifications = loadServerEnv({
      ...baseEnv,
      NOTIFICATION_ROUTES: "whatsapp:whatsapp_cloud",
      WHATSAPP_CLOUD_ACCESS_TOKEN: "test-whatsapp-access-token",
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: "test-whatsapp-phone-number-id",
    }).notifications;

    expect(notifications.routes.whatsapp).toBe("whatsapp_cloud");
    expect(notifications.resend).toBeNull();
    expect(notifications.kapso).toBeNull();
    expect(notifications.whatsappCloud?.graphVersion).toBe("v24.0");
  });

  it("rejects invalid notification routes", () => {
    expect(() =>
      loadServerEnv({
        ...baseEnv,
        NOTIFICATION_ROUTES: "sms:kapso",
      }),
    ).toThrow("Unknown notification channel in route: sms");

    expect(() =>
      loadServerEnv({
        ...baseEnv,
        NOTIFICATION_ROUTES: "email:kapso",
      }),
    ).toThrow("Notification route email:kapso cannot use a whatsapp provider");
  });

  it("rejects invalid engine connect mode values", () => {
    expect(() =>
      loadServerEnv({
        ...baseEnv,
        ENGINE_CONNECT_MODE: "invalid",
      }),
    ).toThrow("ENGINE_CONNECT_MODE must be one of: local, internal, remote");
  });
});
