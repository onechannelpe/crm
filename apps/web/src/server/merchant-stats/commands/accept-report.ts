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

// Takes a file the boundary has already validated and stored, and books it for
// processing: one report row, one job, atomically.
//
// The report row is created here rather than when the job runs, because
// content_sha256 is UNIQUE and that index is the real duplicate guard -- a file
// that was already accepted cannot be accepted twice, and the second upload
// costs a hash and a select instead of a parse and a queue slot.
//
// Both writes share a transaction so a rejected duplicate cannot leave a job
// behind, and so the queue's NOTIFY is buffered until the report it refers to is
// actually visible.
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
