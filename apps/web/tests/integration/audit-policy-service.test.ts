import { afterEach, describe, expect, it } from "vitest";

import { createAuditPolicyService } from "../../src/server/audit-reader/policy-service";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("audit policy service", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>> | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("blocks downgrading protected policies", async () => {
    ctx = await createIsolatedTestDb("audit-policy-protected");
    const service = createAuditPolicyService({
      auditActionPolicies: ctx.repos.auditActionPolicies,
    });

    await expect(
      service.upsertPolicy({
        action: "all_sessions_revoked",
        riskLevel: "medium",
        isActive: true,
        actorUserId: 5,
      }),
    ).rejects.toThrow("protected policies cannot be downgraded");
  });

  it("updates non-protected policies", async () => {
    ctx = await createIsolatedTestDb("audit-policy-upsert");
    const service = createAuditPolicyService({
      auditActionPolicies: ctx.repos.auditActionPolicies,
    });

    await service.upsertPolicy({
      action: "leads_requested",
      riskLevel: "medium",
      isActive: true,
      actorUserId: 5,
    });

    const snapshot = await service.getSnapshot();
    const leadsPolicy = snapshot.items.find(
      (item) => item.action === "leads_requested",
    );
    expect(leadsPolicy).toBeDefined();
    expect(leadsPolicy?.riskLevel).toBe("medium");
    expect(leadsPolicy?.isProtected).toBe(false);
  });
});
