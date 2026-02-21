import { afterAll, beforeAll, bench, describe } from "vitest";

import { createAssignment, isExpired } from "~/server/leads/domain-assignment";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const SALES_CREATE_USER_POOL_SIZE = 96;
const SALES_CREATE_USER_ID_START = 100_000;
const SALES_CREATE_BENCH_NOW = 1_700_000_000_000;

describe("sales create performance", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  let userCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("sales-create-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    const now = SALES_CREATE_BENCH_NOW;
    const users = Array.from(
      { length: SALES_CREATE_USER_POOL_SIZE },
      (_, i) => ({
        id: SALES_CREATE_USER_ID_START + i,
        branch_id: 1,
        team_id: null,
        email: `bench-sales-create-${SALES_CREATE_USER_ID_START + i}@test.local`,
        password_hash: "hash",
        full_name: `Bench Sales Create ${SALES_CREATE_USER_ID_START + i}`,
        phone_e164: `+5199044${String(i).padStart(4, "0")}`,
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

    await benchCtx.repos.leadAssignments.createMany(
      userIds.map((userId) => createAssignment(userId, 1)),
    );
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: create sales draft from assigned lead",
    async () => {
      const userId = userIds[userCursor];
      userCursor += 1;
      if (userId === undefined) {
        throw new Error(
          "sales-create pool exhausted before iterations completed",
        );
      }

      const result = await ctx!.sales.createDraft(1, userId);
      if (!result.ok) {
        throw new Error(`expected draft creation success, got ${result.error}`);
      }
    },
    fixedIterations(SALES_CREATE_USER_POOL_SIZE),
  );

  bench(
    "component path: evaluate lead assignment expiry",
    () => {
      const expired = isExpired(1, 2);
      if (!expired) {
        throw new Error("expected assignment to be expired");
      }
    },
    fixedIterations(25_000),
  );
});
