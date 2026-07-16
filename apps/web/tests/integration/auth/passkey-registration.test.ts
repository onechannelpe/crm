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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  persistPasskeyEnrollmentChallenge,
  preparePasskeyEnrollment,
  verifyPasskeyEnrollment,
} from "~/server/auth/factors/passkey/service";
import { WebauthnChallengeId } from "~/server/shared/ids";

describe("passkey registration", () => {
  const scenario = createAuthScenario("passkey-registration");
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

  it("begin enrollment creates registration challenge", async () => {
    const prepared = await preparePasskeyEnrollment(
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
      { userId: execOne.userId, ipAddress, occurredAt: new Date() },
    );
    const result = await persistPasskeyEnrollmentChallenge(
      scenario.ctx.repos,
      expectOk(prepared),
    );
    const value = expectOk(result);

    const challenge = await scenario.ctx.repos.webauthnChallenges.findById(
      WebauthnChallengeId.trust(value.challengeId),
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

    const result = await preparePasskeyEnrollment(
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
      { userId: execOne.userId, ipAddress, occurredAt: new Date() },
    );

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("rejects challenge ownership mismatch", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r1",
    });

    const result = await verifyPasskeyEnrollment(
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
      {
        userId: backOne.userId,
        challengeId,
        response: buildRegistrationResponse("cred-r1"),
        ipAddress,
        verifiedAt: new Date(),
      },
    );

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("returns invalid request when verification fails", async () => {
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r2",
    });

    const result = await verifyPasskeyEnrollment(
      scenario.ctx.repos,
      invalidRegistrationProvider(),
      {
        userId: execOne.userId,
        challengeId,
        response: buildRegistrationResponse("cred-r2"),
        ipAddress,
        verifiedAt: new Date(),
      },
    );

    const error = expectErr(result);
    expect(error.code).toBe("invalid_passkey_request");
  });

  it("propagates provider errors during option and verification generation", async () => {
    await expect(
      preparePasskeyEnrollment(
        scenario.ctx.repos,
        createWebauthnProvider({
          async getRegistrationOptions() {
            throw new Error("boom");
          },
        }),
        { userId: execOne.userId, ipAddress, occurredAt: new Date() },
      ),
    ).rejects.toThrow("boom");

    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId: execOne.userId,
      challenge: "challenge-r3",
    });

    await expect(
      verifyPasskeyEnrollment(
        scenario.ctx.repos,
        createWebauthnProviderWithRegistration(async () => {
          throw new Error("boom");
        }),
        {
          userId: execOne.userId,
          challengeId,
          response: buildRegistrationResponse("cred-r3"),
          ipAddress,
          verifiedAt: new Date(),
        },
      ),
    ).rejects.toThrow("boom");
  });
});
