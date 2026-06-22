import { seedEvent } from "@tests/support/audit/builders";
import { cleanupTestDb, createIsolatedTestDb } from "@tests/support/runtime/db";
import { afterEach, describe, expect, it } from "vitest";

describe("audit logs reader repository", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>> | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("filters recent entries and high-risk actions", async () => {
    ctx = await createIsolatedTestDb("audit-logs-reader");
    const baseTime = 1_700_000_000_000;

    await seedEvent(ctx, {
      actorUserId: 5,
      type: "product_updated",
      entityType: "product",
      entityId: "018f63e2-4300-7000-8000-000000000101",
      payload: { field: "price" },
      occurredAt: baseTime,
    });
    await seedEvent(ctx, {
      actorUserId: 1,
      type: "leads_requested",
      entityType: "lead_assignment",
      entityId: "018f63e2-4300-7000-8000-000000000001",
      payload: { requested: 4, assigned: 4 },
      occurredAt: baseTime + 1,
    });
    await seedEvent(ctx, {
      actorUserId: 5,
      type: "all_sessions_revoked",
      entityType: "user_session",
      entityId: "018f63e2-4300-7000-8000-000000000005",
      payload: { reason: "security" },
      occurredAt: baseTime + 2,
    });

    const highRiskDefault = await ctx.repos.events.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
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
      is_active: 1,
      is_protected: 0,
      updated_by_user_id: 1,
      now: baseTime + 3,
    });

    const highRiskAfterPolicy = await ctx.repos.events.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      onlyHighRisk: true,
    });
    expect(highRiskAfterPolicy).toHaveLength(2);
    expect(highRiskAfterPolicy[0]?.type).toBe("all_sessions_revoked");
    expect(highRiskAfterPolicy[1]?.type).toBe("product_updated");

    const byAction = await ctx.repos.events.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      action: "leads_requested",
    });
    expect(byAction).toHaveLength(1);
    expect(byAction[0]?.entity_type).toBe("lead_assignment");

    const byActor = await ctx.repos.events.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      actorUserId: 5,
    });
    expect(byActor).toHaveLength(2);
  });
});
