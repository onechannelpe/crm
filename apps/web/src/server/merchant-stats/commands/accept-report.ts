import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  MerchantReportId,
  MerchantReportImportId,
  UserId,
} from "~/server/shared/ids";

import { createMerchantReportImportRepo } from "../report-import/repo";

const GPV_IMPORT_MAX_ATTEMPTS = 3;

export interface AcceptReportInput {
  contentSha256: string;
  cutAt: Date;
  storageKey: string;
  sourceFilename: string;
  uploadedBy: UserId;
  now: Date;
}

export type AcceptReportResult =
  | {
      kind: "accepted";
      reportId: MerchantReportId;
      importId: MerchantReportImportId;
    }
  | {
      kind: "duplicate";
      reportId: MerchantReportId;
    };

export async function acceptReport(
  db: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  if (db.isTransaction) {
    return acceptInTransaction(db, input);
  }

  return db.transaction().execute((trx) => acceptInTransaction(trx, input));
}

// Queue an import only after claiming the content hash.
async function acceptInTransaction(
  trx: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  const report = await trx
    .insertInto("merchant_reports")
    .values({
      content_sha256: input.contentSha256,
      cut_at: input.cutAt,
      storage_key: input.storageKey,
      source_filename: input.sourceFilename,
      uploaded_by: input.uploadedBy,
      created_at: input.now,
    })
    .onConflict((oc) => oc.column("content_sha256").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (!report) {
    const winner = await trx
      .selectFrom("merchant_reports")
      .select("id")
      .where("content_sha256", "=", input.contentSha256)
      .executeTakeFirstOrThrow();

    return {
      kind: "duplicate",
      reportId: winner.id,
    };
  }

  const importId = await createMerchantReportImportRepo(trx).insert({
    report_id: report.id,
    max_attempts: GPV_IMPORT_MAX_ATTEMPTS,
    created_at: input.now,
  });

  return {
    kind: "accepted",
    reportId: report.id,
    importId,
  };
}
