import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  expectedSessionsPerUser,
  seedSessionDeleteFixtures,
  USER_POOL_SIZE,
} from "./fixtures";

describe("session delete component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-session-delete-component");
    const fixtures = await seedSessionDeleteFixtures(
      ctx,
      "bench-component-session",
    );
    userIds = fixtures.userIds;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: list sessions for user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "session-delete component pool exhausted before iterations completed",
      );

      const rows = await ctx!.repos.sessions.listForUser(userId);
      if (rows.length !== expectedSessionsPerUser()) {
        throw new Error(
          `expected ${expectedSessionsPerUser()} sessions, got ${rows.length}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
