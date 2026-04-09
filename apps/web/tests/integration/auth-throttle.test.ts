import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthThrottleService } from "../../src/server/features/auth/application/throttle-service";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("auth throttle", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("auth-throttle");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  function runSeries(
    count: number,
    task: (index: number) => Promise<void>,
  ): Promise<void> {
    let sequence = Promise.resolve();
    for (let index = 0; index < count; index += 1) {
      sequence = sequence.then(() => task(index));
    }
    return sequence;
  }

  it("blocks account after repeated failures across many ips", async () => {
    const svc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    const email = "exec1@test.local";
    await runSeries(6, (i) => svc.recordLoginFailure(email, `198.51.100.${i}`));
    const status = await svc.checkLoginThrottle(email, "203.0.113.1");
    expect(status.allowed).toBe(false);
  });

  it("blocks hot source ip after high-volume failures", async () => {
    const svc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    const ip = "198.51.100.5";
    await runSeries(31, (i) =>
      svc.recordLoginFailure(`user${i}@test.local`, ip),
    );
    const status = await svc.checkLoginThrottle("exec1@test.local", ip);
    expect(status.allowed).toBe(false);
  });

  it("clears account and pair state after successful auth", async () => {
    const svc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    const email = "exec1@test.local";
    const ip = "198.51.100.2";
    await runSeries(6, () => svc.recordLoginFailure(email, ip));
    expect((await svc.checkLoginThrottle(email, ip)).allowed).toBe(false);
    await svc.clearLoginFailureState(email, ip);
    expect((await svc.checkLoginThrottle(email, ip)).allowed).toBe(true);
  });

  it("resets blocked state after observation windows pass", async () => {
    const svc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    const email = "exec1@test.local";
    const ip = "198.51.100.11";
    await runSeries(6, () => svc.recordLoginFailure(email, ip));
    expect((await svc.checkLoginThrottle(email, ip)).allowed).toBe(false);
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await svc.checkLoginThrottle(email, ip)).allowed).toBe(true);
  });

  it("keeps password and passkey counters isolated per endpoint", async () => {
    const svc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    const email = "exec1@test.local";
    const ip = "198.51.100.77";

    await runSeries(9, () => svc.recordPasskeyChallengeFailure(email, ip));

    expect(
      (await svc.checkPasskeyChallengeThrottle(email, ip)).allowed,
    ).toBe(false);
    expect((await svc.checkLoginThrottle(email, ip)).allowed).toBe(true);
  });

  it("cleans expired and stale throttle counters", async () => {
    const now = Date.now();
    await ctx.repos.authThrottle.upsert({
      scope: "ip",
      key_hash: "k-expired",
      window_started_at: now - 1000,
      failure_count: 100,
      blocked_until: now - 1,
      updated_at: now - 1000,
    });
    await ctx.repos.authThrottle.upsert({
      scope: "account",
      key_hash: "k-stale",
      window_started_at: now - 1000,
      failure_count: 1,
      blocked_until: null,
      updated_at: now - 8 * 24 * 60 * 60 * 1000,
    });

    const deletedExpired =
      await ctx.repos.authThrottle.deleteExpiredBlocks(now);
    const deletedStale = await ctx.repos.authThrottle.deleteUpdatedBefore(
      now - 7 * 24 * 60 * 60 * 1000,
    );

    expect(deletedExpired).toBe(1);
    expect(deletedStale).toBe(1);
  });
});
