import { createAuditTestKit } from "@tests/support/audit/kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
} from "@tests/support/runtime/db";
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

import { isErr } from "~/server/shared/result";

const EXEC_USER_ID = TEST_FIXTURES.users.execOne.id;
const SUPERUSER_ID = TEST_FIXTURES.users.superUser.id;

describe("action observations snapshot", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>>;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("observability-snapshot");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  // `getActionSnapshot` windows off the real clock (see
  // `parseActionSnapshotFilter`). Freeze time here so fixed `createdAt` seeds
  // land inside the query window.
  afterEach(() => {
    vi.useRealTimers();
  });

  it("projects ok and error rows into summary and recent", async () => {
    const audit = createAuditTestKit(ctx);
    const baseTimeMs = 1_700_000_000_000;
    const baseTime = new Date(baseTimeMs);
    const nextTime = new Date(baseTimeMs + 1);
    vi.useFakeTimers();
    vi.setSystemTime(nextTime);

    await audit.recordAction({
      traceId: "trace-a",
      requestId: "req-a",
      routePath: "/records",
      actionName: "leads.request",
      actorUserId: EXEC_USER_ID,
      actorRole: "executive",
      status: "ok",
      durationMs: 120,
      input: { contactId: 1 },
      createdAt: baseTime,
    });
    await audit.recordAction({
      traceId: "trace-b",
      requestId: "req-b",
      routePath: "/records",
      actionName: "leads.request",
      actorUserId: EXEC_USER_ID,
      actorRole: "executive",
      status: "error",
      durationMs: 95,
      errorCode: "forbidden",
      errorMessage: "Forbidden",
      input: { contactId: 2 },
      createdAt: nextTime,
    });

    const snapshotResult = await audit.observability.getActionSnapshot({
      windowMinutes: 60,
    });

    expect(isErr(snapshotResult)).toBe(false);
    if (isErr(snapshotResult)) return;
    const snapshot = snapshotResult.value;

    expect(snapshot.summary).toHaveLength(1);
    const summaryRow = snapshot.summary[0];
    expect(summaryRow).toMatchObject({
      actionName: "leads.request",
      count: 2,
      errorCount: 1,
    });
    expect(summaryRow?.avgDurationMs).toBeGreaterThan(0);

    // recent rows are ordered by created_at desc, so the error row is first.
    expect(snapshot.recent).toHaveLength(2);
    expect(snapshot.recent[0]?.status).toBe("error");
    expect(snapshot.recent[1]?.status).toBe("ok");
  });

  it("normalizes wire error codes into the public error column", async () => {
    const audit = createAuditTestKit(ctx);
    const baseTimeMs = 1_700_000_000_000;
    const baseTime = new Date(baseTimeMs);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimeMs + 1));

    await audit.recordAction({
      traceId: "trace-validation",
      requestId: "req-validation",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "error",
      durationMs: 10,
      errorCode: "validation",
      errorMessage: "email must be valid",
      input: { role: "executive" },
      createdAt: baseTime,
    });
    await audit.recordAction({
      traceId: "trace-unauth",
      requestId: "req-unauth",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "error",
      durationMs: 11,
      errorCode: "unauthenticated",
      errorMessage: "no session",
      input: { role: "executive" },
      createdAt: new Date(baseTimeMs + 1),
    });

    const snapshotResult = await audit.observability.getActionSnapshot({
      windowMinutes: 60,
      actionName: "team.invite.create",
      status: "error",
    });

    expect(isErr(snapshotResult)).toBe(false);
    if (isErr(snapshotResult)) return;

    const codes = snapshotResult.value.recent
      .map((row) => row.errorCode)
      .filter((code): code is string => code !== null)
      .toSorted((a, b) => a.localeCompare(b));
    expect(codes).toEqual(["authentication_required", "validation_failed"]);
    expect(snapshotResult.value.summary[0]).toMatchObject({
      actionName: "team.invite.create",
      count: 2,
      errorCount: 2,
    });
  });

  it("deletes old observations via the retention sweep", async () => {
    const audit = createAuditTestKit(ctx);
    const baseTimeMs = 1_700_000_000_000;
    const cutoff = new Date(baseTimeMs);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimeMs + 1_000));

    await audit.recordAction({
      traceId: "trace-old",
      requestId: "req-old",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "error",
      durationMs: 10,
      errorCode: "validation",
      errorMessage: "email must be valid",
      input: { role: "executive" },
      createdAt: new Date(baseTimeMs - 1_000),
    });

    await audit.recordAction({
      traceId: "trace-new",
      requestId: "req-new",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "ok",
      durationMs: 11,
      input: { role: "executive" },
      createdAt: new Date(baseTimeMs + 1_000),
    });

    // Anchor the snapshot window to the new row so both rows are visible.
    const beforeSweep = await audit.observability.getActionSnapshot({
      windowMinutes: 60,
    });
    expect(isErr(beforeSweep)).toBe(false);
    if (isErr(beforeSweep)) throw new Error("Expected snapshot success");
    expect(beforeSweep.value.recent).toHaveLength(2);

    const deleted =
      await ctx.repos.actionObservations.deleteCreatedBefore(cutoff);
    expect(deleted).toBe(1);

    const afterSweep = await audit.observability.getActionSnapshot({
      windowMinutes: 60,
    });
    expect(isErr(afterSweep)).toBe(false);
    if (isErr(afterSweep)) return;
    expect(afterSweep.value.recent).toHaveLength(1);
    expect(afterSweep.value.recent[0]?.actionName).toBe("team.invite.create");
  });

  it("filters summary consistently by status and action name", async () => {
    const audit = createAuditTestKit(ctx);
    const baseTimeMs = 1_700_000_000_000;
    const baseTime = new Date(baseTimeMs);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimeMs + 2));

    await audit.recordAction({
      traceId: "trace-1",
      requestId: "req-1",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "error",
      durationMs: 10,
      errorCode: "validation",
      errorMessage: "invalid email",
      createdAt: baseTime,
    });
    await audit.recordAction({
      traceId: "trace-2",
      requestId: "req-2",
      routePath: "/team/invite",
      actionName: "team.invite.create",
      actorUserId: SUPERUSER_ID,
      actorRole: "superuser",
      status: "ok",
      durationMs: 11,
      createdAt: new Date(baseTimeMs + 1),
    });
    await audit.recordAction({
      traceId: "trace-3",
      requestId: "req-3",
      routePath: "/records",
      actionName: "leads.request",
      actorUserId: EXEC_USER_ID,
      actorRole: "executive",
      status: "error",
      durationMs: 12,
      errorCode: "forbidden",
      errorMessage: "forbidden",
      createdAt: new Date(baseTimeMs + 2),
    });

    const filteredResult = await audit.observability.getActionSnapshot({
      windowMinutes: 60,
      actionName: "team.invite.create",
      status: "error",
    });

    expect(isErr(filteredResult)).toBe(false);
    if (isErr(filteredResult)) return;
    const filtered = filteredResult.value;

    expect(filtered.summary).toHaveLength(1);
    expect(filtered.summary[0]).toMatchObject({
      actionName: "team.invite.create",
      count: 1,
      errorCount: 1,
    });
    expect(filtered.recent.every((row) => row.status === "error")).toBe(true);
    expect(
      filtered.recent.every((row) => row.actionName === "team.invite.create"),
    ).toBe(true);
  });
});
