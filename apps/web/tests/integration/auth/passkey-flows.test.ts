import { createAuthScenario } from "@tests/support/auth/scenario";
import { getSeededIdentity } from "@tests/support/identities/api";
import {
  buildAssertionResponse,
  buildRegistrationResponse,
  createAuthFlow,
  createRegistrationChallenge,
  createWebauthnProviderWithAuth,
  createWebauthnProviderWithRegistration,
  createWebauthnProvider,
  invalidRegistrationProvider,
} from "@tests/support/passkey/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  createPasskeyEnrollmentAuthService,
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/server/auth/passkey/service";
import { isErr } from "~/server/shared/result";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("passkey flows", () => {
  const scenario = createAuthScenario("passkey-flows");
  const ipAddress = "198.51.100.66";
  const execOne = getSeededIdentity("execOne");
  const backOne = getSeededIdentity("backOne");

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("begin passkey login creates authentication challenge for active user", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
    ).beginLogin({
      identifier: "exec.one",
      ipAddress,
      mode: "identified",
    });
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey challenge");
    }

    expect(result.value.mode).toBe("identified");
    const flow = await scenario.ctx.repos.loginFlows.findById(result.value.id);
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(challenge?.type).toBe("authentication");
    expect(challenge?.user_id).toBe(execOne.userId);
    expect(challenge?.challenge).toBe(result.value.requestOptions.challenge);
  });

  it("begin discoverable passkey login creates an unscoped authentication challenge", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
    ).beginLogin({
      ipAddress,
      mode: "discoverable",
    });
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful discoverable passkey challenge");
    }

    expect(result.value.mode).toBe("discoverable");
    expect(result.value.requestOptions.userVerification).toBe("required");

    const flow = await scenario.ctx.repos.loginFlows.findById(result.value.id);
    const challenge = flow?.challenge_id
      ? await scenario.ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(flow?.user_id).toBeNull();
    expect(challenge?.user_id).toBeNull();
    expect(challenge?.challenge).toBe(result.value.requestOptions.challenge);
  });

  it("finish passkey login consumes challenge and records failure on invalid assertion", async () => {
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
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey credentials");
    }
    expect(result.error.kind).toBe("invalid_credentials");

    const consumed =
      await scenario.ctx.repos.webauthnChallenges.findById(challengeId);
    expect(consumed).toBeUndefined();

    const key = hashAuthKey(`account:passkey_verify:user:${execOne.userId}`);
    const counter = await scenario.ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);

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

  it("begin passkey registration creates registration challenge", async () => {
    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
    ).beginEnrollment({
      userId: execOne.userId,
      ipAddress,
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey registration challenge");
    }

    const challenge = await scenario.ctx.repos.webauthnChallenges.findById(
      result.value.challengeId,
    );
    expect(challenge?.type).toBe("registration");
    expect(challenge?.user_id).toBe(execOne.userId);
    expect(challenge?.challenge).toBe(result.value.options.challenge);
  });

  it("returns invalid_request when passkey enrollment start is throttled", async () => {
    const throttleSvc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    for (let attempt = 0; attempt < 9; attempt += 1) {
      await throttleSvc.recordPasskeyChallengeFailure(
        `user:${execOne.userId}`,
        ipAddress,
      );
    }

    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
    ).beginEnrollment({
      userId: execOne.userId,
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected throttled passkey enrollment");
    }
    expect(result.error.code).toBe("invalid_request");
  });

  it("propagates error when passkey enrollment options fail", async () => {
    await expect(
      createPasskeyEnrollmentAuthService(scenario.ctx.repos, {
        createWebauthnProvider: () =>
          createWebauthnProvider({
            async getRegistrationOptions() {
              throw new Error("boom");
            },
          }),
      }).beginEnrollment({
        userId: execOne.userId,
        ipAddress,
      }),
    ).rejects.toThrow("boom");
  });

  it("finish passkey registration rejects challenge ownership mismatch", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r1",
    });

    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
    ).finishEnrollment({
      userId: backOne.userId,
      challengeId,
      response: buildRegistrationResponse("cred-r1"),
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey registration result");
    }
    expect(result.error.code).toBe("invalid_request");

    const key = hashAuthKey(`account:passkey_verify:user:${backOne.userId}`);
    const counter = await scenario.ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);
  });

  it("returns invalid_request when passkey enrollment verification fails", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r2",
    });

    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
      {
        createWebauthnProvider: invalidRegistrationProvider,
      },
    ).finishEnrollment({
      userId: execOne.userId,
      challengeId,
      response: buildRegistrationResponse("cred-r2"),
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey verification result");
    }
    expect(result.error.code).toBe("invalid_request");
  });

  it("propagates error when passkey enrollment verification throws a non-request error", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r3",
    });

    await expect(
      createPasskeyEnrollmentAuthService(scenario.ctx.repos, {
        createWebauthnProvider: () =>
          createWebauthnProviderWithRegistration(async () => {
            throw new Error("boom");
          }),
      }).finishEnrollment({
        userId: execOne.userId,
        challengeId,
        response: buildRegistrationResponse("cred-r3"),
        ipAddress,
      }),
    ).rejects.toThrow("boom");
  });

  it("finish passkey login issues a session through the workflow service", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-workflow-1",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      {
        createWebauthnProvider: () =>
          createWebauthnProviderWithAuth(async () => ({
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

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey login result");
    }

    const persisted = await scenario.ctx.repos.loginFlows.findById(flowId);
    expect(persisted).toBeUndefined();
    expect(result.value.token).toBeTruthy();
    expect(result.value.role).toBe("executive");
  });

  it("returns invalid_credentials for an empty passkey login identifier", async () => {
    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
    ).beginLogin({
      identifier: "   ",
      ipAddress,
      mode: "identified",
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey identifier");
    }
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("returns unexpected when passkey login flow persistence fails", async () => {
    await scenario.ctx.repos.passkeys.create({
      id: "pk-login-failure",
      user_id: execOne.userId,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const result = await createPasskeyLoginStartAuthService({
      ...scenario.ctx.repos,
      loginFlows: {
        ...scenario.ctx.repos.loginFlows,
        async create() {
          throw new Error("boom");
        },
      },
    }).beginLogin({
      identifier: "exec.one",
      ipAddress,
      mode: "identified",
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected passkey login start failure");
    }
    expect(result.error.kind).toBe("unexpected");
  });

  it("returns flow_expired for an invalid passkey login flow id", async () => {
    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
    ).finishLogin({
      flowId: 0,
      response: buildAssertionResponse("passkey-1"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected expired passkey flow");
    }
    expect(result.error.kind).toBe("flow_expired");
  });

  it("returns invalid_credentials when an identified passkey flow verifies a different user", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-mismatch-1",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      {
        createWebauthnProvider: () =>
          createWebauthnProviderWithAuth(async () => ({
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

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected rejected mismatched passkey assertion");
    }
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("returns unexpected when passkey session issuance fails", async () => {
    const { flowId } = await createAuthFlow({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-workflow-2",
    });

    const result = await createPasskeyLoginFinishAuthService(
      scenario.ctx.repos,
      {
        createWebauthnProvider: () =>
          createWebauthnProviderWithAuth(async () => ({
            verified: true,
            userId: execOne.userId,
          })),
        async issueLoginSession() {
          throw new Error("boom");
        },
      },
    ).finishLogin({
      flowId,
      response: buildAssertionResponse("passkey-1"),
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected passkey login completion failure");
    }
    expect(result.error.kind).toBe("unexpected");
  });
});
