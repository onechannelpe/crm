import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";

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
    const lead = await scenario.givenLead({
      key: "read-access-back-office",
      organization: {
        key: "read-access-back-office",
        ruc: "20100000011",
        name: "Org Test",
      },
      executive: "execOne",
      stage: "PENDING_EXTERNAL_REVIEW",
    });

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor("backOne"),
      leadId: lead.leadId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lead.id).toBe(lead.leadId);
    expect(result.value.timeline).toEqual([]);
  });

  it.each(["supervisor", "sales_manager"] as const)(
    "lets %s read record detail even when they are not the assigned executive",
    async (role) => {
      const scenario = createWorkflowScenario(runtime);
      const lead = await scenario.givenLead({
        key: `read-access-${role}`,
        organization: {
          key: `read-access-${role}`,
          ruc: role === "supervisor" ? "20100000013" : "20100000014",
          name: "Org Test",
        },
        executive: "execOne",
        stage: "QUOTED",
      });

      const result = await runtime.workflow.queryApi.getLeadDetail({
        actor: { ...scenario.actor("backOne"), role },
        leadId: lead.leadId,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.lead.id).toBe(lead.leadId);
    },
  );

  it("blocks executives from reading another executive's record detail", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.givenLead({
      key: "read-access-exec-blocked",
      organization: {
        key: "read-access-exec-blocked",
        ruc: "20100000012",
        name: "Org Test",
      },
      executive: "execOne",
      stage: "PENDING_EXTERNAL_REVIEW",
    });

    const result = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor("execTwo"),
      leadId: lead.leadId,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
