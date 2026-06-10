import { expectErr } from "@tests/support/_core/assertions";
import { createAuthScenario } from "@tests/support/auth/scenario";
import { getSeededIdentity } from "@tests/support/identities/api";
import {
  buildAssertionResponse,
  createAuthFlow,
} from "@tests/support/passkey/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/server/auth/factors/passkey/service";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("passkey error mapping", () => {
  const scenario = createAuthScenario("passkey-error-mapping");
  const ipAddress = "198.51.100.66";
  const execOne = getSeededIdentity("execOne");

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("returns invalid credentials for empty identifier", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
    ).beginLogin({ identifier: "   ", ipAddress, mode: "identified" });

    const error = expectErr(result);
    expect(error.kind).toBe("invalid_credentials");
  });

  it("throws when login flow persistence fails", async () => {
    await scenario.ctx.repos.passkeys.create({
      id: "pk-login-failure",
      user_id: execOne.userId,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    await expect(
      createPasskeyLoginStartAuthService({
        ...scenario.ctx.repos,
        loginFlows: {
          ...scenario.ctx.repos.loginFlows,
          async create() {
            throw new Error("boom");
          },
        },
      }).beginLogin({ identifier: "exec.one", ipAddress, mode: "identified" }),
    ).rejects.toThrow("boom");
  });

  it("maps invalid assertion to invalid credentials and records telemetry", async () => {
    const { challengeId, flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-1",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
    ).finishLogin({
      flowId,
      response: buildAssertionResponse("missing-passkey"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    const error = expectErr(result);
    expect(error.kind).toBe("invalid_credentials");

    const consumed =
      await scenario.ctx.repos.webauthnChallenges.findById(challengeId);
    expect(consumed).toBeUndefined();

    const retries =
      await scenario.ctx.repos.authEvents.findRecentLoginRetriesByUser(
        execOne.userId,
        5,
      );
    expect(retries[0]?.method).toBe("passkey");
    expect(retries[0]?.stage).toBe("verify");
    expect(retries[0]?.outcome).toBe("failure");
    expect(retries[0]?.reason).toBe("assertion_invalid");
  });

  it("throws when session issuance fails", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-workflow-2",
    });

    await expect(
      createPasskeyLoginFinishAuthService(scenario.ctx.repos, {
        createWebauthnProvider: () => ({
          async getRegistrationOptions() {
            throw new Error("not used");
          },
          async verifyRegistration() {
            throw new Error("not used");
          },
          async getAuthenticationOptions() {
            throw new Error("not used");
          },
          async getAuthenticationOptionsForChallenge() {
            throw new Error("not used");
          },
          async verifyAuthentication() {
            return { verified: true, userId: execOne.userId };
          },
        }),
        async establishSession() {
          throw new Error("boom");
        },
      }).finishLogin({
        flowId,
        response: buildAssertionResponse("passkey-1"),
        ipAddress,
        userAgent: "vitest-agent",
        sendPrivilegedLoginAlert,
      }),
    ).rejects.toThrow("boom");
  });
});
