import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("integration import workflow concurrency", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("integration-import-concurrency");
    runtime.now.set(2_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("applies import while export reads run concurrently without failures", async () => {
    const scenario = createWorkflowScenario(runtime);
    const leadOne = await scenario.lead.assignedTo("execOne", {
      key: "import-concurrency-one",
      organization: { key: "import-concurrency-one" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "DISPONIBLE",
      prioridad: "P1",
    });
    const leadTwo = await scenario.lead.assignedTo("execTwo", {
      key: "import-concurrency-two",
      organization: { key: "import-concurrency-two" },
      stage: "PENDING_EXTERNAL_REVIEW",
      status: "SIN RESULTADO",
      prioridad: "P1",
    });
    const recordExportQuery = runtime.integrations.recordExportQuery;
    const concurrentExportReads = (async () => {
      for (let i = 0; i < 40; i++) {
        await recordExportQuery.export({
          actorUserId: 5,
          actorRole: "superuser",
          actorBranchId: 1,
        });
      }
    })();

    const applyPromise = scenario.importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, prioridad: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    const [applied] = await Promise.all([applyPromise, concurrentExportReads]);

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const pending = await scenario.outbox.counts("pending");
    expect(pending.needsExecutive).toBe(1);
    expect(pending.readyForQuotation).toBe(1);
  });
});
