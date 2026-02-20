import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("session repository performance", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("session-perf");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("bulk deletes sessions within a performance budget", async () => {
    const now = Date.now();
    await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        ctx.repos.sessions.create({
          id: `perf-${i}`,
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

    const started = Date.now();
    await ctx.repos.sessions.deleteAllForUser(1);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
