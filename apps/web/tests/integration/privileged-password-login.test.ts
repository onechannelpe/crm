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

  it("rejects privileged login without strong auth after onboarding", async () => {
    await expect(
      authenticatePasswordLogin(
        { email, password: rightPassword, ipAddress, userAgent },
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
      { email, password: rightPassword, ipAddress, userAgent },
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
          email,
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

  it("rejects privileged login when enrolled marker exists but factor is missing", async () => {
    await ctx.db
      .updateTable("users")
      .set({ strong_auth_enrolled_at: Date.now() })
      .where("id", "=", 5)
      .execute();

    await expect(
      authenticatePasswordLogin(
        {
          email,
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
          email,
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

  it("clears strong-auth enrollment marker when provisioning downgrades role", async () => {
    const secret = generateTotpSecret();
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(secret),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);

    const enrolledUser = await ctx.repos.users.findById(5);
    expect(enrolledUser?.strong_auth_enrolled_at).not.toBeNull();

    await ctx.repos.users.updateInviteProvisioning(5, {
      team_id: null,
      full_name: "Super User",
      role: "executive",
      is_active: 1,
    });

    const downgradedUser = await ctx.repos.users.findById(5);
    expect(downgradedUser?.strong_auth_required).toBe(0);
    expect(downgradedUser?.strong_auth_enrolled_at).toBeNull();
  });
});
