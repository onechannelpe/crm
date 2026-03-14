import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPasskeyOnboardingWorkflowService } from "../../src/lib/auth/passkey/workflows";
import { createRepositories } from "../../src/server/shared/registry";
import { isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("passkey onboarding flow", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("passkey-onboarding-flow");
    await ctx.db
      .updateTable("users")
      .set({
        onboarding_completed_at: null,
        phone_e164: null,
        role: "admin",
      })
      .where("id", "=", 5)
      .execute();
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("registers the passkey and completes onboarding in one flow", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: 5,
      type: "registration",
      challenge: "challenge-1",
      expires_at: Date.now() + 60_000,
    });

    const service = createPasskeyOnboardingWorkflowService(ctx.repos, {
      runInTransaction: (operation) =>
        ctx.db
          .transaction()
          .execute((transactionDb) =>
            operation(createRepositories(transactionDb)),
          ),
      createPasskeyService: (repos) => ({
        async getRegistrationOptions() {
          throw new Error("not used in this test");
        },
        async verifyRegistration(userId) {
          await repos.passkeys.create({
            id: "passkey-1",
            user_id: userId,
            public_key: Buffer.from("test-public-key").toString("base64"),
            counter: 0,
            transports: JSON.stringify(["internal"]),
          });
          return { verified: true };
        },
        async getAuthenticationOptions() {
          throw new Error("not used in this test");
        },
        async getAuthenticationOptionsForChallenge() {
          throw new Error("not used in this test");
        },
        async verifyAuthentication() {
          throw new Error("not used in this test");
        },
      }),
    });

    const result = await service.completeOnboarding({
      userId: 5,
      challengeId,
      response: {
        id: "passkey-1",
        rawId: "passkey-1",
        type: "public-key",
        response: {
          clientDataJSON: "a",
          attestationObject: "b",
        },
        clientExtensionResults: {},
      },
      ipAddress: "198.51.100.10",
      phoneE164: "+51999888777",
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey onboarding");
    }

    const user = await ctx.repos.users.findById(5);
    expect(user?.onboarding_completed_at).not.toBeNull();
    expect(user?.phone_e164).toBe("+51999888777");

    const passkeys = await ctx.repos.passkeys.findByUser(5);
    expect(passkeys).toHaveLength(1);

    const challenge = await ctx.repos.webauthnChallenges.findById(challengeId);
    expect(challenge).toBeUndefined();
  });
});
