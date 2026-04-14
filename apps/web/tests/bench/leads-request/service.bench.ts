import { afterAll, beforeAll, bench, describe } from "vitest";

import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import type { EngineClient } from "~/server/shared/engine/client";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { createTestRepositories } from "../../support/test-repositories";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedLeadsRequestFixtures, USER_POOL_SIZE } from "./fixtures";

describe("lead refill service benchmark", () => {
  let ctx!: TestDbContext;
  let engine!: EngineClient;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-leads-request-service");
    const fixtures = await seedLeadsRequestFixtures(ctx);
    userIds = fixtures.userIds;
    engine = fixtures.engineClient;
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench(
    "service path: request lead refill for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "leads-request pool exhausted before iterations completed",
      );

      const result = await assignContacts(
        {
          actorUserId: userId,
          branchId: 1,
        },
        {
          repos: {
            ...ctx.repos,
            users: createCapacityUsersRepo(ctx.db),
          },
          runInTransaction: (operation) =>
            ctx.db
              .transaction()
              .execute((txDb) => operation(createTestRepositories(txDb))),
          engine,
        },
      );

      if (!result.ok) {
        throw new Error(
          `expected lead refill success, got ${result.error.code}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
