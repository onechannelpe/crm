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

import { WebauthnChallengeId } from "~/domain/ids";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  preparePasskeyEnrollment,
  verifyPasskeyEnrollment,
} from "~/server/auth/factors/passkey/service";
import { startPasskeyEnrollment } from "~/server/auth/flows/start-passkey-enrollment";
import { createAuthSetupContext } from "~/server/auth/infrastructure/setup-context";

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

  it("creates a registration challenge when enrollment starts", async () => {
    const result = await startPasskeyEnrollment(
      createAuthSetupContext(scenario.ctx.db),
      {
        userId: execOne.userId,
        ipAddress,
        occurredAt: new Date(),
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    );

    const value = expectOk(result);
    const challenge = await scenario.ctx.repos.webauthnChallenges.findById(
      WebauthnChallengeId.trust(value.challengeId),
    );

    expect(challenge?.type).toBe("registration");
    expect(challenge?.user_id).toBe(execOne.userId);
  });

  it("rejects enrollment when challenge creation is throttled", async () => {
    const throttle = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });

    for (let attempt = 0; attempt < 9; attempt += 1) {
      await throttle.recordPasskeyChallengeFailure(
        `user:${execOne.userId}`,
        ipAddress,
        new Date(),
      );
    }

    const result = await preparePasskeyEnrollment(
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
      {
        userId: execOne.userId,
        ipAddress,
        occurredAt: new Date(),
      },
    );

    const error = expectErr(result);

    expect(error.code).toBe("invalid_passkey_request");
  });

  it("rejects a challenge owned by another user", async () => {
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

  it("rejects an invalid registration response", async () => {
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

  it("propagates provider errors while creating registration options", async () => {
    await expect(
      preparePasskeyEnrollment(
        scenario.ctx.repos,
        createWebauthnProvider({
          async getRegistrationOptions() {
            throw new Error("boom");
          },
        }),
        {
          userId: execOne.userId,
          ipAddress,
          occurredAt: new Date(),
        },
      ),
    ).rejects.toThrow("boom");
  });

  it("propagates provider errors while verifying registration", async () => {
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
