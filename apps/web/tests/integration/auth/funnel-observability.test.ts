import { createAuthScenario } from "@tests/support/auth/scenario";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createObservabilityService } from "~/server/observability/service";
import { isErr } from "~/shared/result";

describe("auth funnel observability snapshot", () => {
  const scenario = createAuthScenario("auth-funnel-observability");

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
  });

  // `getAuthFunnelSnapshot` windows off the real clock (see
  // `parseAuthFunnelSnapshotFilter`). Freeze time here so fixed `createdAt`
  // seeds land inside the query window.
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores funnel events and projects them in summary and recent", async () => {
    const service = createObservabilityService({
      actionObservations: scenario.ctx.repos.actionObservations,
      authFunnelEvents: scenario.ctx.repos.authFunnelEvents,
    });
    const baseTimeMs = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimeMs + 2));

    await service.recordAuthFunnelEvent({
      traceId: "trace-view",
      requestId: "req-view",
      routePath: "/login",
      source: "client",
      eventName: "screen_viewed",
      screen: "login",
      method: null,
      outcome: "viewed",
      code: null,
      createdAt: new Date(baseTimeMs),
    });

    await service.recordAuthFunnelEvent({
      traceId: "trace-pass",
      requestId: "req-pass",
      routePath: "/_server",
      source: "server",
      eventName: "password_result",
      screen: null,
      method: "password",
      outcome: "totp_required",
      code: null,
      createdAt: new Date(baseTimeMs + 1),
    });

    await service.recordAuthFunnelEvent({
      traceId: "trace-totp",
      requestId: "req-totp",
      routePath: "/_server",
      source: "server",
      eventName: "totp_result",
      screen: null,
      method: "password_totp",
      outcome: "failed",
      code: "invalid_totp",
      createdAt: new Date(baseTimeMs + 2),
    });

    const snapshotResult = await service.getAuthFunnelSnapshot(
      { windowMinutes: 60 },
      new Date(),
    );

    expect(isErr(snapshotResult)).toBe(false);
    if (isErr(snapshotResult)) return;
    const snapshot = snapshotResult.value;

    expect(snapshot.recent).toHaveLength(3);
    expect(snapshot.recent[0]).toMatchObject({
      eventName: "totp_result",
      code: "invalid_totp",
    });
    expect(snapshot.recent[1]).toMatchObject({
      eventName: "password_result",
    });
    expect(snapshot.recent[2]).toMatchObject({
      eventName: "screen_viewed",
    });

    expect(snapshot.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: "screen_viewed",
          screen: "login",
          outcome: "viewed",
          source: "client",
          count: 1,
        }),
        expect.objectContaining({
          eventName: "password_result",
          method: "password",
          outcome: "totp_required",
          source: "server",
          count: 1,
        }),
        expect.objectContaining({
          eventName: "totp_result",
          method: "password_totp",
          outcome: "failed",
          source: "server",
          count: 1,
        }),
      ]),
    );
  });
});
