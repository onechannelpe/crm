import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedSalesCreateUsers, USER_POOL_SIZE } from "./fixtures";

describe("sales create action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-create-action");
    userIds = await seedSalesCreateUsers(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: create sales draft from assigned lead",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "sales-create pool exhausted before iterations completed",
      );

      const result = await ctx!.sales.createDraft(1, userId);
      if (!result.ok) {
        throw new Error(`expected draft creation success, got ${result.error}`);
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
