import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  LOCK_GROUP_COUNT,
  LOCKS_PER_GROUP,
  seedInventoryReleaseLocks,
} from "./fixtures";

describe("inventory expired lock cleanup component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let nowValues: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-inventory-release-locks-component");
    nowValues = await seedInventoryReleaseLocks(ctx, 1_000_000);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: load expired lock candidates",
    async () => {
      const now = takeFromPool(
        nowValues,
        cursor,
        "inventory-release-locks query pool exhausted before iterations completed",
      );

      const rows = await ctx!.repos.inventory.findExpiredLocks(now);
      if (rows.length < LOCKS_PER_GROUP) {
        throw new Error(
          `expected at least ${LOCKS_PER_GROUP} expired lock rows, got ${rows.length}`,
        );
      }
    },
    fixedIterations(LOCK_GROUP_COUNT),
  );
});
