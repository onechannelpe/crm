import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "read-access-back-office",
      organization: { key: "read-access-back-office" },
      stage: "PENDING_EXTERNAL_REVIEW",
    });

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor.by("backOne"),
      leadId: lead.id,
    });

    const value = expectOk(result);
    expect(value.lead.id).toBe(lead.id);
    expect(value.timeline).toEqual([]);
  });

  it.each(["supervisor", "sales_manager"] as const)(
    "lets %s read record detail even when they are not the assigned executive",
    async (role) => {
      const scenario = createWorkflowScenario(runtime);
      const lead = await scenario.lead.assignedTo("execOne", {
        key: `read-access-${role}`,
        organization: { key: `read-access-${role}` },
        stage: "QUOTED",
      });

      const result = await runtime.workflow.queryApi.getLeadDetail({
        actor: scenario.actor.withRole("backOne", role),
        leadId: lead.id,
      });

      const value = expectOk(result);
      expect(value.lead.id).toBe(lead.id);
    },
  );

  it("blocks executives from reading another executive's record detail", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "read-access-exec-blocked",
      organization: { key: "read-access-exec-blocked" },
      stage: "PENDING_EXTERNAL_REVIEW",
    });

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor.by("execTwo"),
      leadId: lead.id,
    });

    const error = expectErr(result);
    expect(error.kind).toBe("forbidden");
  });
});
