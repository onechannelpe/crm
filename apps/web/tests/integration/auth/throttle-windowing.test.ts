import { createAuthScenario } from "@tests/support/auth/scenario";
import { createAuthThrottleKit } from "@tests/support/auth/throttle-kit";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { AUTH_THROTTLE_POLICY } from "~/server/auth/password/throttle-policy";

describe("auth throttle windowing", () => {
  const scenario = createAuthScenario("auth-throttle-windowing", {
    freezeAtMs: 1_700_000_000_000,
  });

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
  });

  it("allows login when no scope is blocked", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.2",
    );
    expect(status).toEqual({ allowed: true });
  });

  it("blocks when ip scope is actively blocked", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const now = Date.now();
    const throttle = createAuthThrottleKit(scenario);

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier: "any-user@test.local",
      ipAddress: "198.51.100.5",
      failureCount: 100,
      blockedUntil: new Date(now + 90_000),
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.5",
    );
    expect(status.allowed).toBe(false);
    if (status.allowed) throw new Error("expected blocked status");
    expect(status.retryAfterMs).toBe(90_000);
  });

  it("crosses from threshold to blocked on the next login failure", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const now = Date.now();
    const identifier = "seed@test.local";
    const ipAddress = "198.51.100.40";
    const threshold = AUTH_THROTTLE_POLICY.password_login.ip.threshold;
    const throttle = createAuthThrottleKit(scenario);

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier,
      ipAddress,
      failureCount: threshold,
      blockedUntil: null,
      windowStartedAt: new Date(now),
    });

    expect(
      (await svc.checkLoginThrottle("other@test.local", ipAddress)).allowed,
    ).toBe(true);
    await svc.recordLoginFailure(identifier, ipAddress);

    const status = await svc.checkLoginThrottle("other@test.local", ipAddress);
    expect(status.allowed).toBe(false);
  });

  it("resets expired windows when recording a new failure", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.11";
    const now = Date.now();
    const throttle = createAuthThrottleKit(scenario);

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 99,
      blockedUntil: new Date(now + 60_000),
      windowStartedAt: new Date(
        now - AUTH_THROTTLE_POLICY.password_login.account.windowMs - 1,
      ),
    });

    await svc.recordLoginFailure(identifier, ipAddress);

    const row = await throttle.readCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
    });
    expect(row?.failure_count).toBe(1);
    expect(row?.blocked_until).toBeNull();
    expect(row?.window_started_at?.getTime()).toBe(now);
  });
});
