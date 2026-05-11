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
      stage: "QUALIFYING",
      status: "DISPONIBLE",
      prioridad: "P1",
    });
    const leadTwo = await scenario.lead.assignedTo("execTwo", {
      key: "delivery-two",
      organization: { key: "delivery-two" },
      stage: "QUALIFYING",
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
        source_event_id: expect.stringContaining(`${leadOne.id}:stage_changed`),
      },
      {
        user_id: 4,
        event_type: "lead.ready_for_quotation",
        source_event_id: expect.stringContaining(`${leadTwo.id}:stage_changed`),
      },
    ]);

    const completed = await scenario.outbox.counts("done");
    expect(completed.notifications).toBe(2);
  });
});
