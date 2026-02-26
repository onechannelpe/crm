import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "../../src/lib/security/action-rate-limit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("action rate limit", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("action-rate-limit");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  it("allows requests up to the per-action limit", async () => {
    const limit = ACTION_RATE_LIMIT_POLICY["leads.request"].limit;
    for (let i = 0; i < limit; i++) {
      await expect(
        checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos),
      ).resolves.toBeUndefined();
    }
  });

  it("blocks the next request after the limit is reached", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    const result = checkActionRateLimit(
      "leads.request",
      1,
      "198.51.100.1",
      ctx.repos,
    );
    await expect(result).rejects.toBeInstanceOf(Response);
  });

  it("returns 429 with Retry-After header on block", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    let blocked: Response | undefined;
    try {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    } catch (err) {
      if (err instanceof Response) blocked = err;
    }

    expect(blocked?.status).toBe(429);
    const retryAfter = Number(blocked?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(
      ACTION_RATE_LIMIT_POLICY["leads.request"].windowMs / 1000,
    );
  });

  it("retry-after decreases as window elapses", async () => {
    const { limit, windowMs } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    const getRetryAfter = async () => {
      try {
        await checkActionRateLimit(
          "leads.request",
          1,
          "198.51.100.1",
          ctx.repos,
        );
      } catch (err) {
        if (err instanceof Response) {
          return Number(err.headers.get("Retry-After"));
        }
      }
      return 0;
    };

    const first = await getRetryAfter();
    vi.setSystemTime(Date.now() + 10_000);
    const second = await getRetryAfter();

    expect(second).toBeLessThan(first);
    expect(first).toBeLessThanOrEqual(windowMs / 1000);
  });

  it("resets the counter after the window expires", async () => {
    const { limit, windowMs } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    vi.setSystemTime(Date.now() + windowMs + 1);

    await expect(
      checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos),
    ).resolves.toBeUndefined();
  });

  it("isolates counters by user", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    // user 2 has a separate counter
    await expect(
      checkActionRateLimit("leads.request", 2, "198.51.100.1", ctx.repos),
    ).resolves.toBeUndefined();
  });

  it("isolates counters by ip", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    // different IP, same user, separate counter
    await expect(
      checkActionRateLimit("leads.request", 1, "198.51.100.2", ctx.repos),
    ).resolves.toBeUndefined();
  });

  it("isolates counters by action name", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    }

    // different action — separate counter
    await expect(
      checkActionRateLimit(
        "sales_records.create_draft",
        1,
        "198.51.100.1",
        ctx.repos,
      ),
    ).resolves.toBeUndefined();
  });

  it("logs a rate_limit_exceeded audit entry on violation", async () => {
    const userId = 1;
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        userId,
        "198.51.100.1",
        ctx.repos,
      );
    }

    try {
      await checkActionRateLimit(
        "leads.request",
        userId,
        "198.51.100.1",
        ctx.repos,
      );
    } catch {
      // expected 429
    }

    const logs = await ctx.repos.auditLogs.findByUser(userId);
    const entry = logs.find((l) => l.action === "rate_limit_exceeded");
    expect(entry).toBeDefined();
    expect(entry?.entity_type).toBe("user");
    expect(entry?.entity_id).toBe(userId);
    expect(entry?.changes).toContain('"actionName":"leads.request"');
    expect(entry?.changes).toContain('"retryAfterMs"');
  });

  it("enforces the longer hourly window for team invites", async () => {
    const { limit, windowMs } = ACTION_RATE_LIMIT_POLICY["team.invite.create"];
    expect(windowMs).toBe(60 * 60_000); // 1 hour

    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "team.invite.create",
        1,
        "198.51.100.1",
        ctx.repos,
      );
    }

    // still blocked after 30 minutes
    vi.setSystemTime(Date.now() + 30 * 60_000);
    await expect(
      checkActionRateLimit("team.invite.create", 1, "198.51.100.1", ctx.repos),
    ).rejects.toBeInstanceOf(Response);
  });

  it("cleans up stale counters", async () => {
    await checkActionRateLimit("leads.request", 1, "198.51.100.1", ctx.repos);
    const deleted = await ctx.repos.actionRateLimits.deleteUpdatedBefore(
      Date.now() + 1,
    );
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
