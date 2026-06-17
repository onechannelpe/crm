import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/lib/security/action-rate-limit";

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
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        "198.51.100.1",
      );
    }

    await expect(
      checkActionRateLimit("leads.request", userId, ctx.repos, "198.51.100.1"),
    ).rejects.toBeDefined();

    const now = Date.now();
    const logs = await ctx.repos.events.listRecent({
      fromInclusive: now - 1000,
      toInclusive: now + 1000,
      limit: 10,
      actorUserId: userId,
    });
    const entry = logs.find((log) => log.type === "rate_limit_exceeded");
    expect(entry).toBeDefined();
    expect(entry?.entity_type).toBe("user");
    expect(entry?.entity_id).toBe(String(userId));
    expect(entry?.payload_json).toContain('"actionName":"leads.request"');
    expect(entry?.payload_json).toContain('"scope":"user"');
    expect(entry?.payload_json).toContain('"retryAfterMs"');
  });

  it("cleans up stale counters", async () => {
    await checkActionRateLimit("leads.request", 1, ctx.repos, "198.51.100.1");
    const deleted = await ctx.repos.actionRateLimits.deleteUpdatedBefore(
      Date.now() + 1,
    );
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
