import { afterEach, describe, expect, it } from "vitest";

import { asUserId } from "../../src/server/shared/ids";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

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

    await ctx.repos.auditLogs.create({
      user_id: asUserId("5"),
      action: "sales_record_confirmed",
      entity_type: "sales_record",
      entity_id: "101",
      changes: '{"from":"pending_confirmation","to":"confirmed"}',
      created_at: baseTime,
    });
    await ctx.repos.auditLogs.create({
      user_id: asUserId("1"),
      action: "leads_requested",
      entity_type: "lead_assignment",
      entity_id: "1",
      changes: '{"requested":4,"assigned":4}',
      created_at: baseTime + 1,
    });
    await ctx.repos.auditLogs.create({
      user_id: asUserId("5"),
      action: "all_sessions_revoked",
      entity_type: "user_session",
      entity_id: "5",
      changes: '{"reason":"security"}',
      created_at: baseTime + 2,
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
    expect(highRiskDefault[2]?.action).toBe("sales_record_confirmed");

    await ctx.repos.auditActionPolicies.upsert({
      action: "leads_requested",
      risk_level: "low",
      is_active: 1,
      is_protected: 0,
      updated_by_user_id: asUserId("1"),
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
    expect(highRiskAfterPolicy[1]?.action).toBe("sales_record_confirmed");

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
      actorUserId: asUserId("5"),
    });
    expect(byActor).toHaveLength(2);
  });
});
