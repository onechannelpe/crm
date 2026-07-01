import { expectErr, expectOk } from "@tests/support/_core/assertions";
import { createAuthScenario } from "@tests/support/auth/scenario";
import { getSeededIdentity } from "@tests/support/identities/api";
import {
  buildRegistrationResponse,
  createRegistrationChallenge,
  createTestPasskeyProvider,
  createWebauthnProvider,
  createWebauthnProviderWithRegistration,
  invalidRegistrationProvider,
} from "@tests/support/passkey/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { createPasskeyEnrollmentAuthService } from "~/server/auth/factors/passkey/service";
import { asWebauthnChallengeId } from "~/server/shared/ids";

describe("passkey registration", () => {
  const scenario = createAuthScenario("passkey-registration");
  const ipAddress = "198.51.100.66";
  const execOne = getSeededIdentity("execOne");
  const backOne = getSeededIdentity("backOne");

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("begin enrollment creates registration challenge", async () => {
    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).beginEnrollment({ userId: execOne.userId, ipAddress });
    const value = expectOk(result);

    const challenge = await scenario.ctx.repos.webauthnChallenges.findById(
      asWebauthnChallengeId(value.challengeId),
    );
    expect(challenge?.type).toBe("registration");
    expect(challenge?.user_id).toBe(execOne.userId);
  });

  it("returns invalid request when enrollment start is throttled", async () => {
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
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).beginEnrollment({ userId: execOne.userId, ipAddress });

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("rejects challenge ownership mismatch", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r1",
    });

    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).finishEnrollment({
      userId: backOne.userId,
      challengeId,
      response: buildRegistrationResponse("cred-r1"),
      ipAddress,
    });

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("returns invalid request when verification fails", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r2",
    });

    const result = await createPasskeyEnrollmentAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: invalidRegistrationProvider(),
      },
    ).finishEnrollment({
      userId: execOne.userId,
      challengeId,
      response: buildRegistrationResponse("cred-r2"),
      ipAddress,
    });

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("propagates provider errors during option and verification generation", async () => {
    await expect(
      createPasskeyEnrollmentAuthService(scenario.ctx.repos, {
        webauthnProvider: createWebauthnProvider({
          async getRegistrationOptions() {
            throw new Error("boom");
          },
        }),
      }).beginEnrollment({ userId: execOne.userId, ipAddress }),
    ).rejects.toThrow("boom");

    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r3",
    });

    await expect(
      createPasskeyEnrollmentAuthService(scenario.ctx.repos, {
        webauthnProvider: createWebauthnProviderWithRegistration(async () => {
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
});
