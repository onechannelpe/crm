import { afterAll, beforeAll, bench, describe } from "vitest";

import { requestContactAssignmentRefill } from "~/server/contact-assignments/application/request-refill";
import type { EngineClient } from "~/server/shared/engine/client";
import { createRepositories } from "~/server/shared/registry";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedLeadsRequestFixtures, USER_POOL_SIZE } from "./fixtures";

describe("lead refill action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let engine: EngineClient | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-leads-request-action");
    const fixtures = await seedLeadsRequestFixtures(ctx);
    userIds = fixtures.userIds;
    engine = fixtures.engineClient;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    engine = null;
  });

  bench(
    "action path: request lead refill for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "leads-request pool exhausted before iterations completed",
      );

      const result = await requestContactAssignmentRefill(
        {
          actorUserId: userId,
          branchId: 1,
        },
        {
          repos: ctx!.repos,
          runInTransaction: (operation) =>
            ctx!.db
              .transaction()
              .execute((txDb) => operation(createRepositories(txDb))),
          engine: engine!,
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
