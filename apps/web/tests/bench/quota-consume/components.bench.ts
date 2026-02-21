import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_DATE } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("quota consume component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-quota-consume-component");
    userIds = await seedQuotaUsers(ctx);

    for (const userId of userIds) {
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await ctx.repos.quotaAllocations.create({
        user_id: userId,
        allocated_by_user_id: 2,
        date: BENCH_DATE,
        quota_amount: 2,
      });
    }
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: load quota allocation by user and date",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume query pool exhausted before iterations completed",
      );

      const allocation = await ctx!.repos.quotaAllocations.findByUserAndDate(
        userId,
        BENCH_DATE,
      );
      if (!allocation) {
        throw new Error("expected quota allocation row");
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
