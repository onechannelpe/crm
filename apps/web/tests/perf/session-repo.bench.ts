import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("session repository performance", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("session-bench");

    const now = Date.now();
    await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        ctx.repos.sessions.create({
          id: `bench-${i}`,
          user_id: 1,
          branch_id: 1,
          role: "executive",
          auth_method: "password",
          strong_auth_at: null,
          ip_address: null,
          user_agent: null,
          created_at: now,
          last_activity: now,
          expires_at: now + 60_000,
        }),
      ),
    );
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench("bulk deletes sessions for a user", async () => {
    await ctx.repos.sessions.deleteAllForUser(1);
  });
});
