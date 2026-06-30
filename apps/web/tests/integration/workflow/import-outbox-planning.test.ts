import { createLeadFixtureWriter } from "@tests/support/database/workflow-fixtures";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
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

    const outbox = await createNotificationReader(runtime).outbox();
    expect(
      outbox.filter(({ queue_state }) => queue_state === "pending"),
    ).toHaveLength(2);
    expect(
      outbox.map(({ available_at, created_at }) => ({
        available_at,
        created_at,
      })),
    ).toEqual([
      { available_at: 2_000, created_at: 2_000 },
      { available_at: 2_000, created_at: 2_000 },
    ]);
  });
});
