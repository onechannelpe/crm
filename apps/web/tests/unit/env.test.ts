import { beforeAll, describe, expect, it } from "vitest";

describe("env validation", () => {
  let validateSecret: (key: string, value: string) => void;
  let parseEnv: typeof import("../../src/lib/env").parseEnv;
  const baseEnv = {
    SESSION_SECRET: "temp_secret_for_initial_import_32_chars_long",
    TOTP_ENCRYPTION_KEY: "temp_secret_for_initial_import_32_chars_long",
    ENGINE_HMAC_KEY_ID: "web",
    ENGINE_HMAC_SECRET: "temp_secret_for_initial_import_32_chars_long",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  } satisfies Record<string, string>;

  beforeAll(async () => {
    process.env.SESSION_SECRET = baseEnv.SESSION_SECRET;
    process.env.TOTP_ENCRYPTION_KEY = baseEnv.TOTP_ENCRYPTION_KEY;
    process.env.ENGINE_HMAC_KEY_ID = baseEnv.ENGINE_HMAC_KEY_ID;
    process.env.ENGINE_HMAC_SECRET = baseEnv.ENGINE_HMAC_SECRET;
    process.env.GOOGLE_CLIENT_ID = baseEnv.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = baseEnv.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_REDIRECT_URI = baseEnv.GOOGLE_REDIRECT_URI;

    const mod = await import("../../src/lib/env");
    validateSecret = mod.validateSecret;
    parseEnv = mod.parseEnv;
  });

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

  it("passes for a strong secret", () => {
    const strong = "k7vB9pL2mN5qR4xT1yZ8wS3uJ6hA0gC9";
    expect(() => validateSecret("TEST_SECRET", strong)).not.toThrow();
  });

  it("defaults engine connect mode to local", () => {
    expect(parseEnv(baseEnv).engineConnectMode).toBe("local");
  });

  it("rejects invalid engine connect mode values", () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        ENGINE_CONNECT_MODE: "invalid",
      }),
    ).toThrow("ENGINE_CONNECT_MODE must be one of: local, remote");
  });
});
