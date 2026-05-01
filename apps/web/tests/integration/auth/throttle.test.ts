import { createAuthScenario } from "@tests/support/auth/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildThrottleKeys } from "~/lib/auth/password/throttle-keys";
import {
  AUTH_THROTTLE_POLICY,
  type AuthThrottleEndpoint,
} from "~/lib/auth/password/throttle-policy";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";

describe("auth throttle", () => {
  const scenario = createAuthScenario("auth-throttle", {
    freezeAtMs: 1_700_000_000_000,
  });

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  function createService() {
    return createAuthThrottleService({
      authThrottle: scenario.ctx.repos.authThrottle,
    });
  }

  async function seedCounter(params: {
    endpoint: AuthThrottleEndpoint;
    scope: AuthThrottleScope;
    identifier: string;
    ipAddress: string;
    failureCount: number;
    blockedUntil: number | null;
    windowStartedAt?: number;
    updatedAt?: number;
  }): Promise<void> {
    const now = Date.now();
    const keys = buildThrottleKeys(
      params.endpoint,
      params.identifier,
      params.ipAddress,
    );
    await scenario.ctx.repos.authThrottle.upsert({
      scope: params.scope,
      key_hash: keys[params.scope],
      window_started_at: params.windowStartedAt ?? now,
      failure_count: params.failureCount,
      blocked_until: params.blockedUntil,
      updated_at: params.updatedAt ?? now,
    });
  }

  async function readCounter(params: {
    endpoint: AuthThrottleEndpoint;
    scope: AuthThrottleScope;
    identifier: string;
    ipAddress: string;
  }) {
    const keys = buildThrottleKeys(
      params.endpoint,
      params.identifier,
      params.ipAddress,
    );
    return scenario.ctx.repos.authThrottle.findByScopeAndKey(
      params.scope,
      keys[params.scope],
    );
  }

  it("allows login when no scope is blocked", async () => {
    const svc = createService();
    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.2",
    );
    expect(status).toEqual({ allowed: true });
  });

  it("blocks when ip scope is actively blocked", async () => {
    const svc = createService();
    const now = Date.now();

    await seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier: "any-user@test.local",
      ipAddress: "198.51.100.5",
      failureCount: 100,
      blockedUntil: now + 90_000,
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.5",
    );
    expect(status.allowed).toBe(false);
    if (status.allowed) {
      throw new Error("expected blocked status");
    }
    expect(status.retryAfterMs).toBe(90_000);
  });

  it("blocks when account scope is actively blocked", async () => {
    const svc = createService();
    const now = Date.now();

    await seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier: "exec1@test.local",
      ipAddress: "203.0.113.1",
      failureCount: 10,
      blockedUntil: now + 60_000,
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.9",
    );
    expect(status.allowed).toBe(false);
  });

  it("blocks when ip_account scope is actively blocked", async () => {
    const svc = createService();
    const now = Date.now();

    await seedCounter({
      endpoint: "password_login",
      scope: "ip_account",
      identifier: "exec1@test.local",
      ipAddress: "198.51.100.12",
      failureCount: 10,
      blockedUntil: now + 60_000,
    });

    const status = await svc.checkLoginThrottle(
      "exec1@test.local",
      "198.51.100.12",
    );
    expect(status.allowed).toBe(false);
  });

  it("crosses from threshold to blocked on the next login failure", async () => {
    const svc = createService();
    const now = Date.now();
    const identifier = "seed@test.local";
    const ipAddress = "198.51.100.40";
    const threshold = AUTH_THROTTLE_POLICY.password_login.ip.threshold;

    await seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier,
      ipAddress,
      failureCount: threshold,
      blockedUntil: null,
      windowStartedAt: now,
    });

    expect(
      (await svc.checkLoginThrottle("other@test.local", ipAddress)).allowed,
    ).toBe(true);

    await svc.recordLoginFailure(identifier, ipAddress);

    const status = await svc.checkLoginThrottle("other@test.local", ipAddress);
    expect(status.allowed).toBe(false);
  });

  it("clears account and ip_account state but keeps ip state", async () => {
    const svc = createService();
    const now = Date.now();
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.77";

    await seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: now + 60_000,
    });
    await seedCounter({
      endpoint: "password_login",
      scope: "ip_account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: now + 60_000,
    });
    await seedCounter({
      endpoint: "password_login",
      scope: "ip",
      identifier: "someone-else@test.local",
      ipAddress,
      failureCount: 100,
      blockedUntil: now + 60_000,
    });

    await svc.clearLoginFailureState(identifier, ipAddress);

    expect(
      await readCounter({
        endpoint: "password_login",
        scope: "account",
        identifier,
        ipAddress,
      }),
    ).toBeNull();
    expect(
      await readCounter({
        endpoint: "password_login",
        scope: "ip_account",
        identifier,
        ipAddress,
      }),
    ).toBeNull();
    expect(
      await readCounter({
        endpoint: "password_login",
        scope: "ip",
        identifier: "someone-else@test.local",
        ipAddress,
      }),
    ).not.toBeNull();

    const status = await svc.checkLoginThrottle(identifier, ipAddress);
    expect(status.allowed).toBe(false);
  });

  it("resets expired windows when recording a new failure", async () => {
    const svc = createService();
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.11";
    const now = Date.now();

    await seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 99,
      blockedUntil: now + 60_000,
      windowStartedAt:
        now - AUTH_THROTTLE_POLICY.password_login.account.windowMs - 1,
    });

    await svc.recordLoginFailure(identifier, ipAddress);

    const row = await readCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
    });
    expect(row?.failure_count).toBe(1);
    expect(row?.blocked_until).toBeNull();
    expect(row?.window_started_at).toBe(now);
  });

  it("keeps endpoint counters isolated", async () => {
    const svc = createService();
    const now = Date.now();
    const identifier = "exec1@test.local";
    const ipAddress = "198.51.100.88";

    await seedCounter({
      endpoint: "password_login",
      scope: "account",
      identifier,
      ipAddress,
      failureCount: 10,
      blockedUntil: now + 60_000,
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
    const deletedStale = await scenario.ctx.repos.authThrottle.deleteUpdatedBefore(
      now - 7 * 24 * 60 * 60 * 1000,
    );

    expect(deletedExpired).toBe(1);
    expect(deletedStale).toBe(1);
  });
});
