import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { createSecurityTestKit } from "@tests/support/security/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/lib/security/action-rate-limit";
import { ActionError } from "~/lib/wire-error";

describe("rate limit retry after", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("rate-limit-retry-after");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  it("returns 429 with retry after header on block", async () => {
    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("leads.request", userId, "198.51.100.1");

    let blocked: ActionError | undefined;
    try {
      await checkActionRateLimit(
        "leads.request",
        userId,
        ctx.repos,
        "198.51.100.1",
      );
    } catch (error) {
      if (error instanceof ActionError) blocked = error;
    }

    const wire = blocked?.wire;
    expect(wire?.kind).toBe("rate_limit");
    const retryAfter =
      wire?.kind === "rate_limit" ? (wire.retryAfterSeconds ?? 0) : 0;
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(
      ACTION_RATE_LIMIT_POLICY["leads.request"].windowMs / 1000,
    );
  });

  it("retry after decreases as window elapses", async () => {
    const { windowMs } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("leads.request", userId, "198.51.100.1");

    const getRetryAfter = async () => {
      try {
        await checkActionRateLimit(
          "leads.request",
          userId,
          ctx.repos,
          "198.51.100.1",
        );
      } catch (error) {
        if (error instanceof ActionError && error.wire.kind === "rate_limit") {
          return error.wire.retryAfterSeconds ?? 0;
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

  it("resets the counter after window expires", async () => {
    const { windowMs } = ACTION_RATE_LIMIT_POLICY["leads.request"];
    const kit = createSecurityTestKit(ctx);
    const userId = ctx.fixtures.users.execOne.id;
    await kit.consumeUserLimit("leads.request", userId, "198.51.100.1");

    vi.setSystemTime(Date.now() + windowMs + 1);
    await expect(
      checkActionRateLimit("leads.request", userId, ctx.repos, "198.51.100.1"),
    ).resolves.toBeUndefined();
  });
});
