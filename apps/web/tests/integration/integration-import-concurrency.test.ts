import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "../../src/server/integrations/application/import/apply-service";
import { createNeedsExecutiveOutboxQueue } from "../../src/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "../../src/server/integrations/queue/integration-outbox-ready-for-quotation-queue";
import { asLeadId, asUserId, type UserId } from "../../src/server/shared/ids";
import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("integration import pipeline concurrency", () => {
  let runtime: TestRuntime;
  const LEAD_ONE_ID = asLeadId("00000000-0000-0000-0000-000000000901");
  const LEAD_TWO_ID = asLeadId("00000000-0000-0000-0000-000000000902");
  const WORKER_ID = asUserId("00000000-0000-0000-0000-000000000100");
  const ADMIN_ID = asUserId("00000000-0000-0000-0000-000000000005");
  const EXEC_1_ID = asUserId("00000000-0000-0000-0000-000000000001");
  const EXEC_3_ID = asUserId("00000000-0000-0000-0000-000000000003");
  const EXEC_4_ID = asUserId("00000000-0000-0000-0000-000000000004");

  beforeEach(async () => {
    runtime = await createTestRuntime("integration-import-concurrency");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("applies import while export reads run concurrently and dispatches both outboxes", async () => {
    const now = Date.now();

    await runtime.ctx.db
      .insertInto("pipeline_leads")
      .values([
        {
          id: LEAD_ONE_ID,
          ruc: "20900000001",
          razon_social: "Org One",
          address: "Addr 1",
          district: null,
          department: null,
          executive_id: EXEC_1_ID,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "DISPONIBLE",
          prioridad: "P1",
          created_by: ADMIN_ID,
          created_at: now,
          updated_at: now,
        },
        {
          id: LEAD_TWO_ID,
          ruc: "20900000002",
          razon_social: "Org Two",
          address: "Addr 2",
          district: null,
          department: null,
          executive_id: EXEC_3_ID,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "SIN RESULTADO",
          prioridad: "P1",
          created_by: ADMIN_ID,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();

    await runtime.ctx.db
      .insertInto("pipeline_integration_jobs")
      .values({
        id: 5001,
        type: "import_status",
        status: "PROCESSING",
        requested_by_user_id: ADMIN_ID,
        file_path: "inline",
        error_message: null,
        rows_total: null,
        rows_applied: null,
        rows_failed: null,
        results_json: null,
        lease_owner: WORKER_ID,
        lease_until: now + 30_000,
        attempt_count: 1,
        max_attempts: 3,
        available_at: null,
        created_at: now,
        completed_at: null,
      })
      .execute();

    const leadExportQuery = runtime.integrations.leadExportQuery;
    const concurrentExportReads = (async () => {
      for (let i = 0; i < 40; i++) {
        await leadExportQuery.export({});
      }
    })();

    const applyPromise = applyImportRows(
      {
        jobId: 5001,
        actorId: ADMIN_ID,
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
      .selectFrom("pipeline_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();
    const pendingReadyForQuote = await runtime.ctx.db
      .selectFrom("pipeline_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();

    expect(pendingNeedsExec.count).toBe(1);
    expect(pendingReadyForQuote.count).toBe(1);

    const needsExecutiveQueue = createNeedsExecutiveOutboxQueue(WORKER_ID, {
      executor: runtime.integrations.executor,
    });
    const readyForQuotationQueue = createReadyForQuotationOutboxQueue(
      WORKER_ID,
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
        user_id: EXEC_1_ID,
        event_type: "lead.needs_executive_input",
        dedupe_key: `lead_nei_${LEAD_ONE_ID}`,
      },
      {
        user_id: EXEC_4_ID,
        event_type: "lead.ready_for_quotation",
        dedupe_key: `lead_rfq_${LEAD_TWO_ID}`,
      },
    ]);

    const completedNeedsExec = await runtime.ctx.db
      .selectFrom("pipeline_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();
    const completedReadyForQuote = await runtime.ctx.db
      .selectFrom("pipeline_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();

    expect(completedNeedsExec.count).toBe(1);
    expect(completedReadyForQuote.count).toBe(1);
  });
});
