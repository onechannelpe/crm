import { createLeadFixtureWriter } from "@tests/support/database/workflow-fixtures";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("import outbox planning", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("import-outbox-planning");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(2_000));
  });

  it("plans unified notification outbox entries for matching import mutations", async () => {
    const givenLead = createLeadFixtureWriter(runtime);
    const importer = createWorkflowImporter({
      runtime,
      nextJobKey: (key) => key ?? "planning",
    }).importer;
    const leadOne = await givenLead({
      kind: "qualifying",
      key: "planning-one",
      organization: { key: "planning-one" },
      status: "DISPONIBLE",
      priority: "P1",
    });
    const leadTwo = await givenLead({
      kind: "qualifying",
      executive: "execTwo",
      key: "planning-two",
      organization: { key: "planning-two" },
      status: "SIN RESULTADO",
      priority: "P1",
    });

    const applied = await importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, priority: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const intents = await createNotificationReader(runtime).intents();
    expect(
      intents.filter(({ queue_state }) => queue_state === "pending"),
    ).toHaveLength(2);
    expect(
      intents.map(({ available_at, created_at }) => ({
        available_at,
        created_at,
      })),
    ).toEqual([
      { available_at: new Date(2_000), created_at: new Date(2_000) },
      { available_at: new Date(2_000), created_at: new Date(2_000) },
    ]);
  });
});
