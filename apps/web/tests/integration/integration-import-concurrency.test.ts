import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("integration import workflow concurrency", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("integration-import-concurrency");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("applies import while export reads run concurrently and dispatches both outboxes", async () => {
    const now = Date.now();
    await runtime.ctx.db
      .insertInto("organizations")
      .values([
        { id: 901, ruc: "20900000001", name: "Org One", created_at: now },
        { id: 902, ruc: "20900000002", name: "Org Two", created_at: now },
      ])
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values([
        {
          id: "lead-901",
          organization_id: 901,
          executive_id: 1,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "DISPONIBLE",
          prioridad: "P1",
          created_by: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: "lead-902",
          organization_id: 902,
          executive_id: 3,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "SIN RESULTADO",
          prioridad: "P1",
          created_by: 1,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_integration_jobs")
      .values({
        id: "job-5001",
        type: "import_status",
        status: "PROCESSING",
        requested_by_user_id: 5,
        file_path: "inline",
        error_message: null,
        rows_total: null,
        rows_applied: null,
        rows_failed: null,
        results_json: null,
        lease_owner: "test-worker",
        lease_until: now + 30_000,
        attempt_count: 1,
        max_attempts: 3,
        available_at: null,
        created_at: now,
        completed_at: null,
      })
      .execute();

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

    const applyPromise = applyImportRows(
      {
        jobId: "job-5001",
        actorId: 5,
        validRows: [
          {
            row: 1,
            ruc: "20900000001",
            type: "import_prioridad",
            prioridad: "SIN RESULTADO",
          },
          {
            row: 2,
            ruc: "20900000002",
            type: "import_status",
            status: "DISPONIBLE",
          },
        ],
        invalidRows: [],
      },
      runtime.integrations.executor,
    );

    const [applied] = await Promise.all([applyPromise, concurrentExportReads]);

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const pendingNeedsExec = await runtime.ctx.db
      .selectFrom("workflow_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();
    const pendingReadyForQuote = await runtime.ctx.db
      .selectFrom("workflow_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();

    expect(pendingNeedsExec.count).toBe(1);
    expect(pendingReadyForQuote.count).toBe(1);

    const needsExecutiveQueue = createNeedsExecutiveOutboxQueue("test-worker", {
      executor: runtime.integrations.executor,
    });
    const readyForQuotationQueue = createReadyForQuotationOutboxQueue(
      "test-worker",
      { executor: runtime.integrations.executor },
    );

    await needsExecutiveQueue.runOnce();
    await readyForQuotationQueue.runOnce();
    await needsExecutiveQueue.runOnce();
    await readyForQuotationQueue.runOnce();

    const notifications = await runtime.ctx.db
      .selectFrom("app_notifications")
      .select(["user_id", "event_type", "dedupe_key"])
      .orderBy("id", "asc")
      .execute();

    expect(notifications).toEqual([
      {
        user_id: 1,
        event_type: "lead.needs_executive_input",
        dedupe_key: "lead_nei_lead-901",
      },
      {
        user_id: 4,
        event_type: "lead.ready_for_quotation",
        dedupe_key: "lead_rfq_lead-902",
      },
    ]);

    const completedNeedsExec = await runtime.ctx.db
      .selectFrom("workflow_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();
    const completedReadyForQuote = await runtime.ctx.db
      .selectFrom("workflow_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();

    expect(completedNeedsExec.count).toBe(1);
    expect(completedReadyForQuote.count).toBe(1);
  });
});
