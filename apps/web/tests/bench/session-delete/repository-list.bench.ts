import { afterAll, beforeAll, bench, describe } from "vitest";

import type { UserId } from "~/server/shared/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  expectedSessionsPerUser,
  seedSessionDeleteFixtures,
  USER_POOL_SIZE,
} from "./fixtures";

describe("session list repository benchmark", () => {
  const db = createBenchDbFixture("bench-session-delete-repository");
  let userIds: UserId[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedSessionDeleteFixtures(
      ctx,
      "bench-repository-session",
    );
    userIds = fixtures.userIds;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "repository path: list sessions for user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "session-delete repository pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      const rows = await ctx.repos.sessions.listForUser(userId);
      if (rows.length !== expectedSessionsPerUser()) {
        throw new Error(
          `expected ${expectedSessionsPerUser()} sessions, got ${rows.length}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
