import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "../../src/lib/auth/password/password";
import { authenticatePasswordLogin } from "../../src/lib/auth/password/password-login";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
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
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.88";
  const userAgent = "vitest-agent";
  const username = "super.user";
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

  it("rejects privileged login without strong auth after onboarding", async () => {
    await expect(
      authenticatePasswordLogin(
        { username, password: rightPassword, ipAddress, userAgent },
        {
          repos: ctx.repos,
          sendPrivilegedLoginAlert,
        },
      ),
    ).rejects.toThrow("Strong authentication required");
  });

  it("allows privileged bootstrap login without strong marker before onboarding", async () => {
    await ctx.db
      .updateTable("users")
      .set({ onboarding_completed_at: null })
      .where("id", "=", 5)
      .execute();

    const result = await authenticatePasswordLogin(
      { username, password: rightPassword, ipAddress, userAgent },
      { repos: ctx.repos, sendPrivilegedLoginAlert },
    );

    expect(result.role).toBe("superuser");
    expect(result.onboardingCompleted).toBe(false);
    const sessions = await ctx.repos.sessions.listForUser(5);
    expect(sessions[0]?.auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_at).toBeNull();
  });

  it("rejects onboarded privileged login when totp code is missing", async () => {
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(generateTotpSecret()),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);

    await expect(
      authenticatePasswordLogin(
        {
          username,
          password: rightPassword,
          ipAddress,
          userAgent,
        },
        {
          repos: ctx.repos,
          sendPrivilegedLoginAlert,
        },
      ),
    ).rejects.toThrow("Strong authentication required");
  });

  it("rejects privileged password login when passkey is the only strong factor", async () => {
    await ctx.repos.passkeys.create({
      id: "pk-only-super-user",
      user_id: 5,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    await expect(
      authenticatePasswordLogin(
        {
          username,
          password: rightPassword,
          ipAddress,
          userAgent,
        },
        {
          repos: ctx.repos,
          sendPrivilegedLoginAlert,
        },
      ),
    ).rejects.toThrow("Use a passkey or configure an authenticator app");
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
      {
        username,
        password: rightPassword,
        totpCode: code,
        ipAddress,
        userAgent,
      },
      { repos: ctx.repos, sendPrivilegedLoginAlert },
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
          username,
          password: rightPassword,
          totpCode: "000000",
          ipAddress,
          userAgent,
        },
        {
          repos: ctx.repos,
          sendPrivilegedLoginAlert,
        },
      ),
    ).rejects.toThrow("Invalid TOTP code");
  });

  it("keeps enrolled factors when provisioning downgrades role", async () => {
    const secret = generateTotpSecret();
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(secret),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);
    await ctx.repos.passkeys.create({
      id: "pk-downgrade-super-user",
      user_id: 5,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const enrolledFactor = await ctx.repos.userTotpFactors.findByUserId(5);
    const enrolledPasskeys = await ctx.repos.passkeys.findByUser(5);
    expect(enrolledFactor?.is_enabled).toBe(1);
    expect(enrolledPasskeys).toHaveLength(1);

    await ctx.repos.users.updateInviteProvisioning(5, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: 1,
    });

    const downgradedUser = await ctx.repos.users.findById(5);
    const downgradedFactor = await ctx.repos.userTotpFactors.findByUserId(5);
    const downgradedPasskeys = await ctx.repos.passkeys.findByUser(5);
    expect(downgradedUser?.strong_auth_required).toBe(0);
    expect(downgradedFactor?.is_enabled).toBe(1);
    expect(downgradedPasskeys).toHaveLength(1);
  });
});
