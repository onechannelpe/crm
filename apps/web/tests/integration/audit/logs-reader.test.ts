import { seedEvent } from "@tests/support/audit/builders";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const EXEC_USER_ID = TEST_FIXTURES.users.execOne.id;
const SUPERUSER_ID = TEST_FIXTURES.users.superUser.id;

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

  it("filters recent entries and high-risk actions", async () => {
    const baseTimeMs = 1_700_000_000_000;

    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "product_updated",
      entityType: "product",
      entityId: "018f63e2-4300-7000-8000-000000000101",
      payload: { field: "price" },
      occurredAt: new Date(baseTimeMs),
    });
    await seedEvent(ctx, {
      actorUserId: EXEC_USER_ID,
      type: "leads_requested",
      entityType: "lead_assignment",
      entityId: "018f63e2-4300-7000-8000-000000000001",
      payload: { requested: 4, assigned: 4 },
      occurredAt: new Date(baseTimeMs + 1),
    });
    await seedEvent(ctx, {
      actorUserId: SUPERUSER_ID,
      type: "all_sessions_revoked",
      entityType: "user_session",
      entityId: "018f63e2-4300-7000-8000-000000000005",
      payload: { reason: "security" },
      occurredAt: new Date(baseTimeMs + 2),
    });

    const highRiskDefault = await ctx.repos.events.listRecent({
      fromInclusive: new Date(baseTimeMs - 1000),
      toInclusive: new Date(baseTimeMs + 1000),
      limit: 10,
      onlyHighRisk: true,
    });
    expect(highRiskDefault).toHaveLength(3);
    expect(highRiskDefault[0]?.type).toBe("all_sessions_revoked");
    expect(highRiskDefault[1]?.type).toBe("leads_requested");
    expect(highRiskDefault[2]?.type).toBe("product_updated");

    await ctx.repos.auditActionPolicies.upsert({
      action: "leads_requested",
      risk_level: "low",
      is_active: true,
      is_protected: false,
      updated_by_user_id: EXEC_USER_ID,
      now: new Date(baseTimeMs + 3),
    });

    const highRiskAfterPolicy = await ctx.repos.events.listRecent({
      fromInclusive: new Date(baseTimeMs - 1000),
      toInclusive: new Date(baseTimeMs + 1000),
      limit: 10,
      onlyHighRisk: true,
    });
    expect(highRiskAfterPolicy).toHaveLength(2);
    expect(highRiskAfterPolicy[0]?.type).toBe("all_sessions_revoked");
    expect(highRiskAfterPolicy[1]?.type).toBe("product_updated");

    const byAction = await ctx.repos.events.listRecent({
      fromInclusive: new Date(baseTimeMs - 1000),
      toInclusive: new Date(baseTimeMs + 1000),
      limit: 10,
      action: "leads_requested",
    });
    expect(byAction).toHaveLength(1);
    expect(byAction[0]?.entity_type).toBe("lead_assignment");

    const byActor = await ctx.repos.events.listRecent({
      fromInclusive: new Date(baseTimeMs - 1000),
      toInclusive: new Date(baseTimeMs + 1000),
      limit: 10,
      actorUserId: SUPERUSER_ID,
    });
    expect(byActor).toHaveLength(2);
  });
});
