import { createAuthScenario } from "@tests/support/auth/scenario";
import {
  buildRegistrationResponse,
  createRegistrationChallenge,
  createWebauthnProviderWithRegistration,
} from "@tests/support/passkey/api";
import { createTestRepositories } from "@tests/support/runtime/repos";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPasskeyEnrollmentAuthService } from "~/server/auth/passkey/service";
import { isErr } from "~/server/shared/result";
import { completeAccountOnboardingWithRepos } from "~/server/users/service-account-onboarding";

describe("passkey onboarding flow", () => {
  const scenario = createAuthScenario("passkey-onboarding-flow");
  const identity = "superuser" as const;

  beforeEach(async () => {
    await scenario.setup();
    await scenario.ctx.db
      .updateTable("users")
      .set({
        onboarding_completed_at: null,
        phone_e164: null,
        role: "admin",
      })
      .where("id", "=", scenario.identity(identity).userId)
      .execute();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("registers the passkey and completes onboarding in one flow", async () => {
    const userId = scenario.identity(identity).userId;
    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId,
      challenge: "challenge-1",
    });

    const result = await scenario.ctx.db
      .transaction()
      .execute(async (transactionDb) => {
        const transactionRepos = createTestRepositories(transactionDb);
        const passkeyResult = await createPasskeyEnrollmentAuthService(
          transactionRepos,
          {
            createWebauthnProvider: (repos) =>
              createWebauthnProviderWithRegistration(async (enrolledUserId) => {
                await repos.passkeys.create({
                  id: "passkey-1",
                  user_id: enrolledUserId,
                  public_key: Buffer.from("test-public-key").toString("base64"),
                  counter: 0,
                  transports: JSON.stringify(["internal"]),
                });
                return { verified: true };
              }),
          },
        ).finishEnrollment({
          userId,
          challengeId,
          response: buildRegistrationResponse("passkey-1"),
          ipAddress: "198.51.100.10",
        });
        if (isErr(passkeyResult)) {
          throw new Error(
            `Passkey enrollment failed: ${passkeyResult.error.message}`,
          );
        }

        return completeAccountOnboardingWithRepos(transactionRepos, {
          userId,
          phoneE164: "+51999888777",
        });
      });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey onboarding");
    }

    const user = await scenario.ctx.repos.users.findById(userId);
    expect(user?.onboarding_completed_at).not.toBeNull();
    expect(user?.phone_e164).toBe("+51999888777");

    const passkeys = await scenario.ctx.repos.passkeys.findByUser(userId);
    expect(passkeys).toHaveLength(1);

    const challenge =
      await scenario.ctx.repos.webauthnChallenges.findById(challengeId);
    expect(challenge).toBeUndefined();
  });
});
