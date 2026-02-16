import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "../../src/lib/auth/password/password";
import { authenticatePasswordLogin } from "../../src/lib/auth/password/password-login";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "../../src/lib/auth/totp/secret-crypto";
import {
  generateCurrentTotpCode,
  generateTotpSecret,
} from "../../src/lib/auth/totp/totp";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("privileged password login", () => {
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.88";
  const userAgent = "vitest-agent";
  const email = "super@test.local";
  const rightPassword = "SuperSecret123!";

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("privileged-password-login");
    await ctx.db
      .updateTable("users")
      .set({ password_hash: await hashPassword(rightPassword) })
      .where("id", "=", 5)
      .execute();
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("allows privileged password login without strong marker when no totp code is provided", async () => {
    const result = await authenticatePasswordLogin(
      { email, password: rightPassword, ipAddress, userAgent },
      ctx.repos,
    );

    expect(result.role).toBe("superuser");
    const sessions = await ctx.repos.sessions.listForUser(5);
    expect(sessions[0]?.auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_at).toBeNull();
  });

  it("marks session as strong-auth when privileged user logs in with valid totp", async () => {
    const secret = generateTotpSecret();
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(secret),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);
    const stored = await ctx.repos.userTotpFactors.findByUserId(5);
    expect(stored).toBeDefined();
    const code = generateCurrentTotpCode(
      await decryptTotpSecret(stored!.secret_encrypted),
    );

    await authenticatePasswordLogin(
      { email, password: rightPassword, totpCode: code, ipAddress, userAgent },
      ctx.repos,
    );

    const sessions = await ctx.repos.sessions.listForUser(5);
    expect(sessions[0]?.auth_method).toBe("password_totp");
    expect(typeof sessions[0]?.strong_auth_at).toBe("number");
  });

  it("rejects invalid totp code for privileged user", async () => {
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(generateTotpSecret()),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);

    await expect(
      authenticatePasswordLogin(
        {
          email,
          password: rightPassword,
          totpCode: "000000",
          ipAddress,
          userAgent,
        },
        ctx.repos,
      ),
    ).rejects.toThrow("Invalid TOTP code");
  });
});
