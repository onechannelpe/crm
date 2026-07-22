import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { enqueueAttributionForLead } from "~/server/merchant-stats/attribution/invalidate";
import { createMerchantAttributionQueue } from "~/server/merchant-stats/attribution/queue";
import { recomputeAttribution } from "~/server/merchant-stats/attribution/recompute";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { batchByRuc } from "~/server/merchant-stats/facts/batch-by-ruc";
import { writeFactsBatch } from "~/server/merchant-stats/facts/write-batch";
import type { SourceRow } from "~/server/merchant-stats/intake/types";
import type { MerchantReportId } from "~/server/shared/ids";

const NOW = new Date("2026-07-02T00:00:00.000Z");
const CUT_AT = new Date("2026-07-01T00:00:00.000Z");
const LEAD_CREATED_AT = new Date("2026-03-01T00:00:00.000Z");

const LIMA = TEST_FIXTURES.organizations.lima;
const NORTE = TEST_FIXTURES.organizations.norte;
const EXEC = TEST_FIXTURES.users.execOne;

function sourceRow(
  overrides: Partial<SourceRow> & { rowNumber: number },
): SourceRow {
  return {
    ruc: LIMA.ruc,
    merchantId: `M${overrides.rowNumber}`,
    serialNumber: null,
    product: "POS",
    soldAt: "2026-02-01",
    saleMonth: "2026-02-01",
    tradeName: null,
    legalName: null,
    culqiUserCode: null,
    culqiUserName: null,
    mesa: null,
    channel: null,
    subchannel: null,
    offerAmount: null,
    promotion: null,
    clientType: null,
    stockType: null,
    trialAt: null,
    activatedAt: null,
    lastTransactionAt: null,
    m0Plus15dGpv: null,
    m0Plus15dTrx: null,
    gpv: [{ offset: 0, gpv: 100, trx: 1 }],
    raw: {},
    ...overrides,
  };
}

// The combined sales predate and postdate the lead. Splitting them changes
// the attribution verdict, so they must remain in the same RUC batch.
function straddlingRucRows(): SourceRow[] {
  return [
    sourceRow({ rowNumber: 1, soldAt: "2026-02-01" }),
    sourceRow({ rowNumber: 2, soldAt: "2026-04-10" }),
  ];
}

async function seedLead(ctx: TestDbContext) {
  const lead = await ctx.db
    .insertInto("workflow_leads")
    .values({
      organization_id: LIMA.id,
      executive_id: EXEC.id,
      stage: "SETUP",
      status: null,
      priority: null,
      created_by: EXEC.id,
      updated_by: null,
      created_at: LEAD_CREATED_AT,
      updated_at: LEAD_CREATED_AT,
      deleted_at: null,
      reservation_expires_at: null,
      current_provider: "NINGUNO",
      current_debit_rate: 0,
      current_credit_rate: 0,
      gpv: 0,
      ticket: 0,
      settlement_bank: "BCP",
      pos_count: 1,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return lead.id;
}

async function newReport(
  ctx: TestDbContext,
  sha: string,
): Promise<MerchantReportId> {
  const accepted = await acceptReport(ctx.db, {
    contentSha256: sha,
    cutAt: CUT_AT,
    storageKey: `imports/${sha}.xlsx`,
    sourceFilename: "gpv.xlsx",
    uploadedBy: TEST_FIXTURES.users.superUser.id,
    now: NOW,
  });

  if (accepted.kind !== "accepted") {
    throw new Error("expected an accepted upload");
  }

  return accepted.reportId;
}

async function applyInBatches(
  ctx: TestDbContext,
  reportId: MerchantReportId,
  rows: readonly SourceRow[],
  targetSize: number,
): Promise<void> {
  for (const batch of batchByRuc(rows, targetSize)) {
    // eslint-disable-next-line no-await-in-loop
    await ctx.db.transaction().execute(async (trx) => {
      const written = await writeFactsBatch(trx, {
        reportId,
        cutAt: CUT_AT,
        rows: batch,
        now: NOW,
      });

      await recomputeAttribution(trx, written.touched, NOW);
    });
  }
}

function readCredit(ctx: TestDbContext) {
  return ctx.db
    .selectFrom("merchant_month_credit")
    .select(["ruc", "month", "seller_user_id", "method", "confidence"])
    .orderBy("ruc")
    .orderBy("month")
    .execute();
}

describe("attribution batching", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("attribution_batching");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
    await seedLead(ctx);
  });

  it("keeps a RUC whole no matter how small the batch target is", () => {
    const rows = [
      ...straddlingRucRows(),
      sourceRow({ rowNumber: 3, ruc: NORTE.ruc, merchantId: "M3" }),
    ];

    const batches = batchByRuc(rows, 1);

    expect(batches).toHaveLength(2);
    expect(batches[0].map((row) => row.rowNumber)).toEqual([1, 2]);
    expect(batches[1].map((row) => row.rowNumber)).toEqual([3]);
  });

  it("withholds credit when a contributing sale predates the lead that would claim it", async () => {
    const reportId = await newReport(ctx, "a".repeat(64));

    await applyInBatches(ctx, reportId, straddlingRucRows(), 2000);

    expect(await readCredit(ctx)).toEqual([
      {
        ruc: LIMA.ruc,
        month: "2026-02-01",
        seller_user_id: null,
        method: "none",
        confidence: "late",
      },
    ]);
  });

  it("derives the same credit whether the report lands in one batch or many", async () => {
    const rows = [
      ...straddlingRucRows(),
      sourceRow({ rowNumber: 3, ruc: NORTE.ruc, merchantId: "M3" }),
      sourceRow({ rowNumber: 4, ruc: NORTE.ruc, merchantId: "M4" }),
    ];

    await applyInBatches(ctx, await newReport(ctx, "b".repeat(64)), rows, 2000);

    const single = await readCredit(ctx);

    await resetTestDb(ctx);
    await seedLead(ctx);

    await applyInBatches(ctx, await newReport(ctx, "c".repeat(64)), rows, 1);

    expect(await readCredit(ctx)).toEqual(single);
  });

  it("re-derives through the queue when a lead appears after the report", async () => {
    const reportId = await newReport(ctx, "f".repeat(64));

    await ctx.db.deleteFrom("workflow_leads").execute();

    await applyInBatches(
      ctx,
      reportId,
      [sourceRow({ rowNumber: 1, soldAt: "2026-04-10" })],
      2000,
    );

    expect((await readCredit(ctx))[0]).toMatchObject({
      seller_user_id: null,
      confidence: "none",
    });

    const leadId = await seedLead(ctx);

    await enqueueAttributionForLead(ctx.db, leadId, NOW);

    const queued = await ctx.db
      .selectFrom("merchant_attribution_jobs")
      .select(["ruc", "month", "queue_state"])
      .execute();

    expect(queued).toEqual([
      {
        ruc: LIMA.ruc,
        month: "2026-02-01",
        queue_state: "pending",
      },
    ]);

    await createMerchantAttributionQueue("worker-test", {
      db: ctx.db,
      now: () => NOW,
    }).drain();

    expect((await readCredit(ctx))[0]).toMatchObject({
      seller_user_id: EXEC.id,
      method: "ruc_lead",
      confidence: "inferred",
    });
  });

  it("keeps a manual resolution across a later recompute", async () => {
    const reportId = await newReport(ctx, "e".repeat(64));

    await applyInBatches(ctx, reportId, straddlingRucRows(), 2000);

    await ctx.db
      .insertInto("merchant_month_attribution_override")
      .values({
        ruc: LIMA.ruc,
        month: "2026-02-01",
        seller_user_id: EXEC.id,
        branch_id: EXEC.branchId,
        resolved_by: TEST_FIXTURES.users.superUser.id,
        resolved_at: NOW,
      })
      .execute();

    await recomputeAttribution(
      ctx.db,
      [{ ruc: LIMA.ruc, month: "2026-02-01" }],
      NOW,
    );

    expect((await readCredit(ctx))[0]).toMatchObject({
      seller_user_id: EXEC.id,
      method: "manual",
      confidence: "exact",
    });
  });
});
