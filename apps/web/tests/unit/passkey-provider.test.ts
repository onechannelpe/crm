import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { resolveWebauthnRelyingParty } from "../../src/lib/auth/providers/passkey-provider";
import { _resetEnvCache } from "../../src/lib/env";

describe("passkey relying party resolution", () => {
  beforeEach(() => {
    _resetEnvCache();
  });

  beforeAll(() => {
    process.env.SESSION_SECRET = "temp_secret_for_initial_import_32_chars_long";
    process.env.TOTP_ENCRYPTION_KEY =
      "temp_secret_for_initial_import_32_chars_long";
    process.env.ENGINE_HMAC_KEY_ID = "web";
    process.env.ENGINE_HMAC_SECRET =
      "temp_secret_for_initial_import_32_chars_long";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/auth/google/callback";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "support@example.com";
  });

  it("uses the forwarded public origin and host behind a trusted proxy", () => {
    process.env.TRUSTED_PROXY = "true";

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

    process.env.TRUSTED_PROXY = "false";
  });
});
