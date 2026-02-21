import { afterAll, beforeAll, bench, describe } from "vitest";

import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const TEAM_INVITE_CREATE_POOL_SIZE = 80;
const TEAM_INVITE_ACCEPT_POOL_SIZE = 80;
const TEAM_INVITE_ACCEPT_USER_ID_START = 110_000;
const BENCH_NOW = 10_000_000;

describe("team invite performance", () => {
  let ctx: TestDbContext | null = null;
  let provisioning: ReturnType<typeof createUserProvisioningService> | null =
    null;
  let createEmails: string[] = [];
  let acceptFixtures: Array<{ token: string; fullName: string }> = [];
  let createCursor = 0;
  let acceptCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("team-invite-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    createEmails = Array.from(
      { length: TEAM_INVITE_CREATE_POOL_SIZE },
      (_, i) => `bench-team-create-${i}@test.local`,
    );
    provisioning = createUserProvisioningService(benchCtx.repos, {
      now: () => BENCH_NOW,
    });

    const acceptUsers = Array.from(
      { length: TEAM_INVITE_ACCEPT_POOL_SIZE },
      (_, i) => ({
        id: TEAM_INVITE_ACCEPT_USER_ID_START + i,
        branch_id: 2,
        team_id: null,
        email: `bench-team-accept-${i}@test.local`,
        password_hash: "bench-pending-hash",
        full_name: `Bench Accept ${i}`,
        phone_e164: null,
        phone_verified_at: null,
        profile_confirmed_at: null,
        onboarding_completed_at: null,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive" as const,
        is_active: 0,
        created_at: BENCH_NOW,
      }),
    );
    await benchCtx.db.insertInto("users").values(acceptUsers).execute();

    const pendingInvites = acceptUsers.map((user, i) => {
      const token = `bench-team-token-${String(i).padStart(3, "0")}`;
      acceptFixtures.push({
        token,
        fullName: `Bench Accepted ${i}`,
      });
      return {
        user_id: user.id,
        branch_id: 2,
        email: user.email,
        role: "executive" as const,
        token_hash: hashInviteToken(token),
        status: "pending" as const,
        expires_at: BENCH_NOW + 7 * 24 * 60 * 60 * 1000,
        created_by_user_id: 5,
        accepted_at: null,
        revoked_at: null,
        created_at: BENCH_NOW,
        sent_at: null,
      };
    });
    await benchCtx.db
      .insertInto("user_invites")
      .values(pendingInvites)
      .execute();
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
    provisioning = null;
  });

  bench(
    "action path: create team invite",
    async () => {
      const email = createEmails[createCursor];
      createCursor += 1;
      if (!email) {
        throw new Error(
          "create-invite pool exhausted before iterations completed",
        );
      }

      const result = await provisioning!.createInvite({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        fullName: `Bench Create ${createCursor}`,
        email,
        role: "executive",
        teamId: null,
      });

      if (!result.ok) {
        throw new Error(`expected invite create success, got ${result.error}`);
      }
    },
    fixedIterations(TEAM_INVITE_CREATE_POOL_SIZE),
  );

  bench(
    "action path: accept team invite",
    async () => {
      const fixture = acceptFixtures[acceptCursor];
      acceptCursor += 1;
      if (!fixture) {
        throw new Error(
          "accept-invite pool exhausted before iterations completed",
        );
      }

      const result = await provisioning!.acceptInvite({
        token: fixture.token,
        fullName: fixture.fullName,
        passwordHash: "bench-password-hash",
      });
      if (!result.ok) {
        throw new Error(`expected invite accept success, got ${result.error}`);
      }
    },
    fixedIterations(TEAM_INVITE_ACCEPT_POOL_SIZE),
  );
});
