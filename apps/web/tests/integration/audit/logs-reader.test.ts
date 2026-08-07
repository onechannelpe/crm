import { expectOk } from "@tests/support/_core/assertions";
import { seedEvent } from "@tests/support/audit/builders";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { DomainEventLogRecord } from "~/contracts/event-logs/event-log";
import { calendarDateFromParts } from "~/domain/time/calendar-date";
import { createEventLogsService } from "~/server/event-logs/service";

const EXEC_USER_ID = TEST_FIXTURES.users.execOne.id;
const SUPERUSER_ID = TEST_FIXTURES.users.superUser.id;
const BASE_TIME_MS = 1_700_000_000_000;

describe("audit logs reader repository", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>>;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("audit-logs-reader");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  async function domainEvents(filters: {
    eventType?: string;
    actorUserId?: string;
    onlyHighRisk?: boolean;
  }): Promise<DomainEventLogRecord[]> {
    const { records } = expectOk(
      await createEventLogsService(ctx.db).getEventLogs({
        table: "DOMAIN_EVENT",
        first: 10,
        filters: {
          ...filters,
          dateRange: {
            start: calendarDateFromParts({ year: 2023, month: 11, day: 14 }),
            end: calendarDateFromParts({ year: 2023, month: 11, day: 14 }),
          },
        },
      }),
    );

    return records.filter(
      (record): record is DomainEventLogRecord =>
        record.table === "DOMAIN_EVENT",
    );
  }

  it("filters high-risk events using the current action policy", async () => {
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "product_updated",
      entityType: "product",
      entityId: "018f63e2-4300-7000-8000-000000000101",
      payload: { field: "price" },
      occurredAt: new Date(BASE_TIME_MS),
    });
    await seedEvent(ctx, {
      actorUserId: EXEC_USER_ID,
      type: "leads_requested",
      entityType: "lead_assignment",
      entityId: "018f63e2-4300-7000-8000-000000000001",
      payload: { requested: 4, assigned: 4 },
      occurredAt: new Date(BASE_TIME_MS + 1),
    });
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "all_sessions_revoked",
      entityType: "user_session",
      entityId: "018f63e2-4300-7000-8000-000000000005",
      payload: { reason: "security" },
      occurredAt: new Date(BASE_TIME_MS + 2),
    });

    const beforePolicy = await domainEvents({ onlyHighRisk: true });
    expect(beforePolicy.map((record) => record.event)).toEqual([
      "all_sessions_revoked",
      "leads_requested",
      "product_updated",
    ]);

    await ctx.repos.auditActionPolicies.upsert({
      action: "leads_requested",
      risk_level: "low",
      is_active: true,
      is_protected: false,
      updated_by_user_id: EXEC_USER_ID,
      updatedAt: new Date(BASE_TIME_MS + 3),
    });

    const afterPolicy = await domainEvents({ onlyHighRisk: true });
    expect(afterPolicy.map((record) => record.event)).toEqual([
      "all_sessions_revoked",
      "product_updated",
    ]);
  });

  it("filters events by type", async () => {
    await seedEvent(ctx, {
      actorUserId: EXEC_USER_ID,
      type: "leads_requested",
      entityType: "lead_assignment",
      entityId: "018f63e2-4300-7000-8000-000000000001",
      payload: { requested: 4, assigned: 4 },
      occurredAt: new Date(BASE_TIME_MS),
    });
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "product_updated",
      entityType: "product",
      entityId: "018f63e2-4300-7000-8000-000000000101",
      payload: { field: "price" },
      occurredAt: new Date(BASE_TIME_MS + 1),
    });

    const events = await domainEvents({ eventType: "leads_requested" });

    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("leads_requested");
    expect(events[0]?.entity.type).toBe("lead_assignment");
  });

  it("filters events by actor", async () => {
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "product_updated",
      entityType: "product",
      entityId: "018f63e2-4300-7000-8000-000000000101",
      payload: { field: "price" },
      occurredAt: new Date(BASE_TIME_MS),
    });
    await seedEvent(ctx, {
      actorUserId: EXEC_USER_ID,
      type: "leads_requested",
      entityType: "lead_assignment",
      entityId: "018f63e2-4300-7000-8000-000000000001",
      payload: { requested: 4, assigned: 4 },
      occurredAt: new Date(BASE_TIME_MS + 1),
    });
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "all_sessions_revoked",
      entityType: "user_session",
      entityId: "018f63e2-4300-7000-8000-000000000005",
      payload: { reason: "security" },
      occurredAt: new Date(BASE_TIME_MS + 2),
    });

    const events = await domainEvents({ actorUserId: SUPERUSER_ID });

    expect(events).toHaveLength(2);
    expect(events.map((record) => record.event)).toEqual([
      "all_sessions_revoked",
      "product_updated",
    ]);
  });
});
