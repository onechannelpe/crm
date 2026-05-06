import { createAuthScenario } from "@tests/support/auth/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isErr } from "~/server/shared/result";

function runSeries(count: number, task: () => Promise<void>): Promise<void> {
  let sequence = Promise.resolve();
  for (let index = 0; index < count; index += 1) {
    sequence = sequence.then(() => task());
  }
  return sequence;
}

describe("password login service", () => {
  const scenario = createAuthScenario("password-login", {
    freezeAtMs: 1_700_000_000_000,
  });
  const identity = "execOne" as const;
  const rightPassword = "Secret123!";
  const requestMeta = {
    ipAddress: "198.51.100.44",
    userAgent: "vitest-agent",
  };

  beforeEach(async () => {
    await scenario.setup();
    await scenario.setPassword(identity, rightPassword);
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("blocks further attempts after repeated failures", async () => {
    await runSeries(6, async () => {
      await scenario.loginPassword(identity, "wrong", requestMeta);
    });

    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) throw new Error("expected invalid credentials");
    expect(result.error.kind).toBe("invalid_credentials");

    const retries =
      await scenario.ctx.repos.authEvents.findRecentLoginRetriesByUser(1, 20);
    expect(retries).toHaveLength(7);
    expect(retries[0]?.outcome).toBe("throttled");
    expect(retries[0]?.reason).toBe("threshold_exceeded");
    expect(retries.filter((event) => event.outcome === "failure")).toHaveLength(
      6,
    );
  });

  it("creates session with request metadata on successful auth", async () => {
    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "complete") {
      throw new Error("expected completed password login");
    }

    expect(result.value.result.userId).toBe(1);
    const session = await scenario.ctx.repos.sessions.listForUser(1);
    expect(session[0]?.ip_address).toBe(requestMeta.ipAddress);
    expect(session[0]?.user_agent).toBe(requestMeta.userAgent);

    const events = await scenario.ctx.repos.authEvents.findRecentByUser(1, 5);
    expect(events[0]?.method).toBe("password");
    expect(events[0]?.stage).toBe("login");
    expect(events[0]?.outcome).toBe("success");
    expect(events[0]?.reason).toBeNull();
  });

  it("rejects unknown email with same error as wrong password (no enumeration)", async () => {
    const result = await scenario.loginByIdentifier(
      "nobody.test",
      "Secret123!",
      {
        ...requestMeta,
        ipAddress: "198.51.100.45",
      },
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) throw new Error("expected invalid credentials");
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("marks login as not onboarded when onboarding is incomplete", async () => {
    await scenario.setOnboarding(identity, false);

    const result = await scenario.loginPassword(
      identity,
      rightPassword,
      requestMeta,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result) || result.value.kind !== "complete") {
      throw new Error("expected completed password login");
    }
    expect(result.value.result.onboardingCompleted).toBe(false);
  });
});
