import { cleanupTestDb, createIsolatedTestDb } from "@tests/support/runtime/db";
import { afterEach, describe, expect, it } from "vitest";

import { createAuditPolicyService } from "~/server/audit-reader/policy-service";
import { asUserId } from "~/server/shared/ids";

const ACTOR_USER_ID = asUserId("audit-policy-actor");

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
        actorUserId: ACTOR_USER_ID,
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
      actorUserId: ACTOR_USER_ID,
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
