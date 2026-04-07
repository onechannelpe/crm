import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  SALES_CREATE_BASE_DRAFT_INPUT,
  seedSalesCreateUsers,
  USER_POOL_SIZE,
} from "./fixtures";

describe("sales create command benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-create-command");
    userIds = await seedSalesCreateUsers(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "command path: create sales record draft",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "sales-create pool exhausted before iterations completed",
      );

      const result = await ctx!.salesRecords.createDraft({
        ...SALES_CREATE_BASE_DRAFT_INPUT,
        executiveUserId: userId,
        branchId: 1,
      });
      if (!result.ok) {
        throw new Error(
          `expected draft creation success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
