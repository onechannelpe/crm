import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("outbox delivery", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("outbox-delivery");
    runtime.now.set(2_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("drains pending outbox events and persists notifications", async () => {
    const scenario = createWorkflowScenario(runtime);
    const leadOne = await scenario.lead.assignedTo("execOne", {
      key: "delivery-one",
      organization: { key: "delivery-one" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "DISPONIBLE",
      prioridad: "P1",
    });
    const leadTwo = await scenario.lead.assignedTo("execTwo", {
      key: "delivery-two",
      organization: { key: "delivery-two" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "SIN RESULTADO",
      prioridad: "P1",
    });

    await scenario.importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, prioridad: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    await scenario.outbox.drainAll();

    const notifications = await scenario.notifications.list();
    expect(notifications).toEqual([
      {
        user_id: 1,
        event_type: "lead.needs_executive_input",
        dedupe_key: `lead_nei_${leadOne.id}`,
      },
      {
        user_id: 4,
        event_type: "lead.ready_for_quotation",
        dedupe_key: `lead_rfq_${leadTwo.id}`,
      },
    ]);

    const completed = await scenario.outbox.counts("completed");
    expect(completed.needsExecutive).toBe(1);
    expect(completed.readyForQuotation).toBe(1);
  });
});
