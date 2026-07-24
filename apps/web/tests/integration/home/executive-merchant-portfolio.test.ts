import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  parseCalendarDate,
  parseCalendarMonth,
} from "~/lib/time/calendar-date";
import { recomputeAttribution } from "~/server/merchant-stats/attribution/recompute";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { writeFactsBatch } from "~/server/merchant-stats/facts/write-batch";
import type { SourceRow } from "~/server/merchant-stats/intake/types";
import { getExecutiveMerchantPortfolio } from "~/server/merchant-stats/read/executive-portfolio";
import type {
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/server/shared/ids";

const NOW = new Date("2026-07-03T06:00:00.000Z");
const CUT_AT = new Date("2026-07-03T05:58:00.000Z");

function date(value: string) {
  const parsed = parseCalendarDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

function month(value: string) {
  const parsed = parseCalendarMonth(value);
  if (!parsed) throw new Error(`Invalid test month: ${value}`);
  return parsed;
}

async function seedLead(
  ctx: TestDbContext,
  organizationId: OrganizationId,
  executiveId: UserId,
): Promise<WorkflowLeadId> {
  const lead = await ctx.db
    .insertInto("workflow_leads")
    .values({
      organization_id: organizationId,
      executive_id: executiveId,
      stage: "SETUP",
      status: null,
      priority: null,
      created_by: executiveId,
      updated_by: null,
      created_at: new Date("2026-01-01T12:00:00.000Z"),
      updated_at: new Date("2026-01-01T12:00:00.000Z"),
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

function sourceRow(input: {
  rowNumber: number;
  ruc: string;
  merchantId: string;
  tradeName: string;
  lastTransactionAt: string | null;
  gpv: number;
}): SourceRow {
  return {
    rowNumber: input.rowNumber,
    ruc: input.ruc,
    merchantId: input.merchantId,
    serialNumber: null,
    product: "CULQIFULL",
    soldAt: date("2026-06-10"),
    saleMonth: month("2026-06"),
    tradeName: input.tradeName,
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
    activatedAt: date("2026-06-12"),
    lastTransactionAt: input.lastTransactionAt
      ? date(input.lastTransactionAt)
      : null,
    m0Plus15dGpv: null,
    m0Plus15dTrx: null,
    gpv: [{ offset: 1, gpv: input.gpv, trx: 4 }],
    raw: {},
  };
}

describe("executive merchant portfolio", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("executive_merchant_portfolio");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("returns only the authenticated executive's merchants for the latest cut", async () => {
    const limaLeadId = await seedLead(
      ctx,
      TEST_FIXTURES.organizations.lima.id,
      TEST_FIXTURES.users.execOne.id,
    );
    await seedLead(
      ctx,
      TEST_FIXTURES.organizations.norte.id,
      TEST_FIXTURES.users.execTwo.id,
    );
    const accepted = await acceptReport(ctx.db, {
      contentSha256: "h".repeat(64),
      cutAt: CUT_AT,
      storageKey: "imports/home-gpv.xlsx",
      sourceFilename: "home-gpv.xlsx",
      uploadedBy: TEST_FIXTURES.users.superUser.id,
      now: NOW,
    });

    if (accepted.kind !== "accepted") {
      throw new Error("expected an accepted report");
    }

    const written = await writeFactsBatch(ctx.db, {
      reportId: accepted.reportId,
      cutAt: CUT_AT,
      rows: [
        sourceRow({
          rowNumber: 1,
          ruc: TEST_FIXTURES.organizations.lima.ruc,
          merchantId: "merchant-lima",
          tradeName: "Comercio Lima",
          lastTransactionAt: "2026-07-02",
          gpv: 8_400,
        }),
        sourceRow({
          rowNumber: 2,
          ruc: TEST_FIXTURES.organizations.norte.ruc,
          merchantId: "merchant-norte",
          tradeName: "Comercio Norte",
          lastTransactionAt: null,
          gpv: 12_000,
        }),
      ],
      now: NOW,
    });
    await recomputeAttribution(ctx.db, written.touched, NOW);
    await ctx.db
      .insertInto("merchant_targets")
      .values({
        ruc: TEST_FIXTURES.organizations.lima.ruc,
        effective_from: date("2026-07-01"),
        projected_gpv: 10_000,
        set_by: TEST_FIXTURES.users.superUser.id,
        set_at: NOW,
      })
      .execute();
    await ctx.db
      .updateTable("merchant_report_imports")
      .set({ queue_state: "done", completed_at: NOW })
      .where("id", "=", accepted.importId)
      .execute();

    const portfolio = await getExecutiveMerchantPortfolio(
      ctx.db,
      TEST_FIXTURES.users.execOne.id,
    );

    expect(portfolio).toEqual({
      cutDate: date("2026-07-03"),
      month: month("2026-07"),
      totalGpv: 8_400,
      merchants: [
        {
          ruc: TEST_FIXTURES.organizations.lima.ruc,
          name: "Comercio Lima",
          gpv: 8_400,
          projectedGpv: 10_000,
          lastTransactionAt: date("2026-07-02"),
          leadId: limaLeadId,
        },
      ],
    });
  });
});
