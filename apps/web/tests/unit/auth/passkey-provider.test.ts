import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { resolveWebauthnRelyingParty } from "~/server/auth/factors/passkey-provider";

describe("passkey relying party resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeAll(() => {
    vi.stubEnv(
      "SESSION_SECRET",
      "temp_secret_for_initial_import_32_chars_long",
    );
    vi.stubEnv(
      "TOTP_ENCRYPTION_KEY",
      "temp_secret_for_initial_import_32_chars_long",
    );
    vi.stubEnv("ENGINE_HMAC_KEY_ID", "web");
    vi.stubEnv(
      "ENGINE_HMAC_SECRET",
      "temp_secret_for_initial_import_32_chars_long",
    );
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv(
      "GOOGLE_REDIRECT_URI",
      "http://localhost:3000/api/auth/google/callback",
    );
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "support@example.com");
  });

  it("uses the forwarded public origin and host behind a trusted proxy", () => {
    vi.stubEnv("TRUSTED_PROXY", "true");

    const relyingParty = resolveWebauthnRelyingParty(
      new Request("http://127.0.0.1:3000/settings/security", {
        headers: {
          "x-forwarded-proto": "https",
          "x-forwarded-host":
            "5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
        },
      }),
    );

    expect(relyingParty).toEqual({
      origin:
        "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
      rpID: "5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
    });
  });
});
