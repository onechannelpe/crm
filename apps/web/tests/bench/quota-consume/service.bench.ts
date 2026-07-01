import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  commitSearchUsage,
  reserveSearchUsage,
} from "~/server/capacity-usage/search-usage";
import { asUserId, type UserId } from "~/server/shared/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("search capacity consume service benchmark", () => {
  const db = createBenchDbFixture("bench-quota-consume-service");
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
    "service path: reserve and commit search usage for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      const reserveResult = await reserveSearchUsage(
        {
          actorUserId: userId,
          amount: 1,
          remainingCapacity: 2,
          reason: "direct_search",
        },
        ctx.repos,
      );
      if (!reserveResult.ok) {
        throw new Error(
          `expected reserve success, got ${reserveResult.error.code}`,
        );
      }

      const commitResult = await commitSearchUsage(
        { reservationId: reserveResult.value, amount: 1 },
        ctx.repos,
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
