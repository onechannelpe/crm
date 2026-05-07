import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("import outbox planning", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("import-outbox-planning");
    runtime.now.set(2_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("plans unified notification outbox entries for matching import mutations", async () => {
    const scenario = createWorkflowScenario(runtime);
    const leadOne = await scenario.lead.assignedTo("execOne", {
      key: "planning-one",
      organization: { key: "planning-one" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "DISPONIBLE",
      prioridad: "P1",
    });
    const leadTwo = await scenario.lead.assignedTo("execTwo", {
      key: "planning-two",
      organization: { key: "planning-two" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "SIN RESULTADO",
      prioridad: "P1",
    });

    const applied = await scenario.importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, prioridad: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const pending = await scenario.outbox.counts("pending");
    expect(pending.notifications).toBe(2);
  });
});
