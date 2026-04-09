import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import { submitPasswordLogin } from "../../src/server/features/auth/application/login/primary";
import { isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import {
  getSeededIdentity,
  setIdentityOnboarding,
  setIdentityPassword,
} from "../support/test-identities";

describe("password login service", () => {
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.44";
  const userAgent = "vitest-agent";
  const identity = getSeededIdentity("execOne");
  const username = identity.username;
  const rightPassword = "Secret123!";

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    ctx = await createIsolatedTestDb("password-login");
    await setIdentityPassword(ctx, identity, rightPassword);
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

  it("blocks further attempts after repeated failures", async () => {
    await runSeries(6, async () => {
      await submitPasswordLogin(
        {
          identifier: username,
          password: "wrong",
          ipAddress,
          userAgent,
        },
        ctx.repos,
        sendPrivilegedLoginAlert,
      );
    });

    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid credentials");
    }
    expect(result.error.kind).toBe("invalid_credentials");

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
    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful password login");
    }

    expect(result.value.kind).toBe("complete");
    if (result.value.kind !== "complete") {
      throw new Error("expected completed password login");
    }
    expect(result.value.result.userId).toBe(1);
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
    const result = await submitPasswordLogin(
      {
        identifier: "nobody.test",
        password: "Secret123!",
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid credentials");
    }
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("marks login as not onboarded when onboarding is incomplete", async () => {
    await setIdentityOnboarding(ctx, identity, false);

    const result = await submitPasswordLogin(
      {
        identifier: username,
        password: rightPassword,
        ipAddress,
        userAgent,
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful password login");
    }

    expect(result.value.kind).toBe("complete");
    if (result.value.kind !== "complete") {
      throw new Error("expected completed password login");
    }
    expect(result.value.result.onboardingCompleted).toBe(false);
  });
});
