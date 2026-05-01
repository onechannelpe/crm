import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { requiresStrongAuthRole } from "~/lib/auth/security/strong-auth-status";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { generateCurrentTotpCode } from "~/lib/auth/totp/totp";
import { submitPasswordLogin } from "~/server/auth/application/commands/submit-password-login";
import { submitTotpForLoginFlow } from "~/server/auth/application/commands/submit-totp-login";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { isErr } from "~/server/shared/result";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import {
  enableIdentityPasskey,
  enableIdentityTotp,
  getSeededIdentity,
  setIdentityOnboarding,
  setIdentityPassword,
} from "@tests/support/identities/api";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("privileged password login", () => {
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.88";
  const userAgent = "vitest-agent";
  const identity = getSeededIdentity("superuser");
  const username = identity.username;
  const rightPassword = "SuperSecret123!";

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("privileged-password-login");
    await setIdentityPassword(ctx, identity, rightPassword);
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("rejects privileged login without strong auth after onboarding", async () => {
    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected strong auth requirement");
    }
    expect(result.error.kind).toBe("strong_auth_required");
  });

  it("allows privileged bootstrap login without strong marker before onboarding", async () => {
    await setIdentityOnboarding(ctx, identity, false);

    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected bootstrap password login");
    }

    expect(result.value.kind).toBe("complete");
    if (result.value.kind !== "complete") {
      throw new Error("expected bootstrap password completion");
    }

    expect(result.value.result.role).toBe("superuser");
    expect(result.value.result.onboardingCompleted).toBe(false);
    const sessions = await ctx.repos.sessions.listForUser(identity.userId);
    expect(sessions[0]?.session_class).toBe("pre_auth");
    expect(sessions[0]?.primary_auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_method).toBeNull();
    expect(sessions[0]?.strong_auth_at).toBeNull();
  });

  it("moves onboarded privileged login to a totp verification step", async () => {
    await enableIdentityTotp(ctx, identity);

    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "totp_required") {
      throw new Error("expected totp verification step");
    }
  });

  it("moves privileged password login to a passkey verification step when passkey is the only strong factor", async () => {
    await enableIdentityPasskey(ctx, identity, "pk-only-super-user");

    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "passkey_required") {
      throw new Error("expected passkey requirement");
    }

    const flow = await getLoginFlowState(result.value.flow.id, ctx.repos);
    expect(flow?.state).toBe("passkey");
  });

  it("marks session as strong-auth when privileged user logs in with valid totp", async () => {
    await enableIdentityTotp(ctx, identity);
    const stored = await ctx.repos.userTotpFactors.findByUserId(
      identity.userId,
    );
    if (stored == null) throw new Error("totp factor not found");
    const code = generateCurrentTotpCode(
      await decryptTotpSecret(stored.secret_encrypted),
    );

    const passwordResult = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp verification step");
    }

    const result = await submitTotpForLoginFlow(
      {
        flowId: passwordResult.value.flow.id,
        totpCode: code,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful totp login");
    }

    const sessions = await ctx.repos.sessions.listForUser(identity.userId);
    expect(sessions[0]?.session_class).toBe("app");
    expect(sessions[0]?.primary_auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_method).toBe("totp");
    expect(typeof sessions[0]?.strong_auth_at).toBe("number");
  });

  it("rejects invalid totp code for privileged user", async () => {
    await enableIdentityTotp(ctx, identity);

    const passwordResult = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp verification step");
    }

    const result = await submitTotpForLoginFlow(
      {
        flowId: passwordResult.value.flow.id,
        totpCode: "000000",
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid totp");
    }
    expect(result.error.kind).toBe("invalid_totp");
  });

  it("keeps enrolled factors when provisioning downgrades role", async () => {
    await enableIdentityTotp(ctx, identity);
    await enableIdentityPasskey(ctx, identity, "pk-downgrade-super-user");

    const enrolledFactor = await ctx.repos.userTotpFactors.findByUserId(
      identity.userId,
    );
    const enrolledPasskeys = await ctx.repos.passkeys.findByUser(
      identity.userId,
    );
    expect(enrolledFactor?.is_enabled).toBe(1);
    expect(enrolledPasskeys).toHaveLength(1);

    await ctx.repos.users.updateInviteProvisioning(identity.userId, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: 1,
    });

    const downgradedUser = await ctx.repos.users.findById(identity.userId);
    const downgradedFactor = await ctx.repos.userTotpFactors.findByUserId(
      identity.userId,
    );
    const downgradedPasskeys = await ctx.repos.passkeys.findByUser(
      identity.userId,
    );
    expect(downgradedUser && requiresStrongAuthRole(downgradedUser.role)).toBe(
      false,
    );
    expect(downgradedFactor?.is_enabled).toBe(1);
    expect(downgradedPasskeys).toHaveLength(1);
  });
});
