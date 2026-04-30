import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("workflow read access", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-read-access");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("lets review users read record detail even when they are not the assigned executive", async () => {
    await runtime.ctx.db
      .insertInto("organizations")
      .values({
        id: 11,
        ruc: "20100000011",
        name: "Org Test",
        created_at: 10,
      })
      .execute();
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-11",
        organization_id: 11,
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 2, role: "back_office", branchId: 1 },
      leadId: "lead-11",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lead.id).toBe("lead-11");
    expect(result.value.timeline).toEqual([]);
  });

  it.each(["supervisor", "sales_manager"] as const)(
    "lets %s read record detail even when they are not the assigned executive",
    async (role) => {
      const organizationId = role === "supervisor" ? 13 : 14;
      await runtime.ctx.db
        .insertInto("organizations")
        .values({
          id: organizationId,
          ruc: role === "supervisor" ? "20100000013" : "20100000014",
          name: "Org Test",
          created_at: 10,
        })
        .execute();

      await runtime.ctx.db
        .insertInto("workflow_leads")
        .values({
          id: `lead-${role}`,
          organization_id: organizationId,
          executive_id: 1,
          stage: "QUOTED",
          status: null,
          prioridad: null,
          created_by: 1,
          created_at: 10,
          updated_at: 10,
        })
        .execute();

      const result = await runtime.workflow.queryApi.getLeadDetail({
        actor: { userId: 2, role, branchId: 1 },
        leadId: `lead-${role}`,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.lead.id).toBe(`lead-${role}`);
    },
  );

  it("blocks executives from reading another executive's record detail", async () => {
    await runtime.ctx.db
      .insertInto("organizations")
      .values({
        id: 12,
        ruc: "20100000012",
        name: "Org Test",
        created_at: 10,
      })
      .execute();
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-12",
        organization_id: 12,
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 3, role: "executive", branchId: 1 },
      leadId: "lead-12",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
