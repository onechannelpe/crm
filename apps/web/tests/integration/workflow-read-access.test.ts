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
      .insertInto("workflow_leads")
      .values({
        id: "lead-11",
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        ruc: "20100000011",
        razon_social: "Org Test",
        address: null,
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

  it("blocks executives from reading another executive's record detail", async () => {
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-12",
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        ruc: "20100000012",
        razon_social: "Org Test",
        address: null,
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
