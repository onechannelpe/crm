import { createAuthScenario } from "@tests/support/auth/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("auth throttle reset", () => {
  const scenario = createAuthScenario("auth-throttle-reset", {
    freezeAtMs: 1_700_000_000_000,
  });

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("cleans expired and stale throttle counters", async () => {
    const now = Date.now();
    await scenario.ctx.repos.authThrottle.upsert({
      scope: "ip",
      key_hash: "k-expired",
      window_started_at: now - 1000,
      failure_count: 100,
      blocked_until: now - 1,
      updated_at: now - 1000,
    });
    await scenario.ctx.repos.authThrottle.upsert({
      scope: "account",
      key_hash: "k-stale",
      window_started_at: now - 1000,
      failure_count: 1,
      blocked_until: null,
      updated_at: now - 8 * 24 * 60 * 60 * 1000,
    });

    const deletedExpired =
      await scenario.ctx.repos.authThrottle.deleteExpiredBlocks(now);
    const deletedStale =
      await scenario.ctx.repos.authThrottle.deleteUpdatedBefore(
        now - 7 * 24 * 60 * 60 * 1000,
      );

    expect(deletedExpired).toBe(1);
    expect(deletedStale).toBe(1);
  });
});
