import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("integration import workflow concurrency", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("integration-import-concurrency");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(2_000));
  });

  it("applies import while export reads run concurrently without failures", async () => {
    const givenLead = createLeadFixtureWriter(runtime);
    const importer = createWorkflowImporter({
      runtime,
    });
    const leadOne = await givenLead({
      kind: "qualifying",
      key: "import-concurrency-one",
      organization: { key: "import-concurrency-one" },
      status: "DISPONIBLE",
      priority: "P1",
    });
    const leadTwo = await givenLead({
      kind: "qualifying",
      executive: "execTwo",
      key: "import-concurrency-two",
      organization: { key: "import-concurrency-two" },
      status: "SIN RESULTADO",
      priority: "P1",
    });
    const recordExportQuery = runtime.integrations.recordExportQuery;
    const superuser = actorBy("superuser");
    const concurrentExportReads = (async () => {
      for (let i = 0; i < 40; i++) {
        await recordExportQuery.export({
          actorUserId: superuser.userId,
          actorRole: "superuser",
          actorBranchId: superuser.branchId,
        });
      }
    })();

    const applyPromise = importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, priority: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    const [applied] = await Promise.all([applyPromise, concurrentExportReads]);

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const intents = await createNotificationReader(runtime).intents();
    expect(
      intents.filter(({ queue_state }) => queue_state === "pending"),
    ).toHaveLength(2);
  });
});
