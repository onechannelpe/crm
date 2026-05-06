import { seedAuditLog } from "@tests/support/audit/builders";
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

  it("filters recent entries and high risk actions", async () => {
    ctx = await createIsolatedTestDb("audit-logs-reader");
    const baseTime = 1_700_000_000_000;

    await seedAuditLog(ctx, {
      userId: 5,
      action: "product_updated",
      entityType: "product",
      entityId: 101,
      changes: '{"field":"price"}',
      createdAt: baseTime,
    });
    await seedAuditLog(ctx, {
      userId: 1,
      action: "leads_requested",
      entityType: "lead_assignment",
      entityId: 1,
      changes: '{"requested":4,"assigned":4}',
      createdAt: baseTime + 1,
    });
    await seedAuditLog(ctx, {
      userId: 5,
      action: "all_sessions_revoked",
      entityType: "user_session",
      entityId: 5,
      changes: '{"reason":"security"}',
      createdAt: baseTime + 2,
    });

    const highRiskDefault = await ctx.repos.auditLogs.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      onlyHighRisk: true,
    });
    expect(highRiskDefault).toHaveLength(3);
    expect(highRiskDefault[0]?.action).toBe("all_sessions_revoked");
    expect(highRiskDefault[1]?.action).toBe("leads_requested");
    expect(highRiskDefault[2]?.action).toBe("product_updated");

    await ctx.repos.auditActionPolicies.upsert({
      action: "leads_requested",
      risk_level: "low",
      is_active: 1,
      is_protected: 0,
      updated_by_user_id: 1,
      now: baseTime + 3,
    });

    const highRiskAfterPolicy = await ctx.repos.auditLogs.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      onlyHighRisk: true,
    });
    expect(highRiskAfterPolicy).toHaveLength(2);
    expect(highRiskAfterPolicy[0]?.action).toBe("all_sessions_revoked");
    expect(highRiskAfterPolicy[1]?.action).toBe("product_updated");

    const byAction = await ctx.repos.auditLogs.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      action: "leads_requested",
    });
    expect(byAction).toHaveLength(1);
    expect(byAction[0]?.entity_type).toBe("lead_assignment");

    const byActor = await ctx.repos.auditLogs.listRecent({
      fromInclusive: baseTime - 1000,
      toInclusive: baseTime + 1000,
      limit: 10,
      actorUserId: 5,
    });
    expect(byActor).toHaveLength(2);
  });
});
