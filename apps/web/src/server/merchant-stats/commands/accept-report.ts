import { createIntegrationJobRepo } from "~/server/integrations/infrastructure/integration-job-repo";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  IntegrationJobId,
  MerchantReportId,
  UserId,
} from "~/server/shared/ids";

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
  | { kind: "accepted"; reportId: MerchantReportId; jobId: IntegrationJobId }
  | { kind: "duplicate"; reportId: MerchantReportId };

// Atomically create the report and its job. The report's content hash is the
// duplicate guard, and the queued job is not visible until it has committed.
export async function acceptReport(
  db: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  if (db.isTransaction) return acceptInTransaction(db, input);
  return db.transaction().execute((trx) => acceptInTransaction(trx, input));
}

async function acceptInTransaction(
  trx: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  const existing = await trx
    .selectFrom("merchant_reports")
    .select("id")
    .where("content_sha256", "=", input.contentSha256)
    .executeTakeFirst();

  if (existing) return { kind: "duplicate", reportId: existing.id };

  const jobId = await createIntegrationJobRepo(trx).insert({
    type: "import_gpv",
    status: "PENDING",
    requested_by_user_id: input.uploadedBy,
    file_path: input.storageKey,
    max_attempts: GPV_IMPORT_MAX_ATTEMPTS,
    created_at: input.now,
  });

  const report = await trx
    .insertInto("merchant_reports")
    .values({
      job_id: jobId,
      content_sha256: input.contentSha256,
      cut_at: input.cutAt,
      storage_key: input.storageKey,
      source_filename: input.sourceFilename,
      uploaded_by: input.uploadedBy,
      created_at: input.now,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return { kind: "accepted", reportId: report.id, jobId };
}
