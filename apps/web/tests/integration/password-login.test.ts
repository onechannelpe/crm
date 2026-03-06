import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "../../src/lib/auth/password/password";
import { authenticatePasswordLogin } from "../../src/lib/auth/password/password-login";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("password login service", () => {
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.44";
  const userAgent = "vitest-agent";
  const username = "exec.one";
  const rightPassword = "Secret123!";

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("password-login");
    await ctx.db
      .updateTable("users")
      .set({ password_hash: await hashPassword(rightPassword) })
      .where("id", "=", 1)
      .execute();
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

  it("blocks further attempts after repeated failures", async () => {
    await runSeries(6, async () => {
      try {
        await authenticatePasswordLogin(
          { username, password: "wrong", ipAddress, userAgent },
          {
            repos: ctx.repos,
            sendPrivilegedLoginAlert,
          },
        );
      } catch {}
    });

    await expect(
      authenticatePasswordLogin(
        { username, password: rightPassword, ipAddress, userAgent },
        {
          repos: ctx.repos,
          sendPrivilegedLoginAlert,
        },
      ),
    ).rejects.toThrow("Invalid credentials");

    const retries = await ctx.repos.authEvents.findRecentLoginRetriesByUser(
      1,
      20,
    );
    expect(retries).toHaveLength(7);
    expect(retries[0]?.outcome).toBe("throttled");
    expect(retries[0]?.reason).toBe("threshold_exceeded");
    expect(retries.filter((event) => event.outcome === "failure")).toHaveLength(
      6,
    );
  });

  it("creates session with request metadata on successful auth", async () => {
    const result = await authenticatePasswordLogin(
      { username, password: rightPassword, ipAddress, userAgent },
      { repos: ctx.repos, sendPrivilegedLoginAlert },
    );

    expect(result.userId).toBe(1);
    const session = await ctx.repos.sessions.listForUser(1);
    expect(session[0]?.ip_address).toBe(ipAddress);
    expect(session[0]?.user_agent).toBe(userAgent);

    const events = await ctx.repos.authEvents.findRecentByUser(1, 5);
    expect(events[0]?.method).toBe("password");
    expect(events[0]?.stage).toBe("login");
    expect(events[0]?.outcome).toBe("success");
    expect(events[0]?.reason).toBeNull();
  });

  it("rejects unknown email with same error as wrong password (no enumeration)", async () => {
    await expect(
      authenticatePasswordLogin(
        {
          username: "nobody.test",
          password: "Secret123!",
          ipAddress,
          userAgent,
        },
        { repos: ctx.repos, sendPrivilegedLoginAlert },
      ),
    ).rejects.toThrow("Invalid credentials");
  });

  it("marks login as not onboarded when onboarding is incomplete", async () => {
    await ctx.db
      .updateTable("users")
      .set({
        onboarding_completed_at: null,
        phone_e164: null,
        phone_verified_at: null,
        profile_confirmed_at: null,
      })
      .where("id", "=", 1)
      .execute();

    const result = await authenticatePasswordLogin(
      { username, password: rightPassword, ipAddress, userAgent },
      { repos: ctx.repos, sendPrivilegedLoginAlert },
    );

    expect(result.onboardingCompleted).toBe(false);
  });
});
