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

describe("session list repository benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-session-delete-repository");
    const fixtures = await seedSessionDeleteFixtures(
      ctx,
      "bench-repository-session",
    );
    userIds = fixtures.userIds;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "repository path: list sessions for user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "session-delete repository pool exhausted before iterations completed",
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
