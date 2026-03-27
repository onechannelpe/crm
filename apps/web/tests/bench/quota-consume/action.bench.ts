import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  commitSearchUsage,
  reserveSearchUsage,
} from "~/server/capacity-usage/search-usage";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("search capacity consume action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-quota-consume-action");
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
    "action path: reserve and commit search usage for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume pool exhausted before iterations completed",
      );

      const reserveResult = await reserveSearchUsage(
        {
          actorUserId: userId,
          amount: 1,
          remainingCapacity: 2,
          reason: "direct_search",
        },
        ctx!.repos,
      );
      if (!reserveResult.ok) {
        throw new Error(
          `expected reserve success, got ${reserveResult.error.code}`,
        );
      }

      const commitResult = await commitSearchUsage(
        { reservationId: reserveResult.value, amount: 1 },
        ctx!.repos,
      );
      if (!commitResult.ok) {
        throw new Error(
          `expected commit success, got ${commitResult.error.code}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
