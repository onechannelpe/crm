import { operationAt } from "@tests/support/operation";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAuditPolicyService } from "~/server/audit-reader/policy-service";

const ACTOR_USER_ID = TEST_FIXTURES.users.superUser.id;

describe("audit policy service", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>>;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("audit-policy-service");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("blocks downgrading protected policies", async () => {
    const service = createAuditPolicyService({
      auditActionPolicies: ctx.repos.auditActionPolicies,
    });

    await expect(
      service.upsertPolicy(
        {
          action: "all_sessions_revoked",
          riskLevel: "medium",
          isActive: true,
          actorUserId: ACTOR_USER_ID,
        },
        operationAt(new Date()),
      ),
    ).rejects.toThrow("protected policies cannot be downgraded");
  });

  it("updates non-protected policies", async () => {
    const service = createAuditPolicyService({
      auditActionPolicies: ctx.repos.auditActionPolicies,
    });

    await service.upsertPolicy(
      {
        action: "leads_requested",
        riskLevel: "medium",
        isActive: true,
        actorUserId: ACTOR_USER_ID,
      },
      operationAt(new Date()),
    );

    const snapshot = await service.getSnapshot();
    const leadsPolicy = snapshot.items.find(
      (item) => item.action === "leads_requested",
    );
    expect(leadsPolicy).toBeDefined();
    expect(leadsPolicy?.riskLevel).toBe("medium");
    expect(leadsPolicy?.isProtected).toBe(false);
  });
});
