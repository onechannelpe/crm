import type { Kysely } from "kysely";

import type {
  Database,
  NewReportExportDownload,
  NewReportExportJob,
} from "~/lib/db/schema";

type ExportJobStatus = NewReportExportJob["status"];

export function createReportExportRepo(db: Kysely<Database>) {
  return {
    async createJob(values: NewReportExportJob): Promise<number> {
      const result = await db
        .insertInto("report_export_jobs")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findJobById(id: number) {
      return db
        .selectFrom("report_export_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    listJobs(limit: number) {
      return db
        .selectFrom("report_export_jobs")
        .innerJoin(
          "users",
          "users.id",
          "report_export_jobs.requested_by_user_id",
        )
        .select([
          "report_export_jobs.id",
          "report_export_jobs.requested_by_user_id",
          "report_export_jobs.format",
          "report_export_jobs.filters_json",
          "report_export_jobs.status",
          "report_export_jobs.rows_count",
          "report_export_jobs.file_storage_key",
          "report_export_jobs.file_sha256",
          "report_export_jobs.error_message",
          "report_export_jobs.requested_at",
          "report_export_jobs.completed_at",
          "report_export_jobs.expires_at",
          "users.full_name as requested_by_name",
        ])
        .orderBy("report_export_jobs.requested_at", "desc")
        .limit(limit)
        .execute();
    },

    listQueuedJobs(limit: number) {
      return db
        .selectFrom("report_export_jobs")
        .selectAll()
        .where("status", "=", "queued")
        .orderBy("requested_at", "asc")
        .limit(limit)
        .execute();
    },

    listJobsByBranch(limit: number, branchId: number) {
      return db
        .selectFrom("report_export_jobs")
        .innerJoin(
          "users",
          "users.id",
          "report_export_jobs.requested_by_user_id",
        )
        .select([
          "report_export_jobs.id",
          "report_export_jobs.requested_by_user_id",
          "report_export_jobs.branch_id",
          "report_export_jobs.format",
          "report_export_jobs.filters_json",
          "report_export_jobs.status",
          "report_export_jobs.rows_count",
          "report_export_jobs.file_storage_key",
          "report_export_jobs.file_sha256",
          "report_export_jobs.error_message",
          "report_export_jobs.requested_at",
          "report_export_jobs.completed_at",
          "report_export_jobs.expires_at",
          "users.full_name as requested_by_name",
        ])
        .where("report_export_jobs.branch_id", "=", branchId)
        .orderBy("report_export_jobs.requested_at", "desc")
        .limit(limit)
        .execute();
    },

    updateJobStatus(
      id: number,
      status: ExportJobStatus,
      now: number,
      errorMessage: string | null = null,
    ) {
      return db
        .updateTable("report_export_jobs")
        .set({ status, completed_at: now, error_message: errorMessage })
        .where("id", "=", id)
        .execute();
    },

    markJobRunning(id: number) {
      return db
        .updateTable("report_export_jobs")
        .set({ status: "running", error_message: null })
        .where("id", "=", id)
        .execute();
    },

    markJobCompleted(
      id: number,
      rowsCount: number,
      fileStorageKey: string,
      fileSha256: string,
      completedAt: number,
      expiresAt: number,
    ) {
      return db
        .updateTable("report_export_jobs")
        .set({
          status: "completed",
          rows_count: rowsCount,
          file_storage_key: fileStorageKey,
          file_sha256: fileSha256,
          error_message: null,
          completed_at: completedAt,
          expires_at: expiresAt,
        })
        .where("id", "=", id)
        .execute();
    },

    markJobFailed(id: number, errorMessage: string, completedAt: number) {
      return db
        .updateTable("report_export_jobs")
        .set({
          status: "failed",
          error_message: errorMessage,
          completed_at: completedAt,
        })
        .where("id", "=", id)
        .execute();
    },

    createDownload(values: NewReportExportDownload) {
      return db
        .insertInto("report_export_downloads")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    listDownloadsByJob(exportJobId: number) {
      return db
        .selectFrom("report_export_downloads")
        .innerJoin(
          "users",
          "users.id",
          "report_export_downloads.downloaded_by_user_id",
        )
        .select([
          "report_export_downloads.id",
          "report_export_downloads.export_job_id",
          "report_export_downloads.downloaded_by_user_id",
          "report_export_downloads.downloaded_at",
          "report_export_downloads.ip_hash",
          "report_export_downloads.user_agent_hash",
          "users.full_name as downloaded_by_name",
        ])
        .where("report_export_downloads.export_job_id", "=", exportJobId)
        .orderBy("report_export_downloads.downloaded_at", "desc")
        .execute();
    },
  };
}
