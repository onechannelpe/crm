import { expectErr, expectOk } from "@tests/support/_core/assertions";
import { createAuthScenario } from "@tests/support/auth/scenario";
import { getSeededIdentity } from "@tests/support/identities/api";
import {
  buildAssertionResponse,
  createAuthFlow,
  createTestPasskeyProvider,
  createWebauthnProviderWithAuth,
} from "@tests/support/passkey/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/server/auth/factors/passkey/service";
import { asAuthLoginFlowId } from "~/server/shared/ids";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("passkey authentication", () => {
  const scenario = createAuthScenario("passkey-authentication");
  const ipAddress = "198.51.100.66";
  const execOne = getSeededIdentity("execOne");
  const backOne = getSeededIdentity("backOne");

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
  });

  it("begin identified login creates authentication challenge", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).beginLogin({
      identifier: "exec.one",
      ipAddress,
      mode: "identified",
    });
    const value = expectOk(result);

    expect(value.mode).toBe("identified");
    const flow = await scenario.ctx.repos.loginFlows.findById(
      asAuthLoginFlowId(value.id),
    );
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(challenge?.type).toBe("authentication");
    expect(challenge?.user_id).toBe(execOne.userId);
    expect(challenge?.challenge).toBe(value.requestOptions.challenge);
  });

  it("begin discoverable login creates unscoped challenge", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).beginLogin({ ipAddress, mode: "discoverable" });
    const value = expectOk(result);

    expect(value.mode).toBe("discoverable");
    const flow = await scenario.ctx.repos.loginFlows.findById(
      asAuthLoginFlowId(value.id),
    );
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(flow?.user_id).toBeNull();
    expect(challenge?.user_id).toBeNull();
  });

  it("finish login issues session on valid assertion", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-workflow-1",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createWebauthnProviderWithAuth(async () => ({
          verified: true,
          userId: execOne.userId,
        })),
      },
    ).finishLogin({
      flowId,
      response: buildAssertionResponse("passkey-1"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    const value = expectOk(result);
    const persisted = await scenario.ctx.repos.loginFlows.findById(flowId);
    expect(persisted).toBeUndefined();
    expect(value.token).toBeTruthy();
    expect(value.role).toBe("executive");
  });

  it("returns invalid credentials when identified flow verifies a different user", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-mismatch-1",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createWebauthnProviderWithAuth(async () => ({
          verified: true,
          userId: backOne.userId,
        })),
      },
    ).finishLogin({
      flowId,
      response: buildAssertionResponse("passkey-1"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    const error = expectErr(result);
    expect(error.kind).toBe("invalid_credentials");
  });

  it("returns flow expired for invalid flow id", async () => {
    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      { webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos) },
    ).finishLogin({
      flowId: asAuthLoginFlowId("01974fd5-f261-7a7d-93f5-2f3d0f96f101"),
      response: buildAssertionResponse("passkey-1"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    const error = expectErr(result);
    expect(error.kind).toBe("flow_expired");
  });
});
