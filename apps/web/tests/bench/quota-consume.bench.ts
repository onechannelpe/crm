import { afterAll, beforeAll, bench, describe } from "vitest";

import { canConsume } from "~/server/quota/domain";
import { createQuotaService } from "~/server/quota/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const QUOTA_BENCH_USER_POOL_SIZE = 80;
const QUOTA_BENCH_USER_ID_START = 30_000;

describe("quota consume performance", () => {
  let ctx: TestDbContext | null = null;
  let quotaUsers: number[] = [];
  let userCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("quota-consume-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    const now = Date.now();
    const users = Array.from({ length: QUOTA_BENCH_USER_POOL_SIZE }, (_, i) => {
      const id = QUOTA_BENCH_USER_ID_START + i;
      return {
        id,
        branch_id: 1,
        team_id: null,
        email: `bench-quota-${id}@test.local`,
        password_hash: "hash",
        full_name: `Bench Quota ${id}`,
        phone_e164: `+5199011${String(i).padStart(4, "0")}`,
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive" as const,
        is_active: 1,
        created_at: now,
      };
    });
    await benchCtx.db.insertInto("users").values(users).execute();
    quotaUsers = users.map((user) => user.id);

    const quota = createQuotaService(benchCtx.repos);
    const day = new Date().toISOString().slice(0, 10);
    for (const userId of quotaUsers) {
      // oxlint-disable-next-line eslint(no-await-in-loop)
      const result = await quota.allocate(2, userId, 2, day);
      if (!result.ok) {
        throw new Error(
          `expected quota allocation success, got ${result.error}`,
        );
      }
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: consume quota for one allocated user",
    async () => {
      const userId = quotaUsers[userCursor];
      userCursor += 1;
      if (userId === undefined) {
        throw new Error("benchmark pool exhausted before iterations completed");
      }

      const result = await createQuotaService(ctx!.repos).consume(userId, 1);
      if (!result.ok) {
        throw new Error(`expected quota consume success, got ${result.error}`);
      }
    },
    fixedIterations(QUOTA_BENCH_USER_POOL_SIZE),
  );

  bench(
    "component path: evaluate canConsume rule",
    () => {
      const allowed = canConsume(
        {
          id: 1,
          user_id: 1,
          allocated_by_user_id: 2,
          date: "2026-02-20",
          quota_amount: 10,
          used_amount: 4,
          created_at: 1,
        },
        2,
      );
      if (!allowed) {
        throw new Error("expected canConsume to allow remaining quota");
      }
    },
    fixedIterations(25_000),
  );
});
