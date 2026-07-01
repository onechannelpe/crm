import { createAuthScenario } from "@tests/support/auth/scenario";
import { createAuthThrottleKit } from "@tests/support/auth/throttle-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAuthThrottleService } from "~/server/auth/application/throttle-service";

describe("auth throttle scope isolation", () => {
  const scenario = createAuthScenario("auth-throttle-scope-isolation", {
    freezeAtMs: 1_700_000_000_000,
  });

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("blocks when account scope is actively blocked", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const throttle = createAuthThrottleKit(scenario);
    const now = Date.now();

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier: "exec1@test.local",
      ipAddress: "203.0.113.1",
      failureCount: 10,
      blockedUntil: new Date(now + 60_000),
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.9",
    );
    expect(status.allowed).toBe(false);
  });

  it("blocks when ip_account scope is actively blocked", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const throttle = createAuthThrottleKit(scenario);
    const now = Date.now();

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip_account",
      identifier: "exec1@test.local",
      ipAddress: "198.51.100.12",
      failureCount: 10,
      blockedUntil: new Date(now + 60_000),
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.12",
    );
    expect(status.allowed).toBe(false);
  });

  it("clears account and ip_account state but keeps ip state", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const throttle = createAuthThrottleKit(scenario);
    const now = Date.now();
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.77";

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: new Date(now + 60_000),
    });
    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip_account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: new Date(now + 60_000),
    });
    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier: "someone-else@test.local",
      ipAddress,
      failureCount: 100,
      blockedUntil: new Date(now + 60_000),
    });

    await svc.clearLoginFailureState(identifier, ipAddress);

    expect(
      await throttle.readCounter({
        endpoint: "password_login",
        scope: "account",
        identifier,
        ipAddress,
      }),
    ).toBeNull();
    expect(
      await throttle.readCounter({
        endpoint: "password_login",
        scope: "ip_account",
        identifier,
        ipAddress,
      }),
    ).toBeNull();
    expect(
      await throttle.readCounter({
        endpoint: "password_login",
        scope: "ip",
        identifier: "someone-else@test.local",
        ipAddress,
      }),
    ).not.toBeNull();

    const status = await svc.checkLoginThrottle(identifier, ipAddress);
    expect(status.allowed).toBe(false);
  });

  it("keeps endpoint counters isolated", async () => {
    const svc = createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
    const throttle = createAuthThrottleKit(scenario);
    const now = Date.now();
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.88";

    await throttle.seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: new Date(now + 60_000),
    });

    expect((await svc.checkLoginThrottle(identifier, ipAddress)).allowed).toBe(
      false,
    );
    expect(
      (await svc.checkPasskeyChallengeThrottle(identifier, ipAddress)).allowed,
    ).toBe(true);
    expect(
      (await svc.checkPasskeyVerifyThrottle(identifier, ipAddress)).allowed,
    ).toBe(true);
    expect(
      (await svc.checkTotpVerifyThrottle(identifier, ipAddress)).allowed,
    ).toBe(true);
  });
});
