import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { afterAll, beforeAll, bench, describe } from "vitest";

import { asUserId, type UserId } from "~/server/shared/ids";
import { currentMonthlyPeriod } from "~/server/shared/time";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("search capacity grant repository benchmark", () => {
  const db = createBenchDbFixture("bench-quota-consume-repository");
  let userIds: UserId[] = [];
  const cursor = { value: 0 };
  const actorUserId = asUserId(TEST_FIXTURES.users.backOne.id);

  beforeAll(async () => {
    const ctx = await db.setup();
    userIds = await seedQuotaUsers(ctx);

    for (const userId of userIds) {
      await ctx.repos.searchCapacityGrants.insert({
        user_id: userId,
        actor_user_id: actorUserId,
        amount: 2,
        reason: "bench_seed",
      });
    }
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "repository path: load search capacity grants by user and period",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume repository pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      const { periodStart, periodEnd } = currentMonthlyPeriod(new Date());
      const grants = await ctx.repos.searchCapacityGrants.findByUserAndPeriod(
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
