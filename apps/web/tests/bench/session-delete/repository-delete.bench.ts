import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedSessionDeleteFixtures, USER_POOL_SIZE } from "./fixtures";

describe("session delete repository benchmark", () => {
  let ctx!: TestDbContext;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-session-delete-repository-delete");
    const fixtures = await seedSessionDeleteFixtures(
      ctx,
      "bench-repository-delete-session",
    );
    userIds = fixtures.userIds;
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench(
    "repository path: delete all sessions for user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "session-delete delete repository pool exhausted before iterations completed",
      );

      await ctx.repos.sessions.deleteAllForUser(userId);
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
