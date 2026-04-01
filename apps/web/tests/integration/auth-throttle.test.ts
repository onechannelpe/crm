import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkLoginThrottle,
  checkPasskeyChallengeThrottle,
  clearLoginFailureState,
  recordLoginFailure,
  recordPasskeyChallengeFailure,
} from "../../src/lib/auth/password/throttle";
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
    const email = "exec1@test.local";
    await runSeries(6, (i) =>
      recordLoginFailure(email, `198.51.100.${i}`, ctx.repos),
    );
    const status = await checkLoginThrottle(email, "203.0.113.1", ctx.repos);
    expect(status.allowed).toBe(false);
  });

  it("blocks hot source ip after high-volume failures", async () => {
    const ip = "198.51.100.5";
    await runSeries(31, (i) =>
      recordLoginFailure(`user${i}@test.local`, ip, ctx.repos),
    );
    const status = await checkLoginThrottle("exec1@test.local", ip, ctx.repos);
    expect(status.allowed).toBe(false);
  });

  it("clears account and pair state after successful auth", async () => {
    const email = "exec1@test.local";
    const ip = "198.51.100.2";
    await runSeries(6, () => recordLoginFailure(email, ip, ctx.repos));
    expect((await checkLoginThrottle(email, ip, ctx.repos)).allowed).toBe(
      false,
    );
    await clearLoginFailureState(email, ip, ctx.repos);
    expect((await checkLoginThrottle(email, ip, ctx.repos)).allowed).toBe(true);
  });

  it("resets blocked state after observation windows pass", async () => {
    const email = "exec1@test.local";
    const ip = "198.51.100.11";
    await runSeries(6, () => recordLoginFailure(email, ip, ctx.repos));
    expect((await checkLoginThrottle(email, ip, ctx.repos)).allowed).toBe(
      false,
    );
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await checkLoginThrottle(email, ip, ctx.repos)).allowed).toBe(true);
  });

  it("keeps password and passkey counters isolated per endpoint", async () => {
    const email = "exec1@test.local";
    const ip = "198.51.100.77";

    await runSeries(9, () =>
      recordPasskeyChallengeFailure(email, ip, ctx.repos),
    );

    expect(
      (await checkPasskeyChallengeThrottle(email, ip, ctx.repos)).allowed,
    ).toBe(false);
    expect((await checkLoginThrottle(email, ip, ctx.repos)).allowed).toBe(true);
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
