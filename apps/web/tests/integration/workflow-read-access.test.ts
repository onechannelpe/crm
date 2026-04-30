import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";
import { seedLead, seedOrganization } from "../support/workflow-fixtures";

describe("workflow read access", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-read-access");
    runtime.now.set(10);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("lets review users read record detail even when they are not the assigned executive", async () => {
    const org = await seedOrganization(runtime, {
      key: "read-access-back-office",
      ruc: "20100000011",
      name: "Org Test",
    });
    await seedLead(runtime, {
      id: "lead-11",
      organization: org,
      executiveId: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
    });

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
      const org = await seedOrganization(runtime, {
        key: `read-access-${role}`,
        ruc: role === "supervisor" ? "20100000013" : "20100000014",
        name: "Org Test",
      });
      await seedLead(runtime, {
        id: `lead-${role}`,
        organization: org,
        executiveId: 1,
        stage: "QUOTED",
        status: null,
        prioridad: null,
      });

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
    const org = await seedOrganization(runtime, {
      key: "read-access-exec-blocked",
      ruc: "20100000012",
      name: "Org Test",
    });
    await seedLead(runtime, {
      id: "lead-12",
      organization: org,
      executiveId: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
    });

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 3, role: "executive", branchId: 1 },
      leadId: "lead-12",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
