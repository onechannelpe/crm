import { sql, type Kysely } from "kysely";

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
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "requested_by_name",
          ),
        ])
        .orderBy("report_export_jobs.requested_at", "desc")
        .limit(limit)
        .execute();
    },

    async leaseQueuedJobs(limit: number, leaseMs: number, leaseOwner: string) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;
      const candidates = await db
        .selectFrom("report_export_jobs")
        .select(["id"])
        .where((eb) =>
          eb.and([
            eb.or([eb("status", "=", "queued"), eb("status", "=", "running")]),
            eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
          ]),
        )
        .orderBy("requested_at", "asc")
        .limit(limit)
        .execute();

      const leased = await Promise.all(
        candidates.map(async ({ id }) => {
          const updated = await db
            .updateTable("report_export_jobs")
            .set({
              status: "running",
              lease_owner: leaseOwner,
              lease_until: leaseUntil,
              error_message: null,
            })
            .where("id", "=", id)
            .where((eb) =>
              eb.and([
                eb.or([
                  eb("status", "=", "queued"),
                  eb("status", "=", "running"),
                ]),
                eb.or([
                  eb("lease_until", "is", null),
                  eb("lease_until", "<", now),
                ]),
              ]),
            )
            .executeTakeFirst();
          if (Number(updated.numUpdatedRows ?? 0) === 0) return null;
          return db
            .selectFrom("report_export_jobs")
            .selectAll()
            .where("id", "=", id)
            .where("status", "=", "running")
            .where("lease_owner", "=", leaseOwner)
            .executeTakeFirst();
        }),
      );

      return leased.filter(
        (job): job is NonNullable<(typeof leased)[number]> => job !== null,
      );
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
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "requested_by_name",
          ),
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

    markJobCompleted(
      id: number,
      leaseOwner: string,
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
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", leaseOwner)
        .execute();
    },

    async markJobFailed(
      id: number,
      leaseOwner: string,
      errorMessage: string,
      completedAt: number,
    ) {
      const job = await db
        .selectFrom("report_export_jobs")
        .select(["attempt_count", "max_attempts"])
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", leaseOwner)
        .executeTakeFirst();
      if (!job) return "missing" as const;

      const nextAttemptCount = job.attempt_count + 1;
      const exhausted = nextAttemptCount >= job.max_attempts;
      return db
        .updateTable("report_export_jobs")
        .set({
          status: exhausted ? "failed" : "queued",
          attempt_count: nextAttemptCount,
          error_message: errorMessage,
          completed_at: exhausted ? completedAt : null,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", leaseOwner)
        .execute();
    },

    listJobsToExpire(limit: number, now: number) {
      return db
        .selectFrom("report_export_jobs")
        .select(["id", "file_storage_key"])
        .where("status", "=", "completed")
        .where("expires_at", "is not", null)
        .where("expires_at", "<=", now)
        .orderBy("expires_at", "asc")
        .limit(limit)
        .execute();
    },

    markJobExpired(id: number) {
      return db
        .updateTable("report_export_jobs")
        .set({
          status: "expired",
          file_storage_key: null,
          file_sha256: null,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .where("status", "=", "completed")
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
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "downloaded_by_name",
          ),
        ])
        .where("report_export_downloads.export_job_id", "=", exportJobId)
        .orderBy("report_export_downloads.downloaded_at", "desc")
        .execute();
    },
  };
}
