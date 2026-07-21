import type { Selectable } from "kysely";

import { notify } from "~/lib/db/notify";
import type { MerchantReportImportsTable } from "~/lib/db/schema/modules/merchant-stats.types";
import { createJobStore } from "~/lib/job-queue/job-store";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  MerchantReportId,
  MerchantReportImportId,
} from "~/server/shared/ids";

export type MerchantReportImportRow = Selectable<MerchantReportImportsTable>;

const IMPORT_COLUMNS = [
  "id",
  "report_id",
  "queue_state",
  "rows_total",
  "rows_applied",
  "rows_failed",
  "results_json",
  "error_message",
  "claimable_at",
  "lease_owner",
  "attempt_count",
  "max_attempts",
  "created_at",
  "completed_at",
] as const;

export interface NewMerchantReportImport {
  report_id: MerchantReportId;
  max_attempts: number;
  created_at: Date;
}

export function createMerchantReportImportRepo(db: DatabaseExecutor) {
  const store = createJobStore<MerchantReportImportRow, MerchantReportImportId>(
    db,
    "merchant_report_imports",
    IMPORT_COLUMNS,
  );

  return {
    store,

    async insert(
      values: NewMerchantReportImport,
    ): Promise<MerchantReportImportId> {
      const row = await db
        .insertInto("merchant_report_imports")
        .values({ ...values, claimable_at: values.created_at })
        .returning("id")
        .executeTakeFirstOrThrow();

      // Notify on the same executor so transactions defer delivery until commit.
      notify(db, JOB_TABLE_CHANNELS.merchant_report_imports);

      return row.id;
    },

    findById(id: MerchantReportImportId) {
      return db
        .selectFrom("merchant_report_imports")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    updateProgress(
      id: MerchantReportImportId,
      progress: { rowsTotal: number; rowsApplied: number; rowsFailed: number },
    ) {
      return db
        .updateTable("merchant_report_imports")
        .set({
          rows_total: progress.rowsTotal,
          rows_applied: progress.rowsApplied,
          rows_failed: progress.rowsFailed,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}

export type MerchantReportImportRepo = ReturnType<
  typeof createMerchantReportImportRepo
>;
