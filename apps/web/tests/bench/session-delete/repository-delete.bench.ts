import { afterAll, beforeAll, bench, describe } from "vitest";

import type { UserId } from "~/server/shared/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedSessionDeleteFixtures, USER_POOL_SIZE } from "./fixtures";

describe("session delete repository benchmark", () => {
  const db = createBenchDbFixture("bench-session-delete-repository-delete");
  let userIds: UserId[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedSessionDeleteFixtures(
      ctx,
      "bench-repository-delete-session",
    );
    userIds = fixtures.userIds;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "repository path: delete all sessions for user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "session-delete delete repository pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      await ctx.repos.sessions.deleteAllForUser(userId);
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
