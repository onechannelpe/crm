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

import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { verifyPasskeyLogin } from "~/server/auth/factors/passkey/service";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { startPasskeyLogin } from "~/server/auth/flows/start-passkey-login";
import {
  createAuthLoginContext,
  type AuthLoginContext,
} from "~/server/auth/infrastructure/login-context";
import { AuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

async function finishPasskeyLogin(
  login: AuthLoginContext,
  input: {
    webauthnProvider: WebauthnProvider;
    flowId: AuthLoginFlowId;
    response: Parameters<WebauthnProvider["verifyAuthentication"]>[0];
    ipAddress: string;
    userAgent: string | null;
  },
) {
  const occurredAt = login.now();
  const verified = await verifyPasskeyLogin(login.repos, {
    flowId: input.flowId,
    response: input.response,
    ipAddress: input.ipAddress,
    occurredAt,
    webauthnProvider: input.webauthnProvider,
  });
  if (isErr(verified)) return verified;

  return completePendingLogin(login, {
    proof: verified.value,
    occurredAt,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

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
    const login = createAuthLoginContext(scenario.ctx.db);
    const result = await startPasskeyLogin(
      { identifier: "exec.one", ipAddress, mode: "identified" },
      login,
      createTestPasskeyProvider(login.repos),
    );
    const value = expectOk(result);

    expect(value.mode).toBe("identified");
    const flow = await scenario.ctx.repos.loginFlows.findById(
      AuthLoginFlowId.trust(value.id),
    );
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(challenge?.type).toBe("authentication");
    expect(challenge?.user_id).toBe(execOne.userId);
    expect(challenge?.challenge).toBe(value.requestOptions.challenge);
  });

  it("begin discoverable login creates unscoped challenge", async () => {
    const login = createAuthLoginContext(scenario.ctx.db);
    const result = await startPasskeyLogin(
      { ipAddress, mode: "discoverable" },
      login,
      createTestPasskeyProvider(login.repos),
    );
    const value = expectOk(result);

    expect(value.mode).toBe("discoverable");
    const flow = await scenario.ctx.repos.loginFlows.findById(
      AuthLoginFlowId.trust(value.id),
    );
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(flow?.user_id).toBeNull();
    expect(challenge?.user_id).toBeNull();
  });

  it("finish login issues session on valid assertion", async () => {
    await scenario.ctx.repos.passkeys.create({
      id: "passkey-1",
      user_id: execOne.userId,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
      created_at: new Date(),
    });
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-workflow-1",
    });

    const result = await finishPasskeyLogin(
      createAuthLoginContext(scenario.ctx.db),
      {
        webauthnProvider: createWebauthnProviderWithAuth(async () => ({
          verified: true,
          userId: execOne.userId,
        })),
        flowId,
        response: buildAssertionResponse("passkey-1"),
        ipAddress,
        userAgent: "vitest-agent",
      },
    );

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

    const result = await finishPasskeyLogin(
      createAuthLoginContext(scenario.ctx.db),
      {
        webauthnProvider: createWebauthnProviderWithAuth(async () => ({
          verified: true,
          userId: backOne.userId,
        })),
        flowId,
        response: buildAssertionResponse("passkey-1"),
        ipAddress,
        userAgent: "vitest-agent",
      },
    );

    const error = expectErr(result);
    expect(error.kind).toBe("invalid_credentials");
  });

  it("returns flow expired for invalid flow id", async () => {
    const result = await finishPasskeyLogin(
      createAuthLoginContext(scenario.ctx.db),
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
        flowId: AuthLoginFlowId.trust("01974fd5-f261-7a7d-93f5-2f3d0f96f101"),
        response: buildAssertionResponse("passkey-1"),
        ipAddress,
        userAgent: "vitest-agent",
      },
    );

    const error = expectErr(result);
    expect(error.kind).toBe("flow_expired");
  });
});
