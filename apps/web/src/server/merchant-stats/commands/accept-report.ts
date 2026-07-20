import { sql } from "kysely";

import { createIntegrationJobRepo } from "~/server/integrations/infrastructure/integration-job-repo";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  IntegrationJobId,
  MerchantReportId,
  UserId,
} from "~/server/shared/ids";

const GPV_IMPORT_MAX_ATTEMPTS = 3;
const CLAIM_SAVEPOINT = sql.id("accept_report_claim");

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

export async function acceptReport(
  db: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  if (db.isTransaction) {
    return acceptInTransaction(db, input);
  }

  return db.transaction().execute((trx) => acceptInTransaction(trx, input));
}

async function acceptInTransaction(
  trx: DatabaseExecutor,
  input: AcceptReportInput,
): Promise<AcceptReportResult> {
  // Roll back the job and its queued notification when another upload wins.
  // Kysely only exposes savepoints through ControlledTransaction.
  await sql`savepoint ${CLAIM_SAVEPOINT}`.execute(trx);

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
    .onConflict((oc) => oc.column("content_sha256").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (report) {
    await sql`release savepoint ${CLAIM_SAVEPOINT}`.execute(trx);

    return { kind: "accepted", reportId: report.id, jobId };
  }

  await sql`rollback to savepoint ${CLAIM_SAVEPOINT}`.execute(trx);

  const winner = await trx
    .selectFrom("merchant_reports")
    .select("id")
    .where("content_sha256", "=", input.contentSha256)
    .executeTakeFirstOrThrow();

  return { kind: "duplicate", reportId: winner.id };
}
