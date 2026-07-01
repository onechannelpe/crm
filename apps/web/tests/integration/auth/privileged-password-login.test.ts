import { createAuthScenario } from "@tests/support/auth/scenario";
import { createTestPasskeyProvider } from "@tests/support/passkey/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { asAuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

describe("privileged password login", () => {
  const scenario = createAuthScenario("privileged-password-login");
  const identity = "superuser" as const;
  const rightPassword = "SuperSecret123!";
  const requestMeta = {
    ipAddress: "198.51.100.88",
    userAgent: "vitest-agent",
  };

  beforeEach(async () => {
    await scenario.setup();
    await scenario.setPassword(identity, rightPassword);
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("rejects privileged login without strong auth after onboarding", async () => {
    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) throw new Error("expected strong auth requirement");
    expect(result.error.kind).toBe("strong_auth_required");
  });

  it("allows privileged bootstrap login without strong marker before onboarding", async () => {
    const user = scenario.identity(identity);
    await scenario.setOnboarding(identity, false);

    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "complete") {
      throw new Error("expected bootstrap password completion");
    }

    expect(result.value.result.role).toBe("superuser");
    expect(result.value.result.onboardingCompleted).toBe(false);
    const sessions = await scenario.ctx.repos.sessions.listForUser(user.userId);
    expect(sessions[0]?.session_class).toBe("pre_auth");
    expect(sessions[0]?.primary_auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_method).toBeNull();
    expect(sessions[0]?.strong_auth_at).toBeNull();
  });

  it("moves onboarded privileged login to a totp verification step", async () => {
    await scenario.enableTotp(identity);

    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "totp_required") {
      throw new Error("expected totp verification step");
    }
  });

  it("moves privileged password login to a passkey verification step when passkey is the only strong factor", async () => {
    await scenario.enablePasskey(identity, "pk-only-super-user");

    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "passkey_required") {
      throw new Error("expected passkey requirement");
    }

    const flow = await getLoginFlowState(
      asAuthLoginFlowId(result.value.flow.id),
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
    );
    expect(flow?.state).toBe("passkey");
  });

  it("marks session as strong-auth when privileged user logs in with valid totp", async () => {
    const user = scenario.identity(identity);
    await scenario.enableTotp(identity);
    const code = await scenario.currentTotpCode(identity);

    const passwordResult = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp verification step");
    }

    const flowId = asAuthLoginFlowId(passwordResult.value.flow.id);
    const result = await scenario.loginTotp(flowId, code, requestMeta);
    expect(isErr(result)).toBe(false);
    if (isErr(result)) throw new Error("expected successful totp login");

    const sessions = await scenario.ctx.repos.sessions.listForUser(user.userId);
    expect(sessions[0]?.session_class).toBe("app");
    expect(sessions[0]?.primary_auth_method).toBe("password");
    expect(sessions[0]?.strong_auth_method).toBe("totp");
    expect(sessions[0]?.strong_auth_at).toBeInstanceOf(Date);
  });

  it("rejects invalid totp code for privileged user", async () => {
    await scenario.enableTotp(identity);

    const passwordResult = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp verification step");
    }

    const result = await scenario.loginTotp(
      asAuthLoginFlowId(passwordResult.value.flow.id),
      "000000",
      requestMeta,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) throw new Error("expected invalid totp");
    expect(result.error.kind).toBe("invalid_totp");
  });

  it("keeps enrolled factors when provisioning downgrades role", async () => {
    const user = scenario.identity(identity);
    await scenario.enableTotp(identity);
    await scenario.enablePasskey(identity, "pk-downgrade-super-user");

    const enrolledFactor =
      await scenario.ctx.repos.userTotpFactors.findByUserId(user.userId);
    const enrolledPasskeys = await scenario.ctx.repos.passkeys.findByUser(
      user.userId,
    );
    expect(enrolledFactor?.is_enabled).toBe(true);
    expect(enrolledPasskeys).toHaveLength(1);

    await scenario.ctx.repos.users.updateInviteProvisioning(user.userId, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: true,
    });

    const downgradedUser = await scenario.ctx.repos.users.findById(user.userId);
    const downgradedFactor =
      await scenario.ctx.repos.userTotpFactors.findByUserId(user.userId);
    const downgradedPasskeys = await scenario.ctx.repos.passkeys.findByUser(
      user.userId,
    );
    expect(downgradedUser && requiresStrongAuthRole(downgradedUser.role)).toBe(
      false,
    );
    expect(downgradedFactor?.is_enabled).toBe(true);
    expect(downgradedPasskeys).toHaveLength(1);
  });
});
