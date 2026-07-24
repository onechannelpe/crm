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
import { getCohortRows } from "~/server/merchant-stats/read/cohort";

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

function sourceRow(): SourceRow {
  return {
    rowNumber: 1,
    ruc: TEST_FIXTURES.organizations.lima.ruc,
    merchantId: "merchant-1",
    serialNumber: "serial-1",
    product: "CULQIFULL",
    soldAt: date("2026-05-10"),
    saleMonth: month("2026-05"),
    tradeName: "Comercio de prueba",
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
    gpv: [
      { offset: 0, gpv: 0, trx: 0 },
      { offset: 2, gpv: 500, trx: 4 },
    ],
    raw: {},
  };
}

describe("cohort rows", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("cohort_read");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("distinguishes an absent offset from a realized zero", async () => {
    const accepted = await acceptReport(ctx.db, {
      contentSha256: "a".repeat(64),
      cutAt: CUT_AT,
      storageKey: "imports/gpv.xlsx",
      sourceFilename: "gpv.xlsx",
      uploadedBy: TEST_FIXTURES.users.superUser.id,
      now: NOW,
    });

    if (accepted.kind !== "accepted") {
      throw new Error("expected an accepted report");
    }

    const written = await writeFactsBatch(ctx.db, {
      reportId: accepted.reportId,
      cutAt: CUT_AT,
      rows: [sourceRow()],
      now: NOW,
    });
    await recomputeAttribution(ctx.db, written.touched, NOW);

    const rows = await getCohortRows(ctx.db, {}, { limit: 10, offset: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0].merchantId).toBe("merchant-1");
    expect(rows[0].months).toEqual([
      { offset: 0, gpv: 0, trx: 0 },
      { offset: 2, gpv: 500, trx: 4 },
    ]);
  });
});
