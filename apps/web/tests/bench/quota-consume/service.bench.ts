import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { afterAll, beforeAll, bench, describe } from "vitest";

import { executeWithUsageReservation } from "~/server/capacity/application/usage/ledger";
import { asUserId, type UserId } from "~/server/shared/ids";
import { Ok } from "~/server/shared/result";

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

      const result = await executeWithUsageReservation(
        {
          kind: "search",
          actorUserId: userId,
          requested: 1,
          remainingCapacity: 2,
          reserveReason: "direct_search",
          failureReason: "external_failure",
        },
        {
          reservations: ctx.repos.searchUsageReservations,
          commits: ctx.repos.searchUsageCommits,
        },
        async () => Ok({ value: undefined, consumed: 1 }),
      );
      if (!result.ok) {
        throw new Error(
          `expected reserve+commit success, got ${result.error.code}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
