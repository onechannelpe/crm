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
    });
    const baseTime = 1_700_000_000_000;

    await service.recordAction({
      traceId: "trace-a",
      requestId: "req-a",
      routePath: "/sales/new",
      httpMethod: "POST",
      actionName: "sales.create",
      actorUserId: 1,
      actorRole: "executive",
      status: "ok",
      durationMs: 120,
      errorMessage: null,
      input: { contactId: 1 },
      createdAt: baseTime,
    });

    await service.recordAction({
      traceId: "trace-b",
      requestId: "req-b",
      routePath: "/sales/new",
      httpMethod: "POST",
      actionName: "sales.create",
      actorUserId: 1,
      actorRole: "executive",
      status: "error",
      durationMs: 95,
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
    expect(summary[0]?.action_name).toBe("sales.create");
    expect(Number(summary[0]?.count ?? 0)).toBe(2);
    expect(Number(summary[0]?.error_count ?? 0)).toBe(1);
  });
});
