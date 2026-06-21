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
    const leadOne = await scenario.seedDirect.leadAt("execOne", {
      key: "planning-one",
      organization: { key: "planning-one" },
      stage: "QUALIFYING",
      status: "DISPONIBLE",
      priority: "P1",
    });
    const leadTwo = await scenario.seedDirect.leadAt("execTwo", {
      key: "planning-two",
      organization: { key: "planning-two" },
      stage: "QUALIFYING",
      status: "SIN RESULTADO",
      priority: "P1",
    });

    const applied = await scenario.importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, priority: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const pending = await scenario.outbox.counts("pending");
    expect(pending.notifications).toBe(2);
  });
});
