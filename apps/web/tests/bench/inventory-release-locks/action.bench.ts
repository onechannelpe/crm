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

describe("inventory expired lock cleanup action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let nowValues: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-inventory-release-locks-action");
    nowValues = await seedInventoryReleaseLocks(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: release one expired lock group",
    async () => {
      const now = takeFromPool(
        nowValues,
        cursor,
        "inventory-release-locks pool exhausted before iterations completed",
      );

      const released = await ctx!.repos.inventory.releaseExpiredLocks(now);
      if (released !== LOCKS_PER_GROUP) {
        throw new Error(
          `expected ${LOCKS_PER_GROUP} released locks, got ${released}`,
        );
      }
    },
    fixedIterations(LOCK_GROUP_COUNT),
  );
});
