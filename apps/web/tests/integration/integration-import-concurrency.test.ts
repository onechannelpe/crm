import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "../../src/server/integrations/application/import/apply-service";
import { createNeedsExecutiveOutboxQueue } from "../../src/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "../../src/server/integrations/queue/integration-outbox-ready-for-quotation-queue";
import { createLeadExportQuery } from "../../src/server/pipeline/infrastructure/lead-export-query";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("integration import pipeline concurrency", () => {
  let ctx: TestDbContext | null = null;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("integration-import-concurrency");
  });

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
    }
  });

  it("applies import while export reads run concurrently and dispatches both outboxes", async () => {
    if (!ctx) {
      throw new Error("Missing test DB context");
    }
    const now = Date.now();

    await ctx.db
      .insertInto("pipeline_leads")
      .values([
        {
          id: 901,
          ruc: "20900000001",
          razon_social: "Org One",
          address: "Addr 1",
          executive_id: 1,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "DISPONIBLE",
          prioridad: "P1",
          engine_company_name: null,
          engine_address: null,
          engine_fetched_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 902,
          ruc: "20900000002",
          razon_social: "Org Two",
          address: "Addr 2",
          executive_id: 3,
          stage: "PENDING_EXTERNAL_REVIEW",
          status: "SIN RESULTADO",
          prioridad: "P1",
          engine_company_name: null,
          engine_address: null,
          engine_fetched_at: null,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();

    await ctx.db
      .insertInto("pipeline_integration_jobs")
      .values({
        id: 5001,
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

    const leadExportQuery = createLeadExportQuery(ctx.db);
    const concurrentExportReads = (async () => {
      for (let i = 0; i < 40; i++) {
        await leadExportQuery.list({});
      }
    })();

    const applyPromise = applyImportRows(
      {
        jobId: 5001,
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
      ctx.db,
    );

    const [applied] = await Promise.all([applyPromise, concurrentExportReads]);

    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const pendingNeedsExec = await ctx.db
      .selectFrom("pipeline_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();
    const pendingReadyForQuote = await ctx.db
      .selectFrom("pipeline_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "pending")
      .executeTakeFirstOrThrow();

    expect(pendingNeedsExec.count).toBe(1);
    expect(pendingReadyForQuote.count).toBe(1);

    const needsExecutiveQueue = createNeedsExecutiveOutboxQueue("test-worker", {
      executor: ctx.db,
    });
    const readyForQuotationQueue = createReadyForQuotationOutboxQueue(
      "test-worker",
      { executor: ctx.db },
    );

    await needsExecutiveQueue.runOnce();
    await readyForQuotationQueue.runOnce();
    await needsExecutiveQueue.runOnce();
    await readyForQuotationQueue.runOnce();

    const notifications = await ctx.db
      .selectFrom("app_notifications")
      .select(["user_id", "event_type", "dedupe_key"])
      .orderBy("id", "asc")
      .execute();

    expect(notifications).toEqual([
      {
        user_id: 1,
        event_type: "lead.needs_executive_input",
        dedupe_key: "lead_nei_901",
      },
      {
        user_id: 4,
        event_type: "lead.ready_for_quotation",
        dedupe_key: "lead_rfq_902",
      },
    ]);

    const completedNeedsExec = await ctx.db
      .selectFrom("pipeline_integration_outbox_needs_executive_input")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();
    const completedReadyForQuote = await ctx.db
      .selectFrom("pipeline_integration_outbox_ready_for_quotation")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("status", "=", "completed")
      .executeTakeFirstOrThrow();

    expect(completedNeedsExec.count).toBe(1);
    expect(completedReadyForQuote.count).toBe(1);
  });
});
