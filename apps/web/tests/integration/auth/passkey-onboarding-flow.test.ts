import { phone } from "@tests/support/_core/phone";
import { createAuthScenario } from "@tests/support/auth/scenario";
import { createRegistrationChallenge } from "@tests/support/passkey/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { AuthSession } from "~/lib/auth/access/session-types";
import { sessionCache } from "~/lib/auth/session/session-cache";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { createAuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { completeOnboarding } from "~/server/auth/onboarding/complete";
import { saveOnboardingProfile } from "~/server/auth/onboarding/save-profile";
import { isErr } from "~/server/shared/result";

describe("passkey onboarding flow", () => {
  const scenario = createAuthScenario("passkey-onboarding-flow");
  const identity = "superuser" as const;

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
    await scenario.ctx.db
      .updateTable("users")
      .set({ onboarding_completed_at: null, role: "admin" })
      .where("id", "=", scenario.identity(identity).userId)
      .execute();
  });

  it("commits factor, recovery codes, onboarding, and session replacement together", async () => {
    const setup = createAuthSetupContext(scenario.ctx.db);
    const userId = scenario.identity(identity).userId;
    const user = await setup.repos.users.findById(userId);
    if (!user) throw new Error("expected seeded user");

    const currentSession: AuthSession = {
      id: "onboarding-session",
      userId,
      branchId: user.branch_id,
      role: user.role,
      onboardingCompleted: false,
      sessionClass: "pre_auth",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
      impersonatorUserId: null,
    };
    const now = new Date("2026-07-14T20:00:00.000Z");
    await setup.repos.sessions.create({
      id: currentSession.id,
      user_id: user.id,
      branch_id: user.branch_id,
      role: user.role,
      session_class: currentSession.sessionClass,
      primary_auth_method: currentSession.primaryAuthMethod,
      strong_auth_method: null,
      strong_auth_at: null,
      impersonator_user_id: null,
      ip_address: "198.51.100.10",
      user_agent: "integration-test",
      created_at: now,
      last_activity: now,
      expires_at: new Date(now.getTime() + 60_000),
    });
    sessionCache.set(currentSession.id, {
      userId,
      branchId: user.branch_id,
      role: user.role,
      onboardingCompleted: false,
      sessionClass: "pre_auth",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
      impersonatorUserId: null,
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const profile = await saveOnboardingProfile(setup, {
      userId,
      phone: phone(),
      now,
    });
    if (isErr(profile)) throw new Error("expected saved profile");

    const challengeId = await createRegistrationChallenge({
      ctx: scenario.ctx,
      userId,
      challenge: "challenge-1",
    });
    const result = await completeOnboarding(
      {
        actor: currentSession,
        requestId: "request-1",
        traceId: "trace-1",
        ipAddress: "198.51.100.10",
        userAgent: "integration-test",
        publicOrigin: "https://crm.example.test",
        now: () => now,
      },
      setup,
      {
        method: "passkey",
        enrollment: {
          userId,
          challengeId,
          ipAddress: "198.51.100.10",
          credential: {
            id: "passkey-1",
            publicKey: "base64-public-key",
            counter: 0,
            transports: JSON.stringify(["internal"]),
          },
        },
      },
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) throw new Error("expected successful onboarding");
    expect(result.value.recoveryCodes.length).toBeGreaterThan(0);

    const completedUser = await setup.repos.users.findById(userId);
    expect(completedUser?.onboarding_completed_at).toEqual(now);
    expect(await setup.repos.sessions.findById(currentSession.id)).toBeNull();
    expect(sessionCache.get(currentSession.id)).toBeNull();
    expect(
      await setup.repos.sessions.findById(
        hashSessionToken(result.value.sessionToken),
      ),
    ).toMatchObject({
      session_class: "app",
      strong_auth_method: "passkey",
      strong_auth_at: now,
    });
    expect(await setup.repos.passkeys.findByUser(userId)).toEqual([
      expect.objectContaining({ created_at: now }),
    ]);
    expect(
      await setup.repos.webauthnChallenges.findById(challengeId),
    ).toBeUndefined();
    expect(
      await setup.repos.userRecoveryCodes.getActiveSet(userId),
    ).toMatchObject({ total: result.value.recoveryCodes.length });
    expect(
      await scenario.ctx.db
        .selectFrom("events")
        .select("type")
        .where("entity_id", "=", userId)
        .where("type", "=", "onboarding_completed")
        .executeTakeFirst(),
    ).toEqual({ type: "onboarding_completed" });
  });
});
