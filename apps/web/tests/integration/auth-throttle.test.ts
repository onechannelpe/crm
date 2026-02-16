import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "../../src/lib/auth/throttle";
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
    return Array.from({ length: count }).reduce<Promise<void>>(
      (prev, _, index) => prev.then(() => task(index)),
      Promise.resolve(),
    );
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
});
