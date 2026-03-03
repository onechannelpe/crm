import { describe, it, expect, beforeAll } from "vitest";

describe("validateSecret", () => {
  let validateSecret: (key: string, value: string) => void;

  beforeAll(async () => {
    process.env.SESSION_SECRET = "temp_secret_for_initial_import_32_chars_long";
    process.env.ENGINE_HMAC_KEY_ID = "web";
    process.env.ENGINE_HMAC_SECRET =
      "temp_secret_for_initial_import_32_chars_long";

    const mod = await import("../../src/lib/env");
    validateSecret = mod.validateSecret;
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
});
