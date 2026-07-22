import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { createMerchantReportsQueue } from "~/server/merchant-stats/report-import/queue";
import type { MerchantReportImportRow } from "~/server/merchant-stats/report-import/repo";

const NOW = new Date("2026-07-02T00:00:00.000Z");

async function queueUpload(ctx: TestDbContext, contentSha256: string) {
  const accepted = await acceptReport(ctx.db, {
    contentSha256,
    cutAt: new Date("2026-07-01T00:00:00.000Z"),
    storageKey: `imports/${contentSha256}.xlsx`,
    sourceFilename: "gpv.xlsx",
    uploadedBy: TEST_FIXTURES.users.superUser.id,
    now: NOW,
  });

  if (accepted.kind !== "accepted") {
    throw new Error("expected an accepted upload");
  }

  return accepted;
}

function readImport(ctx: TestDbContext, contentSha256: string) {
  return ctx.db
    .selectFrom("merchant_report_imports")
    .innerJoin(
      "merchant_reports",
      "merchant_reports.id",
      "merchant_report_imports.report_id",
    )
    .where("merchant_reports.content_sha256", "=", contentSha256)
    .selectAll("merchant_report_imports")
    .executeTakeFirstOrThrow();
}

describe("merchant reports queue", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("merchant-reports-queue");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("claims a queued import and settles it with the applied counts", async () => {
    const contentSha256 = "1".repeat(64);
    const accepted = await queueUpload(ctx, contentSha256);

    let claimed: MerchantReportImportRow | undefined;

    const queue = createMerchantReportsQueue("worker-test", {
      db: ctx.db,
      now: () => NOW,
      readFile: () => Promise.reject(new Error("unused")),
      runner: {
        process(job) {
          claimed = job;

          return Promise.resolve({
            rowsTotal: 10,
            rowsApplied: 9,
            rowsFailed: 1,
            resultsJson: JSON.stringify({ reportId: accepted.reportId }),
          });
        },
      },
    });

    await queue.drain();

    expect(claimed?.report_id).toBe(accepted.reportId);

    const settled = await readImport(ctx, contentSha256);

    expect(settled.queue_state).toBe("done");
    expect(settled.rows_applied).toBe(9);
    expect(settled.rows_failed).toBe(1);
    expect(settled.completed_at).not.toBeNull();
  });

  it("records the failure reason when the runner throws", async () => {
    const contentSha256 = "2".repeat(64);

    await queueUpload(ctx, contentSha256);

    const queue = createMerchantReportsQueue("worker-test", {
      db: ctx.db,
      now: () => NOW,
      readFile: () => Promise.reject(new Error("unused")),
      runner: {
        process: () => Promise.reject(new Error("Unreadable GPV workbook")),
      },
    });

    await queue.drain();

    const settled = await readImport(ctx, contentSha256);

    expect(settled.error_message).toContain("Unreadable GPV workbook");
    expect(settled.queue_state).toBe("pending");
    expect(settled.attempt_count).toBe(1);
  });
});
