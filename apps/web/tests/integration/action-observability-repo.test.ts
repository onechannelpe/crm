import { afterEach, describe, expect, it } from "vitest";

import { createObservabilityService } from "../../src/server/observability/service";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("action observability repository", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>> | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("stores action observations and summarizes outcomes", async () => {
    ctx = await createIsolatedTestDb("observability-repo");
    const service = createObservabilityService({
      actionObservations: ctx.repos.actionObservations,
      authFunnelEvents: ctx.repos.authFunnelEvents,
    });
    const baseTime = 1_700_000_000_000;

    await service.recordAction({
      traceId: "trace-a",
      requestId: "req-a",
      routePath: "/leads",
      httpMethod: "POST",
      actionName: "leads.request",
      actorUserId: 1,
      actorRole: "executive",
      status: "ok",
      durationMs: 120,
      errorCode: null,
      errorMessage: null,
      input: { contactId: 1 },
      createdAt: baseTime,
    });

    await service.recordAction({
      traceId: "trace-b",
      requestId: "req-b",
      routePath: "/leads",
      httpMethod: "POST",
      actionName: "leads.request",
      actorUserId: 1,
      actorRole: "executive",
      status: "error",
      durationMs: 95,
      errorCode: null,
      errorMessage: "Forbidden",
      input: { contactId: 2 },
      createdAt: baseTime + 1,
    });

    const recent = await service.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
    });
    expect(recent).toHaveLength(2);
    expect(recent[0]?.status).toBe("error");

    const summary = await service.summarizeByAction({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
    });
    expect(summary).toHaveLength(1);
    expect(summary[0]?.action_name).toBe("leads.request");
    expect(summary[0]?.count ?? 0).toBe(2);
    expect(summary[0]?.error_count ?? 0).toBe(1);
  });

  it("uses fixed validation error code and can delete old records", async () => {
    ctx = await createIsolatedTestDb("observability-retention");
    const service = createObservabilityService({
      actionObservations: ctx.repos.actionObservations,
      authFunnelEvents: ctx.repos.authFunnelEvents,
    });
    const baseTime = 1_700_000_000_000;

    await service.recordAction({
      traceId: "trace-old",
      requestId: "req-old",
      routePath: "/team/invite",
      httpMethod: "POST",
      actionName: "team.invite.create",
      actorUserId: 5,
      actorRole: "superuser",
      status: "error",
      durationMs: 10,
      errorCode: "validation",
      errorMessage: "email must be valid",
      input: { role: "executive" },
      createdAt: baseTime - 1_000,
    });

    await service.recordAction({
      traceId: "trace-new",
      requestId: "req-new",
      routePath: "/team/invite",
      httpMethod: "POST",
      actionName: "team.invite.create",
      actorUserId: 5,
      actorRole: "superuser",
      status: "error",
      durationMs: 11,
      errorCode: "validation",
      errorMessage: "fullName is invalid",
      input: { role: "executive" },
      createdAt: baseTime + 1_000,
    });

    const beforeCleanup = await service.listRecent({
      fromInclusive: baseTime - 10_000,
      toInclusive: baseTime + 10_000,
      limit: 10,
    });
    expect(beforeCleanup).toHaveLength(2);
    expect(beforeCleanup[0]?.error_code).toBe("validation_failed");
    expect(beforeCleanup[1]?.error_code).toBe("validation_failed");

    const deleted =
      await ctx.repos.actionObservations.deleteCreatedBefore(baseTime);
    expect(deleted).toBe(1);

    const afterCleanup = await service.listRecent({
      fromInclusive: baseTime - 10_000,
      toInclusive: baseTime + 10_000,
      limit: 10,
    });
    expect(afterCleanup).toHaveLength(1);
    expect(afterCleanup[0]?.trace_id).toBe("trace-new");
  });

  it("applies status and action filters consistently to summary", async () => {
    ctx = await createIsolatedTestDb("observability-summary-filters");
    const service = createObservabilityService({
      actionObservations: ctx.repos.actionObservations,
      authFunnelEvents: ctx.repos.authFunnelEvents,
    });
    const baseTime = 1_700_000_000_000;

    await service.recordAction({
      traceId: "trace-1",
      requestId: "req-1",
      routePath: "/team/invite",
      httpMethod: "POST",
      actionName: "team.invite.create",
      actorUserId: 5,
      actorRole: "superuser",
      status: "error",
      durationMs: 10,
      errorCode: "validation",
      errorMessage: "invalid email",
      input: {},
      createdAt: baseTime,
    });
    await service.recordAction({
      traceId: "trace-2",
      requestId: "req-2",
      routePath: "/team/invite",
      httpMethod: "POST",
      actionName: "team.invite.create",
      actorUserId: 5,
      actorRole: "superuser",
      status: "ok",
      durationMs: 11,
      errorCode: null,
      errorMessage: null,
      input: {},
      createdAt: baseTime + 1,
    });
    await service.recordAction({
      traceId: "trace-3",
      requestId: "req-3",
      routePath: "/leads",
      httpMethod: "POST",
      actionName: "leads.request",
      actorUserId: 1,
      actorRole: "executive",
      status: "error",
      durationMs: 12,
      errorCode: "forbidden",
      errorMessage: "forbidden",
      input: {},
      createdAt: baseTime + 2,
    });

    const filteredSummary = await service.summarizeByAction({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      actionName: "team.invite.create",
      status: "error",
    });

    expect(filteredSummary).toHaveLength(1);
    expect(filteredSummary[0]?.action_name).toBe("team.invite.create");
    expect(filteredSummary[0]?.count ?? 0).toBe(1);
    expect(filteredSummary[0]?.error_count ?? 0).toBe(1);
  });
});
