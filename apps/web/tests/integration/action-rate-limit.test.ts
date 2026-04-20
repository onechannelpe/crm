import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../src/lib/app-errors";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "../../src/lib/security/action-rate-limit";
import { asUserId, type UserId } from "../../src/server/shared/ids";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("action rate limit", () => {
  let ctx: TestDbContext;
  const USER_ID_1 = asUserId("00000000-0000-0000-0000-000000000001");
  const USER_ID_2 = asUserId("00000000-0000-0000-0000-000000000002");
  const USER_IDS = Array.from({ length: 5 }, (_, i) =>
    asUserId(`00000000-0000-0000-0000-00000000000${i + 1}`),
  );

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
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
        checkActionRateLimit(
          "leads.request",
          USER_ID_1,
          ctx.repos,
          "198.51.100.1",
        ),
      ).resolves.toBeUndefined();
    }
  });

  it("blocks the next request after the limit is reached", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    const result = checkActionRateLimit(
      "leads.request",
      USER_ID_1,
      ctx.repos,
      "198.51.100.1",
    );
    await expect(result).rejects.toBeInstanceOf(AppError);
  });

  it("returns 429 with Retry-After header on block", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    let blocked: AppError | undefined;
    try {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    } catch (err) {
      if (err instanceof AppError) blocked = err;
    }

    expect(blocked?.code).toBe("rate_limit");
    const retryAfter = blocked?.retryAfterSeconds ?? 0;
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(
      ACTION_RATE_LIMIT_POLICY["leads.request"].windowMs / 1000,
    );
  });

  it("retry-after decreases as window elapses", async () => {
    const { limit, windowMs } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    const getRetryAfter = async () => {
      try {
        await checkActionRateLimit(
          "leads.request",
          USER_ID_1,
          ctx.repos,
          "198.51.100.1",
        );
      } catch (err) {
        if (err instanceof AppError) {
          return err.retryAfterSeconds ?? 0;
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
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    vi.setSystemTime(Date.now() + windowMs + 1);

    await expect(
      checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      ),
    ).resolves.toBeUndefined();
  });

  it("isolates counters by user", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    // user 2 has a separate counter
    await expect(
      checkActionRateLimit(
        "leads.request",
        USER_ID_2,
        ctx.repos,
        "198.51.100.1",
      ),
    ).resolves.toBeUndefined();
  });

  it("user counter is ip-agnostic: same user from a different IP is still blocked", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    // Switching IP does not reset the per-user counter.
    await expect(
      checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.2",
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("blocks a single IP that exceeds the ip limit across different users", async () => {
    const { ipLimit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    // Spread requests across many iterations of the same users so no single
    // user counter is exhausted, but the shared IP counter is.
    for (let i = 0; i < ipLimit; i++) {
      // Cycle through seed users so no individual user counter fills up.
      await checkActionRateLimit(
        "leads.request",
        USER_IDS[i % 5],
        ctx.repos,
        "198.51.100.99",
      );
    }

    // One more request from the same IP (any existing user) should hit the IP cap.
    await expect(
      checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.99",
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("isolates counters by action name", async () => {
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    // Different action, uses a separate counter.
    await expect(
      checkActionRateLimit(
        "sales_records.create_draft",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      ),
    ).resolves.toBeUndefined();
  });

  it("logs a rate_limit_exceeded audit entry on violation", async () => {
    const userId = USER_ID_1;
    const { limit } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        "198.51.100.1",
      );
    }

    try {
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        "198.51.100.1",
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
    expect(entry?.changes).toContain('"scope":"user"');
    expect(entry?.changes).toContain('"retryAfterMs"');
  });

  it("enforces the longer hourly window for team invites", async () => {
    const { limit, windowMs } = ACTION_RATE_LIMIT_POLICY["team.invite.create"];
    expect(windowMs).toBe(60 * 60_000); // 1 hour

    for (let i = 0; i < limit; i++) {
      await checkActionRateLimit(
        "team.invite.create",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      );
    }

    // still blocked after 30 minutes
    vi.setSystemTime(Date.now() + 30 * 60_000);
    await expect(
      checkActionRateLimit(
        "team.invite.create",
        USER_ID_1,
        ctx.repos,
        "198.51.100.1",
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("cleans up stale counters", async () => {
    await checkActionRateLimit(
      "leads.request",
      USER_ID_1,
      ctx.repos,
      "198.51.100.1",
    );
    const deleted = await ctx.repos.actionRateLimits.deleteUpdatedBefore(
      Date.now() + 1,
    );
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
