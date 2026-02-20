import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const SESSION_DELETE_USER_POOL_SIZE = 60;
const SESSION_DELETE_USER_ID_START = 40_000;
const SESSIONS_PER_USER = 800;

describe("session bulk delete performance", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  let userCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("session-delete-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    const now = Date.now();
    const users = Array.from(
      { length: SESSION_DELETE_USER_POOL_SIZE },
      (_, i) => ({
        id: SESSION_DELETE_USER_ID_START + i,
        branch_id: 1,
        team_id: null,
        email: `bench-sessions-${SESSION_DELETE_USER_ID_START + i}@test.local`,
        password_hash: "hash",
        full_name: `Bench Sessions ${SESSION_DELETE_USER_ID_START + i}`,
        phone_e164: `+5199022${String(i).padStart(4, "0")}`,
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive" as const,
        is_active: 1,
        created_at: now,
      }),
    );

    await benchCtx.db.insertInto("users").values(users).execute();
    userIds = users.map((user) => user.id);

    for (const userId of userIds) {
      const sessions = Array.from({ length: SESSIONS_PER_USER }, (_, i) => ({
        id: `bench-session-${userId}-${i}`,
        user_id: userId,
        branch_id: 1,
        role: "executive" as const,
        auth_method: "password" as const,
        strong_auth_at: null,
        ip_address: null,
        user_agent: "bench",
        created_at: now,
        last_activity: now,
        expires_at: now + 60_000,
      }));
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.db.insertInto("user_sessions").values(sessions).execute();
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: delete all sessions for one user",
    async () => {
      const userId = userIds[userCursor];
      userCursor += 1;
      if (userId === undefined) {
        throw new Error("benchmark pool exhausted before iterations completed");
      }

      await ctx!.repos.sessions.deleteAllForUser(userId);
      const remaining = await ctx!.repos.sessions.listForUser(userId);
      if (remaining.length !== 0) {
        throw new Error(
          `expected 0 sessions after delete, got ${remaining.length}`,
        );
      }
    },
    fixedIterations(SESSION_DELETE_USER_POOL_SIZE),
  );
});
