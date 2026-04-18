import { sql, type Insertable, type Kysely, type Selectable } from "kysely";

import type {
  Database,
  ReportExportJobsTable,
  ReportExportDownloadsTable,
} from "~/lib/db/types";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

type NewReportExportJobRow = Insertable<Database["report_export_jobs"]>;
type NewReportExportDownloadRow = Insertable<
  Database["report_export_downloads"]
>;

type ExportJobStatus = NewReportExportJobRow["status"];

type ReportExportJobRow = Omit<
  Selectable<ReportExportJobsTable>,
  "requested_by_user_id" | "branch_id"
> & {
  requested_by_user_id: UserId;
  branch_id: BranchId;
};

type ReportExportListRow = ReportExportJobRow & {
  requested_by_name: string;
};

type ReportExportDownloadRow = Omit<
  Selectable<ReportExportDownloadsTable>,
  "downloaded_by_user_id"
> & {
  downloaded_by_user_id: UserId;
  downloaded_by_name: string;
};

export function createReportExportRepo(db: Kysely<Database>) {
  return {
    async createJob(values: NewReportExportJobRow): Promise<number> {
      const result = await db
        .insertInto("report_export_jobs")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findJobById(id: number): Promise<ReportExportJobRow | undefined> {
      return db
        .selectFrom("report_export_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst() as Promise<ReportExportJobRow | undefined>;
    },

    listJobs(
      limit: number,
      scope?: { branchId?: BranchId },
    ): Promise<ReportExportListRow[]> {
      let qb = db
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
        .limit(limit);
      if (scope?.branchId !== undefined) {
        qb = qb.where("report_export_jobs.branch_id", "=", scope.branchId);
      }
      return qb.execute() as Promise<ReportExportListRow[]>;
    },

    async leaseQueuedJobs(limit: number, leaseMs: number, leaseOwner: string) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;
      const candidates = await db
        .selectFrom("report_export_jobs")
        .select(["id"])
        .where((eb) =>
          eb.and([
            eb("status", "=", "queued"),
            eb.or([
              eb("available_at", "is", null),
              eb("available_at", "<=", now),
            ]),
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
              attempt_count: sql<number>`attempt_count + 1`,
            })
            .where("id", "=", id)
            .where((eb) =>
              eb.and([
                eb("status", "=", "queued"),
                eb.or([
                  eb("available_at", "is", null),
                  eb("available_at", "<=", now),
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
      ) as unknown as Promise<ReportExportJobRow[]>;
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

    async extendLease(
      id: number,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
      const now = Date.now();
      const result = await db
        .updateTable("report_export_jobs")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "running")
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    scheduleRetry(id: number, availableAt: number) {
      return db
        .updateTable("report_export_jobs")
        .set({
          status: "queued",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
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

    markJobFailed(
      id: number,
      leaseOwner: string,
      errorMessage: string,
      completedAt: number,
    ) {
      return db
        .updateTable("report_export_jobs")
        .set({
          status: "failed",
          error_message: errorMessage,
          completed_at: completedAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
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

    createDownload(values: NewReportExportDownloadRow) {
      return db
        .insertInto("report_export_downloads")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    listDownloadsByJob(
      exportJobId: number,
    ): Promise<ReportExportDownloadRow[]> {
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
        .execute() as Promise<ReportExportDownloadRow[]>;
    },
  };
}
