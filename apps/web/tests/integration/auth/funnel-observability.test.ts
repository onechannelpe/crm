import { cleanupTestDb, createIsolatedTestDb } from "@tests/support/runtime/db";
import { afterEach, describe, expect, it } from "vitest";

import { createObservabilityService } from "~/server/observability/service";

describe("auth funnel observability", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>> | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("stores and summarizes auth funnel events separately from action observations", async () => {
    ctx = await createIsolatedTestDb("auth-funnel-observability");
    const service = createObservabilityService({
      actionObservations: ctx.repos.actionObservations,
      authFunnelEvents: ctx.repos.authFunnelEvents,
    });
    const baseTime = 1_700_000_000_000;

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
      createdAt: baseTime,
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
      createdAt: baseTime + 1,
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
      createdAt: baseTime + 2,
    });

    const recent = await service.listRecentAuthFunnel({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
    });
    expect(recent).toHaveLength(3);
    expect(recent[0]?.event_name).toBe("totp_result");
    expect(recent[0]?.code).toBe("invalid_totp");

    const summary = await service.summarizeAuthFunnel({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
    });
    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_name: "screen_viewed",
          screen: "login",
          outcome: "viewed",
          source: "client",
        }),
        expect.objectContaining({
          event_name: "password_result",
          method: "password",
          outcome: "totp_required",
          source: "server",
        }),
        expect.objectContaining({
          event_name: "totp_result",
          method: "password_totp",
          outcome: "failed",
          source: "server",
        }),
      ]),
    );
  });
});
