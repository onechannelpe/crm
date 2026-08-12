import { createAuthScenario } from "@tests/support/auth/scenario";
import { createAuthThrottleKit } from "@tests/support/auth/throttle-kit";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createAuthThrottleService,
  type AuthThrottleService,
} from "~/server/auth/application/throttle-service";
import { AUTH_THROTTLE_POLICY } from "~/server/auth/password/throttle-policy";

describe("auth throttle windowing", () => {
  const scenario = createAuthScenario("auth-throttle-windowing", {
    freezeAtMs: 1_700_000_000_000,
  });

  const throttle = createAuthThrottleKit(scenario);

  let service: AuthThrottleService;

  beforeAll(async () => {
    await scenario.setup();

    service = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
  });

  it("allows login when no scope is blocked", async () => {
    const status = await service.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.2",
      new Date(),
    );

    expect(status).toEqual({ allowed: true });
  });

  it("blocks when ip scope is actively blocked", async () => {
    const now = Date.now();

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier: "any-user@test.local",
      ipAddress: "198.51.100.5",
      failureCount: 100,
      blockedUntil: new Date(now + 90_000),
    });

    const status = await service.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.5",
      new Date(now),
    );

    expect(status).toEqual({
      allowed: false,
      retryAfterMs: 90_000,
    });
  });

  it("crosses from threshold to blocked on the next login failure", async () => {
    const now = Date.now();
    const identifier = "seed@test.local";
    const ipAddress = "198.51.100.40";
    const threshold = AUTH_THROTTLE_POLICY.password_login.ip.threshold;

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier,
      ipAddress,
      failureCount: threshold,
      blockedUntil: null,
      windowStartedAt: new Date(now),
    });

    const beforeFailure = await service.checkLoginThrottle(
      "other@test.local",
      ipAddress,
      new Date(now),
    );

    expect(beforeFailure.allowed).toBe(true);

    await service.recordLoginFailure(identifier, ipAddress, new Date(now));

    const afterFailure = await service.checkLoginThrottle(
      "other@test.local",
      ipAddress,
      new Date(now),
    );

    expect(afterFailure.allowed).toBe(false);
  });

  it("resets expired windows when recording a new failure", async () => {
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.11";
    const now = Date.now();

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

    await service.recordLoginFailure(identifier, ipAddress, new Date(now));

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
