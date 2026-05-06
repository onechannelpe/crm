import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACTION_RATE_LIMIT_POLICY, checkActionRateLimit } from "~/lib/security/action-rate-limit";


describe("rate limit audit", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("rate-limit-audit");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  it("logs a rate_limit_exceeded audit entry on violation", async () => {
    const userId = 1;
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let index = 0; index < limit; index += 1) {
      await checkActionRateLimit("leads.request", userId, ctx.repos, "198.51.100.1");
    }

    try {
      await checkActionRateLimit("leads.request", userId, ctx.repos, "198.51.100.1");
    } catch {
      // expected block
    }

    const logs = await ctx.repos.auditLogs.findByUser(userId);
    const entry = logs.find((log) => log.action === "rate_limit_exceeded");
    expect(entry).toBeDefined();
    expect(entry?.entity_type).toBe("user");
    expect(entry?.entity_id).toBe(userId);
    expect(entry?.changes).toContain('"actionName":"leads.request"');
    expect(entry?.changes).toContain('"scope":"user"');
    expect(entry?.changes).toContain('"retryAfterMs"');
  });

  it("cleans up stale counters", async () => {
    await checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.1");
    const deleted = await ctx.repos.actionRateLimits.deleteUpdatedBefore(Date.now() + 1);
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
