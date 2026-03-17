import { afterAll, beforeAll, bench, describe } from "vitest";

import { currentMonthlyPeriod } from "~/server/shared/time";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("search capacity grant component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-quota-consume-component");
    userIds = await seedQuotaUsers(ctx);

    for (const userId of userIds) {
      await ctx.repos.searchCapacityGrants.insert({
        user_id: userId,
        actor_user_id: 2,
        amount: 2,
        reason: "bench_seed",
      });
    }
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: load search capacity grants by user and period",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume query pool exhausted before iterations completed",
      );

      const { periodStart, periodEnd } = currentMonthlyPeriod(new Date());
      const grants = await ctx!.repos.searchCapacityGrants.findByUserAndPeriod(
        userId,
        periodStart,
        periodEnd,
      );
      if (grants.length === 0) {
        throw new Error("expected at least one search capacity grant row");
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
